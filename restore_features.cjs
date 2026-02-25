const fs = require("fs");
const path = require("path");

const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus } from 'lucide-react';
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

export default function Sidebar({ activeView, setActiveView, activeListId, setActiveListId, activeTagName, setActiveTagName, isOpen, setIsOpen }) {
  const customLists = useLiveQuery(() => db.lists.toArray());
  const allTags = useLiveQuery(() => db.tags.toArray());
  const { addList, deleteList, addTag, deleteTag } = useTaskStore();

  // Local state for UI inputs
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleAddList = (e) => {
    e.preventDefault();
    if (newListName.trim()) addList(newListName.trim());
    setNewListName(''); setIsAddingList(false);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTagName.trim()) addTag(newTagName.trim().replace('#', ''));
    setNewTagName(''); setIsAddingTag(false);
  };

  return (
    <aside className="w-64 bg-[#f8f9fb] border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all shadow-inner">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-sm">T</div>
        <span className="ml-3 font-bold text-gray-800 tracking-tight text-lg">TickTick</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        
        <div className="space-y-1">
          <button onClick={() => { setActiveView('list'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'list' && !activeListId ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Inbox className="w-5 h-5 text-blue-500" /><span className="text-sm">Inbox</span></button>
          <button onClick={() => { setActiveView('today'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'today' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sun className="w-5 h-5 text-orange-500" /><span className="text-sm">Today</span></button>
          <button onClick={() => { setActiveView('tomorrow'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'tomorrow' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sunrise className="w-5 h-5 text-amber-500" /><span className="text-sm">Tomorrow</span></button>
          <button onClick={() => { setActiveView('next7'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'next7' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><CalendarRange className="w-5 h-5 text-indigo-500" /><span className="text-sm">Next 7 Days</span></button>
        </div>

        {/* LISTS SECTION WITH ADD BUTTON */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
            Lists
            <button onClick={() => setIsAddingList(true)} className="hover:text-blue-500 transition-colors p-1"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {isAddingList && (
            <form onSubmit={handleAddList} className="px-3 mb-2">
              <input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} onBlur={() => setIsAddingList(false)} placeholder="List name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" />
            </form>
          )}
          <div className="space-y-1">
            {customLists?.map(list => (
              <DroppableSidebarItem key={list.id} id={\`list-\${list.id}\`} type="list" activeId={activeListId} onClick={() => { setActiveView('list'); setActiveListId(list.id); setActiveTagName(null); }} onDelete={() => deleteList(list.id)}><ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} /><span className="text-sm">{list.name}</span></DroppableSidebarItem>
            ))}
          </div>
        </div>

        {/* TAGS SECTION WITH ADD BUTTON */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
            Tags
            <button onClick={() => setIsAddingTag(true)} className="hover:text-blue-500 transition-colors p-1"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {isAddingTag && (
            <form onSubmit={handleAddTag} className="px-3 mb-2">
              <input autoFocus type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="Tag name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" />
            </form>
          )}
          <div className="space-y-1">
            {allTags?.map(tag => (
              <DroppableSidebarItem key={tag.id} id={\`tag-\${tag.name}\`} type="tag" name={tag.name} activeId={activeTagName} onClick={() => { setActiveView('tag'); setActiveTagName(tag.name); setActiveListId(null); }} onDelete={() => deleteTag(tag.id, tag.name)}><Hash className={\`w-4 h-4 \${activeTagName === tag.name ? 'text-blue-600' : 'text-blue-400'}\`} /><span className="text-sm">{tag.name}</span></DroppableSidebarItem>
            ))}
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
           <button onClick={() => { setActiveView('calendar'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'calendar' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Calendar className="w-5 h-5 text-purple-500" /><span className="text-sm">Full Calendar View</span></button>
        </div>
      </div>
    </aside>
  );
}`;

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
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { updateTask, assignTagToTask } = useTaskStore();

  // Robust sensors: requires moving 8px to prevent accidental drags when just clicking
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const taskId = active.id;
    const targetType = over.data.current?.type;
    
    if (targetType === 'list') {
      // Strip out the 'list-' prefix we added for collision safety
      const listId = String(over.id).replace('list-', '');
      updateTask(taskId, { listId: listId });
    } else if (targetType === 'tag') {
      assignTagToTask(taskId, over.data.current.name);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-white font-sans relative">
        <Sidebar 
          activeView={activeView} setActiveView={setActiveView}
          activeListId={activeListId} setActiveListId={setActiveListId}
          activeTagName={activeTagName} setActiveTagName={setActiveTagName}
          isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
          {activeView === 'calendar' ? <CalendarView /> : (
            <TaskList 
              activeView={activeView} activeListId={activeListId} 
              activeTagName={activeTagName} activeTaskId={activeTaskId} 
              onSelectTask={setActiveTaskId} 
            />
          )}
        </main>
        {activeTaskId && <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
      </div>
    </DndContext>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);
fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appCode);
console.log("✅ Missing UI Restored! You can now create lists/tags, and drag-and-drop is fixed.");
