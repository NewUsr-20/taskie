const fs = require("fs");
const path = require("path");

// 1. Create the Matrix Folder
const matrixDir = path.join(process.cwd(), 'src/features/matrix');
if (!fs.existsSync(matrixDir)) {
  fs.mkdirSync(matrixDir, { recursive: true });
}

// 2. Build the Eisenhower Matrix Component
const matrixCode = `import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, GripVertical, AlertTriangle, CalendarClock, Users, Trash } from 'lucide-react';
import { db } from '../../db/database';
import { useTaskStore } from '../tasks/taskStore';

function DraggableMatrixTask({ task, activeTaskId, onSelectTask, toggleTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task, type: 'task' } });
  const style = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.6 : 1, touchAction: 'none' };
  
  return (
    <div ref={setNodeRef} style={style} onClick={() => onSelectTask(task.id)} className={\`flex items-start gap-2 p-2.5 bg-white rounded-lg shadow-sm border cursor-pointer transition-all \${activeTaskId === task.id ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100 hover:border-gray-200'}\`}>
      <div {...listeners} {...attributes} className="cursor-grab hover:bg-gray-100 p-0.5 rounded text-gray-400 mt-0.5"><GripVertical className="w-3.5 h-3.5" /></div>
      <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.isCompleted); }} className="mt-0.5 flex-shrink-0">
        {task.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-blue-500" />}
      </button>
      <div className="flex flex-col overflow-hidden">
        <span className={\`text-sm font-medium truncate \${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}\`}>{task.title}</span>
      </div>
    </div>
  );
}

function Quadrant({ priorityLevel, title, description, icon, colorClass, tasks, activeTaskId, onSelectTask, toggleTask }) {
  const { isOver, setNodeRef } = useDroppable({ id: \`matrix-\${priorityLevel}\`, data: { type: 'matrix' } });
  
  return (
    <div ref={setNodeRef} className={\`flex flex-col h-[350px] rounded-xl border-2 p-4 transition-all \${colorClass} \${isOver ? 'ring-4 ring-opacity-40 scale-[1.02] shadow-lg' : ''}\`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 font-medium mb-4">{description}</p>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {tasks.map(t => <DraggableMatrixTask key={t.id} task={t} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />)}
        {tasks.length === 0 && <div className="text-center text-sm text-gray-400/70 mt-10 border-2 border-dashed border-gray-200/50 rounded-lg p-4">Drag tasks here</div>}
      </div>
    </div>
  );
}

export default function EisenhowerMatrix({ activeTaskId, onSelectTask }) {
  // Only fetch active (uncompleted) tasks for the matrix to keep it actionable
  const allTasks = useLiveQuery(() => db.tasks.filter(t => !t.isCompleted).toArray(), []) || [];
  const { toggleTask } = useTaskStore();

  const p3Tasks = allTasks.filter(t => t.priority === 3);
  const p2Tasks = allTasks.filter(t => t.priority === 2);
  const p1Tasks = allTasks.filter(t => t.priority === 1);
  const p0Tasks = allTasks.filter(t => t.priority === 0);

  return (
    <div className="max-w-5xl mx-auto p-2">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Eisenhower Matrix</h2>
        <p className="text-gray-500 text-sm mt-1">Drag and drop tasks between quadrants to instantly update their priority.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Quadrant priorityLevel={3} title="Do First" description="Urgent & Important (P3)" icon={<AlertTriangle className="w-5 h-5 text-red-500" />} colorClass="bg-red-50/50 border-red-100 ring-red-400" tasks={p3Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
        <Quadrant priorityLevel={2} title="Schedule" description="Important, Not Urgent (P2)" icon={<CalendarClock className="w-5 h-5 text-orange-500" />} colorClass="bg-orange-50/50 border-orange-100 ring-orange-400" tasks={p2Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
        <Quadrant priorityLevel={1} title="Delegate" description="Urgent, Not Important (P1)" icon={<Users className="w-5 h-5 text-blue-500" />} colorClass="bg-blue-50/50 border-blue-100 ring-blue-400" tasks={p1Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
        <Quadrant priorityLevel={0} title="Eliminate" description="Not Urgent, Not Important (None)" icon={<Trash className="w-5 h-5 text-gray-400" />} colorClass="bg-gray-50/80 border-gray-200 ring-gray-400" tasks={p0Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
      </div>
    </div>
  );
}`;
fs.writeFileSync(path.join(matrixDir, 'EisenhowerMatrix.tsx'), matrixCode);

