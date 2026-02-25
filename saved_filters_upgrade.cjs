const fs = require("fs");
const path = require("path");

// 1. UPDATE DATABASE SCHEMA
const dbCode = `import Dexie, { type EntityTable } from 'dexie';

export interface Subtask { id: string; title: string; isCompleted: boolean; }
export interface Task {
  id: string; title: string; description?: string; isCompleted: boolean;
  priority: number; createdAt: Date; dueDate?: Date; listId?: string;
  tags?: string[]; subtasks?: Subtask[];
}
export interface List { id: string; name: string; }
export interface Tag { id: string; name: string; }
export interface SavedFilter {
  id: string; name: string; status: string; priority: string; listId: string; tag: string;
}

const db = new Dexie('TickTickCloneDB_v2') as Dexie & {
  tasks: EntityTable<Task, 'id'>; lists: EntityTable<List, 'id'>;
  tags: EntityTable<Tag, 'id'>; filters: EntityTable<SavedFilter, 'id'>;
};

db.version(1).stores({ tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags', lists: 'id, name', tags: 'id, name' });
db.version(2).stores({ tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags', lists: 'id, name', tags: 'id, name', filters: 'id, name' });

export { db };`;

// 2. UPDATE TASK STORE
const storeCode = `import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database';
import type { Task, SavedFilter } from '../../db/database';

interface TaskState {
  addTask: (title: string, dueDate?: Date, listId?: string, tags?: string[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addList: (name: string) => Promise<void>; deleteList: (id: string) => Promise<void>;
  addTag: (name: string) => Promise<void>; deleteTag: (id: string, name: string) => Promise<void>;
  assignTagToTask: (taskId: string, tagName: string) => Promise<void>;
  saveFilter: (filter: Omit<SavedFilter, 'id'>) => Promise<void>;
  deleteSavedFilter: (id: string) => Promise<void>;
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
  addList: async (name) => { await db.lists.add({ id: uuidv4(), name }).catch(console.error); },
  deleteList: async (id) => { await db.tasks.where('listId').equals(id).modify({ listId: undefined }); await db.lists.delete(id); },
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
  deleteSavedFilter: async (id) => { await db.filters.delete(id).catch(console.error); }
}));`;

// 3. UPDATE APP COMPONENT
const appCode = `import { useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import TaskList from './features/tasks/TaskList';
import CalendarView from './features/calendar/CalendarView';
import Sidebar from './components/Sidebar';
import TaskDetails from './features/tasks/TaskDetails';
import { useTaskStore } from './features/tasks/taskStore';

export default function App() {
  const [activeView, setActiveView] = useState('list');
  const [activeListId, setActiveListId] = useState(null);
  const [activeTagName, setActiveTagName] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const { updateTask, assignTagToTask } = useTaskStore();

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event; if (!over) return;
    const taskId = active.id; const targetType = over.data.current?.type;
    if (targetType === 'list') { updateTask(taskId, { listId: String(over.id).replace('list-', '') }); } 
    else if (targetType === 'tag') { assignTagToTask(taskId, over.data.current.name); }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-white font-sans relative">
        <Sidebar 
          activeView={activeView} setActiveView={setActiveView}
          activeListId={activeListId} setActiveListId={setActiveListId}
          activeTagName={activeTagName} setActiveTagName={setActiveTagName}
          activeFilterId={activeFilterId} setActiveFilterId={setActiveFilterId}
          isOpen={false} setIsOpen={() => {}}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
          {activeView === 'calendar' ? <CalendarView /> : (
            <TaskList activeView={activeView} activeListId={activeListId} activeTagName={activeTagName} activeFilterId={activeFilterId} activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} setActiveView={setActiveView} />
          )}
        </main>
        {activeTaskId && <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
      </div>
    </DndContext>
  );
}`;

