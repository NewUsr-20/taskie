const fs = require("fs");
const path = require("path");

// Ensure notes directory exists
const notesDir = path.join(process.cwd(), 'src/features/notes');
if (!fs.existsSync(notesDir)) { fs.mkdirSync(notesDir, { recursive: true }); }

// 1. UPDATE DATABASE (v5 - Add Notes Table & List Types)
const dbCode = `import Dexie, { type EntityTable } from 'dexie';

export interface Subtask { id: string; title: string; isCompleted: boolean; }
export interface Task {
  id: string; title: string; description?: string; isCompleted: boolean;
  priority: number; createdAt: Date; dueDate?: Date; listId?: string;
  tags?: string[]; subtasks?: Subtask[]; isAllDay?: boolean;
}
// NEW: List now has a 'type'
export interface List { id: string; name: string; type: 'task' | 'note'; }
export interface Tag { id: string; name: string; }
export interface SavedFilter { id: string; name: string; status: string; priority: string; listId: string; tag: string; }
// NEW: Notes table
export interface Note { id: string; title: string; content: string; listId: string; updatedAt: Date; }

const db = new Dexie('TickTickCloneDB_v5') as Dexie & {
  tasks: EntityTable<Task, 'id'>; lists: EntityTable<List, 'id'>;
  tags: EntityTable<Tag, 'id'>; filters: EntityTable<SavedFilter, 'id'>;
  notes: EntityTable<Note, 'id'>;
};

db.version(1).stores({ 
  tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags', 
  lists: 'id, name, type', 
  tags: 'id, name', 
  filters: 'id, name',
  notes: 'id, listId, updatedAt'
});

export { db };`;

// 2. UPDATE STORE (Add Note Actions)
const storeCode = `import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database';
import type { Task, SavedFilter, Note } from '../../db/database';

interface TaskState {
  addTask: (title: string, dueDate?: Date, listId?: string, tags?: string[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addList: (name: string, type?: 'task'|'note') => Promise<void>; 
  deleteList: (id: string) => Promise<void>;
  addTag: (name: string) => Promise<void>; deleteTag: (id: string, name: string) => Promise<void>;
  assignTagToTask: (taskId: string, tagName: string) => Promise<void>;
  saveFilter: (filter: Omit<SavedFilter, 'id'>) => Promise<void>; deleteSavedFilter: (id: string) => Promise<void>;
  // Note actions
  addNote: (title: string, listId: string) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>(() => ({
  addTask: async (title, dueDate, listId, tags = []) => {
    try {
      for (const tag of tags) {
        const exists = await db.tags.where('name').equals(tag).first();
        if (!exists) await db.tags.add({ id: uuidv4(), name: tag });
      }
      await db.tasks.add({ id: uuidv4(), title, isCompleted: false, priority: 0, createdAt: new Date(), dueDate: dueDate ? new Date(dueDate) : undefined, listId, tags, subtasks: [] });
    } catch (error) { console.error(error); }
  },
  updateTask: async (id, updates) => { await db.tasks.update(id, updates).catch(console.error); },
  toggleTask: async (id, currentStatus) => { await db.tasks.update(id, { isCompleted: !currentStatus }).catch(console.error); },
  deleteTask: async (id) => { await db.tasks.delete(id).catch(console.error); },
  addList: async (name, type = 'task') => { await db.lists.add({ id: uuidv4(), name, type }).catch(console.error); },
  deleteList: async (id) => { await db.tasks.where('listId').equals(id).modify({ listId: undefined }); await db.notes.where('listId').equals(id).delete(); await db.lists.delete(id); },
  addTag: async (name) => { const exists = await db.tags.where('name').equals(name).first(); if (!exists) await db.tags.add({ id: uuidv4(), name }); },
  deleteTag: async (id, name) => { const tasks = await db.tasks.where('tags').equals(name).toArray(); for (const t of tasks) await db.tasks.update(t.id, { tags: t.tags?.filter(tag => tag !== name) || [] }); await db.tags.delete(id); },
  assignTagToTask: async (taskId, tagName) => {
    const task = await db.tasks.get(taskId); if (!task) return;
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) {
      await db.tasks.update(taskId, { tags: [...currentTags, tagName] });
      const exists = await db.tags.where('name').equals(tagName).first();
      if (!exists) await db.tags.add({ id: uuidv4(), name: tagName });
    }
  },
  saveFilter: async (filter) => { await db.filters.add({ id: uuidv4(), ...filter }).catch(console.error); },
  deleteSavedFilter: async (id) => { await db.filters.delete(id).catch(console.error); },
  
  // Notes
  addNote: async (title, listId) => { await db.notes.add({ id: uuidv4(), title, content: '', listId, updatedAt: new Date() }).catch(console.error); },
  updateNote: async (id, updates) => { await db.notes.update(id, { ...updates, updatedAt: new Date() }).catch(console.error); },
  deleteNote: async (id) => { await db.notes.delete(id).catch(console.error); }
}));`;