// 3. Update APP.TSX to support Matrix rendering & Drag-Dropping into Quadrants
const appCode = `import { useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import TaskList from './features/tasks/TaskList';
import CalendarView from './features/calendar/CalendarView';
import EisenhowerMatrix from './features/matrix/EisenhowerMatrix';
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
    
    if (targetType === 'list') { 
      updateTask(taskId, { listId: String(over.id).replace('list-', '') }); 
    } 
    else if (targetType === 'tag') { 
      assignTagToTask(taskId, over.data.current.name); 
    }
    else if (targetType === 'matrix') {
      // Change priority when dropped in Matrix!
      const newPriority = Number(String(over.id).replace('matrix-', ''));
      updateTask(taskId, { priority: newPriority });
    }
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
          {activeView === 'calendar' ? <CalendarView /> : 
           activeView === 'matrix' ? <EisenhowerMatrix activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} /> :
           <TaskList activeView={activeView} activeListId={activeListId} activeTagName={activeTagName} activeFilterId={activeFilterId} activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} setActiveView={setActiveView} />
          }
        </main>
        {activeTaskId && <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
      </div>
    </DndContext>
  );
}`;
fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appCode);

// 4. Update SIDEBAR to move Calendar up and add Matrix
const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter, SlidersHorizontal, LayoutGrid } from 'lucide-react';
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        
        {/* MAIN NAVIGATION */}
        <div className="space-y-1">
          <button onClick={() => nav('list')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'list' && !activeListId ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Inbox className="w-5 h-5 text-blue-500" /><span className="text-sm">All Tasks</span></button>
          <button onClick={() => nav('today')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'today' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sun className="w-5 h-5 text-orange-500" /><span className="text-sm">Today</span></button>
          <button onClick={() => nav('tomorrow')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'tomorrow' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sunrise className="w-5 h-5 text-amber-500" /><span className="text-sm">Tomorrow</span></button>
          <button onClick={() => nav('next7')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'next7' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><CalendarRange className="w-5 h-5 text-indigo-500" /><span className="text-sm">Next 7 Days</span></button>
          
          {/* RESTORED AND PROMOTED: Calendar and Matrix */}
          <div className="my-2 border-t border-gray-200"></div>
          
          <button onClick={() => nav('calendar')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'calendar' ? 'bg-purple-100 text-purple-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Calendar className="w-5 h-5 text-purple-500" /><span className="text-sm">Calendar</span></button>
          <button onClick={() => nav('matrix')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'matrix' ? 'bg-rose-100 text-rose-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><LayoutGrid className="w-5 h-5 text-rose-500" /><span className="text-sm">Eisenhower Matrix</span></button>
        </div>

        {/* CUSTOM FILTERS */}
        <div className="pt-2 border-t border-gray-200">
           <button onClick={() => nav('create-filter')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'create-filter' ? 'bg-teal-100 text-teal-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Filter className="w-5 h-5 text-teal-500" /><span className="text-sm">Custom Filters</span></button>
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

        {/* LISTS */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Lists<button onClick={() => setIsAddingList(true)} className="hover:text-blue-500 p-1"><Plus className="w-3.5 h-3.5" /></button></div>
          {isAddingList && <form onSubmit={handleAddList} className="px-3 mb-2"><input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} onBlur={() => setIsAddingList(false)} placeholder="List name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" /></form>}
          <div className="space-y-1">
            {customLists?.map(list => <DroppableSidebarItem key={list.id} id={\`list-\${list.id}\`} type="list" activeId={activeListId} onClick={() => nav('list', list.id)} onDelete={() => deleteList(list.id)}><ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} /><span className="text-sm">{list.name}</span></DroppableSidebarItem>)}
          </div>
        </div>

        {/* TAGS */}
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
fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);

console.log("✅ Matrix built and Calendar restored to the main menu!");