// 4. UPDATE SIDEBAR
const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter, SlidersHorizontal } from 'lucide-react';
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

  const [isAddingList, setIsAddingList] = useState(false); const [newListName, setNewListName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false); const [newTagName, setNewTagName] = useState('');

  const handleAddList = (e) => { e.preventDefault(); if (newListName.trim()) addList(newListName.trim()); setNewListName(''); setIsAddingList(false); };
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <div className="space-y-1">
          <button onClick={() => nav('list')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'list' && !activeListId ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Inbox className="w-5 h-5 text-blue-500" /><span className="text-sm">Inbox</span></button>
          <button onClick={() => nav('today')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'today' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sun className="w-5 h-5 text-orange-500" /><span className="text-sm">Today</span></button>
          <button onClick={() => nav('tomorrow')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'tomorrow' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sunrise className="w-5 h-5 text-amber-500" /><span className="text-sm">Tomorrow</span></button>
          <button onClick={() => nav('next7')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'next7' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><CalendarRange className="w-5 h-5 text-indigo-500" /><span className="text-sm">Next 7 Days</span></button>
        </div>

        <div className="pt-2 border-t border-gray-200">
           <button onClick={() => nav('create-filter')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'create-filter' ? 'bg-teal-100 text-teal-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Filter className="w-5 h-5 text-teal-500" /><span className="text-sm">Create Filter</span></button>
           
           {savedFilters?.length > 0 && (
             <div className="mt-3 space-y-1">
               <div className="px-3 mb-1 text-[10px] font-bold text-teal-600 uppercase tracking-[0.1em]">Saved Filters</div>
               {savedFilters.map(sf => (
                  <div key={sf.id} onClick={() => nav('saved-filter', null, null, sf.id)} className={\`group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer \${activeFilterId === sf.id ? 'bg-teal-100 text-teal-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}\`}>
                    <div className="flex items-center gap-3 flex-1 truncate"><SlidersHorizontal className="w-4 h-4 text-teal-500" /><span className="text-sm">{sf.name}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); deleteSavedFilter(sf.id); if(activeFilterId===sf.id) nav('list'); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
               ))}
             </div>
           )}
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Lists<button onClick={() => setIsAddingList(true)} className="hover:text-blue-500 p-1"><Plus className="w-3.5 h-3.5" /></button></div>
          {isAddingList && <form onSubmit={handleAddList} className="px-3 mb-2"><input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} onBlur={() => setIsAddingList(false)} placeholder="List name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" /></form>}
          <div className="space-y-1">
            {customLists?.map(list => <DroppableSidebarItem key={list.id} id={\`list-\${list.id}\`} type="list" activeId={activeListId} onClick={() => nav('list', list.id)} onDelete={() => deleteList(list.id)}><ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} /><span className="text-sm">{list.name}</span></DroppableSidebarItem>)}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Tags<button onClick={() => setIsAddingTag(true)} className="hover:text-blue-500 p-1"><Plus className="w-3.5 h-3.5" /></button></div>
          {isAddingTag && <form onSubmit={handleAddTag} className="px-3 mb-2"><input autoFocus type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="Tag name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" /></form>}
          <div className="space-y-1">
            {allTags?.map(tag => <DroppableSidebarItem key={tag.id} id={\`tag-\${tag.name}\`} type="tag" name={tag.name} activeId={activeTagName} onClick={() => nav('tag', null, tag.name)} onDelete={() => deleteTag(tag.id, tag.name)}><Hash className={\`w-4 h-4 \${activeTagName === tag.name ? 'text-blue-600' : 'text-blue-400'}\`} /><span className="text-sm">{tag.name}</span></DroppableSidebarItem>)}
          </div>
        </div>
      </div>
    </aside>
  );
}`;

// 5. UPDATE TASK LIST (Applying the filters + Displaying badges)
const taskListCode = `import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, Flag, Hash, Sparkles, GripVertical, ArrowDownUp, Filter, Save, Check } from 'lucide-react';
import * as chrono from 'chrono-node';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../../db/database';
import { useTaskStore } from './taskStore';

function DraggableTask({ task, activeTaskId, onSelectTask, toggleTask, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  const style = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.8 : 1, touchAction: 'none' };
  return (
    <div ref={setNodeRef} style={style} onClick={() => onSelectTask(task.id)} className={\`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer \${activeTaskId === task.id ? 'border-blue-200 bg-blue-50/50 shadow-sm' : 'border-transparent hover:border-gray-100 hover:bg-gray-50'} \${task.isCompleted ? 'opacity-50' : ''}\`}>
      <div className="flex items-center gap-3 w-full">
        <div {...listeners} {...attributes} className="cursor-grab hover:bg-gray-200 p-1 rounded text-gray-400"><GripVertical className="w-4 h-4" /></div>
        <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.isCompleted); }}>{task.isCompleted ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5 text-gray-400" />}</button>
        <div className="flex flex-col flex-1">
          <span className={\`text-gray-800 font-medium \${task.isCompleted ? 'line-through text-gray-500' : ''}\`}>{task.title}</span>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
            {task.dueDate && <span className="text-blue-500 flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString()}</span>}
            {task.priority > 0 && <span className="text-orange-500 font-bold flex items-center gap-1"><Flag className="w-3 h-3 fill-current" />P{task.priority}</span>}
            {task.tags?.map(tag => <span key={tag} className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>)}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-gray-400 hover:text-red-500 transition-opacity p-2"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function TaskList({ activeView, activeListId, activeTagName, activeFilterId, activeTaskId, onSelectTask, setActiveView }) {
  const [newTaskTitle, setNewTaskTitle] = useState(''); const [dueDate, setDueDate] = useState('');
  const [detectedDate, setDetectedDate] = useState(null); const [detectedTags, setDetectedTags] = useState([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  
  // Create Filter State
  const [filterStatus, setFilterStatus] = useState('active'); const [filterPriority, setFilterPriority] = useState('all');
  const [filterList, setFilterList] = useState('all'); const [filterTag, setFilterTag] = useState('all');
  const [saveFilterName, setSaveFilterName] = useState('');

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const customLists = useLiveQuery(() => db.lists.toArray(), []) || [];
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  
  // Pull current saved filter if viewing one
  const activeSavedFilter = useLiveQuery(() => activeFilterId ? db.filters.get(activeFilterId) : null, [activeFilterId]);
  
  const { addTask, toggleTask, deleteTask, saveFilter } = useTaskStore();

  const displayTasks = useMemo(() => {
    let filtered = [...allTasks]; const now = new Date();
    
    const applyCriteria = (status, priority, lId, tag) => {
      if (status === 'active') filtered = filtered.filter(t => !t.isCompleted);
      if (status === 'completed') filtered = filtered.filter(t => t.isCompleted);
      if (priority !== 'all') filtered = filtered.filter(t => t.priority === Number(priority));
      if (lId !== 'all') filtered = filtered.filter(t => t.listId === lId);
      if (tag !== 'all') filtered = filtered.filter(t => t.tags?.includes(tag));
    };

    if (activeView === 'create-filter') { applyCriteria(filterStatus, filterPriority, filterList, filterTag); }
    else if (activeView === 'saved-filter' && activeSavedFilter) { applyCriteria(activeSavedFilter.status, activeSavedFilter.priority, activeSavedFilter.listId, activeSavedFilter.tag); } 
    else if (activeView === 'today') { filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString()); } 
    else if (activeView === 'tomorrow') { const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1); filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === tmrw.toDateString()); } 
    else if (activeView === 'next7') { const next7 = new Date(); next7.setDate(next7.getDate() + 7); filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= next7); } 
    else if (activeTagName) { filtered = filtered.filter(t => t.tags?.includes(activeTagName)); } 
    else if (activeListId) { filtered = filtered.filter(t => t.listId === activeListId); } 
    else if (activeView === 'list') { filtered = filtered.filter(t => !t.listId); }

    return filtered.sort((a, b) => (sortByPriority && b.priority !== a.priority) ? b.priority - a.priority : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allTasks, activeView, activeTagName, activeListId, activeSavedFilter, sortByPriority, filterStatus, filterPriority, filterList, filterTag]);
  
  const handleAdd = (e) => {
    e.preventDefault(); if (!newTaskTitle.trim()) return;
    let title = newTaskTitle; let date = dueDate ? new Date(dueDate) : undefined;
    if (!date && !detectedDate) {
      if (activeView === 'today') date = new Date();
      if (activeView === 'tomorrow') { date = new Date(); date.setDate(date.getDate() + 1); }
    }
    if (detectedDate) { title = title.replace(detectedDate.text, '').trim(); date = detectedDate.date; }
    detectedTags.forEach(tag => { title = title.replace(\`#\${tag}\`, '').trim(); });
    
    addTask(title, date, activeListId || undefined, detectedTags);
    setNewTaskTitle(''); setDueDate(''); setDetectedDate(null); setDetectedTags([]);
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) return alert('Please enter a name for the filter.');
    await saveFilter({ name: saveFilterName, status: filterStatus, priority: filterPriority, listId: filterList, tag: filterTag });
    setSaveFilterName('');
    setActiveView('list'); // Redirect to inbox after save to see it pop up in sidebar
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {activeView === 'create-filter' && <Filter className="w-6 h-6 text-teal-500" />}
          {activeView === 'saved-filter' && activeSavedFilter ? activeSavedFilter.name : (activeView === 'create-filter' ? 'Create Filter' : (activeTagName ? \`#\${activeTagName}\` : activeListId ? 'Custom List' : activeView === 'today' ? 'Today' : activeView === 'tomorrow' ? 'Tomorrow' : activeView === 'next7' ? 'Next 7 Days' : 'Inbox'))}
        </h2>
        <button onClick={() => setSortByPriority(!sortByPriority)} className={\`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${sortByPriority ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}>
          <ArrowDownUp className="w-4 h-4" />{sortByPriority ? 'Sorted by Priority' : 'Sort by Priority'}
        </button>
      </div>

      {/* DEFINING OPTIONS BADGES: Display active rules for a Saved Filter */}
      {activeView === 'saved-filter' && activeSavedFilter && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">Status: {activeSavedFilter.status}</span>
          {activeSavedFilter.priority !== 'all' && <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">Priority: P{activeSavedFilter.priority}</span>}
          {activeSavedFilter.listId !== 'all' && <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">List: {customLists.find(l=>l.id===activeSavedFilter.listId)?.name || 'Unknown'}</span>}
          {activeSavedFilter.tag !== 'all' && <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">Tag: #{activeSavedFilter.tag}</span>}
        </div>
      )}

      {/* CREATOR PANEL: Create a new filter */}
      {activeView === 'create-filter' && (
        <div className="mb-8 p-5 bg-teal-50/50 rounded-lg border border-teal-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex flex-col"><label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase">Status</label><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="text-sm border border-teal-200 rounded p-2"><option value="all">All</option><option value="active">Active Only</option><option value="completed">Completed</option></select></div>
            <div className="flex flex-col"><label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase">Priority</label><select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} className="text-sm border border-teal-200 rounded p-2"><option value="all">Any</option><option value="3">High (P3)</option><option value="2">Medium (P2)</option><option value="1">Low (P1)</option><option value="0">None</option></select></div>
            <div className="flex flex-col"><label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase">List</label><select value={filterList} onChange={e=>setFilterList(e.target.value)} className="text-sm border border-teal-200 rounded p-2"><option value="all">Any List</option>{customLists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
            <div className="flex flex-col"><label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase">Tag</label><select value={filterTag} onChange={e=>setFilterTag(e.target.value)} className="text-sm border border-teal-200 rounded p-2"><option value="all">Any Tag</option>{allTags.map(t=><option key={t.id} value={t.name}>#{t.name}</option>)}</select></div>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t border-teal-100">
            <input type="text" value={saveFilterName} onChange={e=>setSaveFilterName(e.target.value)} placeholder="Name this filter (e.g. 'Urgent Backend')..." className="flex-1 px-3 py-2 border border-teal-300 rounded outline-none focus:ring-2 focus:ring-teal-500" />
            <button onClick={handleSaveFilter} className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded flex items-center gap-2"><Save className="w-4 h-4" /> Save Filter</button>
          </div>
        </div>
      )}

      {/* Standard Input Form */}
      {activeView !== 'create-filter' && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-8 bg-gray-50 p-2 rounded-lg border border-gray-200 relative">
          <div className="flex gap-2">
            <input type="text" value={newTaskTitle} onChange={handleTextChange} placeholder="Add task... use #tags or dates" className="flex-1 px-4 py-2 bg-transparent outline-none" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent text-sm outline-none" />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium">Add</button>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium px-2">
            {detectedDate && <span className="text-blue-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {detectedDate.date.toLocaleDateString()}</span>}
            {detectedTags.length > 0 && <span className="text-green-600 flex items-center gap-1"><Hash className="w-3 h-3" /> Auto-tagging: {detectedTags.join(', ')}</span>}
          </div>
        </form>
      )}
      
      <div className="space-y-1.5">
        {displayTasks?.map(task => <DraggableTask key={task.id} task={task} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} deleteTask={deleteTask} />)}
        {displayTasks?.length === 0 && <div className="text-center text-gray-400 py-10">No tasks found.</div>}
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/db/database.ts'), dbCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/taskStore.ts'), storeCode);
fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appCode);
fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/TaskList.tsx'), taskListCode);

console.log("✅ Saved Filters Engine installed! You can now create and save robust custom filters.");