// 3. NEW COMPONENT: NOTES VIEW
const notesViewCode = `import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useTaskStore } from '../tasks/taskStore';
import { Plus, Trash2, FileText, Clock } from 'lucide-react';

export default function NotesView({ listId, listName }) {
  const notes = useLiveQuery(() => db.notes.where('listId').equals(listId).reverse().sortBy('updatedAt'), [listId]);
  const { addNote, updateNote, deleteNote } = useTaskStore();
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const activeNote = notes?.find(n => n.id === activeNoteId);

  const handleAdd = (e) => {
    e.preventDefault();
    if(newNoteTitle.trim()) { addNote(newNoteTitle.trim(), listId); setNewNoteTitle(''); }
  };

  return (
    <div className="flex h-[80vh] max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* LEFT PANE: Note Directory */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500"/> {listName}</h2>
        </div>
        <form onSubmit={handleAdd} className="p-3 border-b border-gray-100 flex gap-2">
          <input type="text" value={newNoteTitle} onChange={e=>setNewNoteTitle(e.target.value)} placeholder="New note title..." className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-md outline-none focus:border-indigo-400 transition-colors"/>
          <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-3 rounded-md"><Plus className="w-4 h-4"/></button>
        </form>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes?.map(note => (
            <div key={note.id} onClick={()=>setActiveNoteId(note.id)} className={\`group flex flex-col justify-center p-3 rounded-lg cursor-pointer transition-colors \${activeNoteId === note.id ? 'bg-indigo-100 text-indigo-900 shadow-sm' : 'hover:bg-gray-100'}\`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold truncate">{note.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); if(activeNoteId===note.id) setActiveNoteId(null); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {new Date(note.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
          {notes?.length === 0 && <div className="text-center text-xs text-gray-400 mt-10">No notes in this folder yet.</div>}
        </div>
      </div>
      
      {/* RIGHT PANE: Note Editor */}
      <div className="w-2/3 flex flex-col bg-white relative">
        {activeNote ? (
          <>
            <div className="px-8 py-6 border-b border-gray-100">
               <input 
                 type="text" 
                 value={activeNote.title} 
                 onChange={(e) => updateNote(activeNote.id, { title: e.target.value })} 
                 className="text-2xl font-bold text-gray-800 w-full outline-none bg-transparent"
               />
            </div>
            <textarea 
              className="flex-1 px-8 py-6 outline-none resize-none text-gray-700 leading-relaxed bg-transparent" 
              placeholder="Start writing..."
              value={activeNote.content || ''}
              onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="font-medium">Select a note to start writing</p>
          </div>
        )}
      </div>
    </div>
  );
}`;

// 4. UPDATE SIDEBAR (Add Folder Type Selector)
const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter, SlidersHorizontal, LayoutGrid, FileText, FolderPlus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable } from '@dnd-kit/core';
import { db } from '../db/database';
import { useTaskStore } from '../features/tasks/taskStore';

function DroppableSidebarItem({ id, type, name, activeId, onClick, children, onDelete }) {
  const { isOver, setNodeRef } = useDroppable({ id, data: { type, name } });
  return (
    <div ref={setNodeRef} className={\`group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer \${activeId === (type === 'tag' ? name : id) ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100'} \${isOver ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-105 z-10' : ''}\`}>
      <button onClick={onClick} className="flex items-center gap-3 flex-1 truncate text-left font-medium">{children}</button>
      {onDelete && !isOver && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>}
    </div>
  );
}

export default function Sidebar({ activeView, setActiveView, activeListId, setActiveListId, activeTagName, setActiveTagName, activeFilterId, setActiveFilterId }) {
  const customLists = useLiveQuery(() => db.lists.toArray());
  const allTags = useLiveQuery(() => db.tags.toArray());
  const savedFilters = useLiveQuery(() => db.filters.toArray());
  const { addList, deleteList, addTag, deleteTag, deleteSavedFilter } = useTaskStore();

  const [isAddingList, setIsAddingList] = useState(false); 
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState('task'); // NEW: Select note or task list
  
  const [isAddingTag, setIsAddingTag] = useState(false); 
  const [newTagName, setNewTagName] = useState('');

  const handleAddList = (e) => { 
    e.preventDefault(); 
    if (newListName.trim()) addList(newListName.trim(), newListType); 
    setNewListName(''); setIsAddingList(false); setNewListType('task');
  };
  const handleAddTag = (e) => { e.preventDefault(); if (newTagName.trim()) addTag(newTagName.trim().replace('#', '')); setNewTagName(''); setIsAddingTag(false); };

  const nav = (view, listId=null, tagName=null, filterId=null) => {
    setActiveView(view); setActiveListId(listId); setActiveTagName(tagName); setActiveFilterId(filterId);
  };

  return (
    <aside className="w-64 bg-[#f8f9fb] border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all shadow-inner">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-sm">T</div>
        <span className="ml-3 font-bold text-gray-800 tracking-tight text-lg">TickTick</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        
        <div className="space-y-1">
          <button onClick={() => nav('list')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'list' && !activeListId ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Inbox className="w-5 h-5 text-blue-500" /><span className="text-sm">All Tasks</span></button>
          <button onClick={() => nav('today')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'today' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sun className="w-5 h-5 text-orange-500" /><span className="text-sm">Today</span></button>
          <button onClick={() => nav('tomorrow')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'tomorrow' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sunrise className="w-5 h-5 text-amber-500" /><span className="text-sm">Tomorrow</span></button>
          <button onClick={() => nav('next7')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'next7' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><CalendarRange className="w-5 h-5 text-indigo-500" /><span className="text-sm">Next 7 Days</span></button>
          <div className="my-2 border-t border-gray-200"></div>
          <button onClick={() => nav('calendar')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'calendar' ? 'bg-purple-100 text-purple-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Calendar className="w-5 h-5 text-purple-500" /><span className="text-sm">Calendar</span></button>
          <button onClick={() => nav('matrix')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'matrix' ? 'bg-rose-100 text-rose-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><LayoutGrid className="w-5 h-5 text-rose-500" /><span className="text-sm">Eisenhower Matrix</span></button>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Folders<button onClick={() => setIsAddingList(true)} className="hover:text-blue-500 p-1"><FolderPlus className="w-4 h-4" /></button></div>
          {isAddingList && (
            <form onSubmit={handleAddList} className="px-3 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Folder name..." className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded outline-none mb-2" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewListType('task')} className={\`flex-1 text-xs py-1 rounded \${newListType === 'task' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}\`}>Tasks</button>
                <button type="button" onClick={() => setNewListType('note')} className={\`flex-1 text-xs py-1 rounded \${newListType === 'note' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}\`}>Notes</button>
              </div>
              <div className="flex justify-end mt-2"><button type="submit" className="text-xs font-bold text-blue-600">Save</button></div>
            </form>
          )}
          <div className="space-y-1">
            {customLists?.map(list => (
              <DroppableSidebarItem key={list.id} id={\`list-\${list.id}\`} type="list" activeId={activeListId} onClick={() => nav('list', list.id)} onDelete={() => deleteList(list.id)}>
                {list.type === 'note' ? <FileText className={\`w-4 h-4 \${activeListId === list.id ? 'text-indigo-600' : 'text-gray-400'}\`}/> : <ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} />}
                <span className="text-sm">{list.name}</span>
              </DroppableSidebarItem>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}`;

// 5. UPDATE APP (Render NotesView if list is a 'note' type)
const appCode = `import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DndContext, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import TaskList from './features/tasks/TaskList';
import CalendarView from './features/calendar/CalendarView';
import EisenhowerMatrix from './features/matrix/EisenhowerMatrix';
import NotesView from './features/notes/NotesView';
import Sidebar from './components/Sidebar';
import TaskDetails from './features/tasks/TaskDetails';
import { useTaskStore } from './features/tasks/taskStore';
import { db } from './db/database';

export default function App() {
  const [activeView, setActiveView] = useState('list');
  const [activeListId, setActiveListId] = useState(null);
  const [activeTagName, setActiveTagName] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const { updateTask, assignTagToTask } = useTaskStore();
  
  // Determine if the currently selected list is a 'note' folder
  const activeList = useLiveQuery(() => activeListId ? db.lists.get(activeListId) : Promise.resolve(null), [activeListId]);

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event; if (!over) return;
    const taskId = active.id; const targetType = over.data.current?.type;
    if (targetType === 'list') { updateTask(taskId, { listId: String(over.id).replace('list-', '') }); } 
    else if (targetType === 'tag') { assignTagToTask(taskId, over.data.current.name); }
    else if (targetType === 'matrix') { updateTask(taskId, { priority: Number(String(over.id).replace('matrix-', '')) }); }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-[#f3f4f6] font-sans relative">
        <Sidebar 
          activeView={activeView} setActiveView={setActiveView}
          activeListId={activeListId} setActiveListId={setActiveListId}
          activeTagName={activeTagName} setActiveTagName={setActiveTagName}
          activeFilterId={activeFilterId} setActiveFilterId={setActiveFilterId}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeView === 'calendar' ? <CalendarView /> : 
           activeView === 'matrix' ? <EisenhowerMatrix activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} /> :
           (activeView === 'list' && activeList?.type === 'note') ? <NotesView listId={activeList.id} listName={activeList.name} /> :
           <TaskList activeView={activeView} activeListId={activeListId} activeTagName={activeTagName} activeFilterId={activeFilterId} activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} setActiveView={setActiveView} />
          }
        </main>
        {activeTaskId && activeList?.type !== 'note' && <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
      </div>
    </DndContext>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/db/database.ts'), dbCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/taskStore.ts'), storeCode);
fs.writeFileSync(path.join(notesDir, 'NotesView.tsx'), notesViewCode);
fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);
fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appCode);

console.log("✅ Workspace Unified! Database bumped to v5 to support distinct Note Folders.");
