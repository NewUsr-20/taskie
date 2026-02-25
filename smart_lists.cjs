const fs = require("fs");
const path = require("path");

const appCode = `import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, MouseSensor } from '@dnd-kit/core';
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

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id;
    const targetType = over.data.current?.type;
    if (targetType === 'list') {
      updateTask(taskId, { listId: over.id });
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
              activeView={activeView} 
              activeListId={activeListId} 
              activeTagName={activeTagName} 
              activeTaskId={activeTaskId} 
              onSelectTask={setActiveTaskId} 
            />
          )}
        </main>
        {activeTaskId && <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
      </div>
    </DndContext>
  );
}`;

const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange } from 'lucide-react';
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
  const { deleteList } = useTaskStore();

  return (
    <aside className="w-64 bg-[#f8f9fb] border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all shadow-inner">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-sm">T</div>
        <span className="ml-3 font-bold text-gray-800 tracking-tight text-lg">TickTick</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        
        {/* Smart Filters */}
        <div className="space-y-1">
          <button onClick={() => { setActiveView('list'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'list' && !activeListId ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Inbox className="w-5 h-5 text-blue-500" /><span className="text-sm">Inbox</span></button>
          <button onClick={() => { setActiveView('today'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'today' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sun className="w-5 h-5 text-orange-500" /><span className="text-sm">Today</span></button>
          <button onClick={() => { setActiveView('tomorrow'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'tomorrow' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Sunrise className="w-5 h-5 text-amber-500" /><span className="text-sm">Tomorrow</span></button>
          <button onClick={() => { setActiveView('next7'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'next7' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><CalendarRange className="w-5 h-5 text-indigo-500" /><span className="text-sm">Next 7 Days</span></button>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Lists</div>
          <div className="space-y-1">
            {customLists?.map(list => (
              <DroppableSidebarItem key={list.id} id={list.id} type="list" activeId={activeListId} onClick={() => { setActiveView('list'); setActiveListId(list.id); setActiveTagName(null); }} onDelete={() => deleteList(list.id)}><ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} /><span className="text-sm">{list.name}</span></DroppableSidebarItem>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Tags</div>
          <div className="space-y-1">
            {allTags?.map(tag => (
              <DroppableSidebarItem key={tag.id} id={tag.name} type="tag" name={tag.name} activeId={activeTagName} onClick={() => { setActiveView('tag'); setActiveTagName(tag.name); setActiveListId(null); }}><Hash className={\`w-4 h-4 \${activeTagName === tag.name ? 'text-blue-600' : 'text-blue-400'}\`} /><span className="text-sm">{tag.name}</span></DroppableSidebarItem>
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

const taskListCode = `import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, Flag, Hash, Sparkles, GripVertical } from 'lucide-react';
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
            {task.dueDate && <span className="text-blue-500 flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{task.dueDate.toLocaleDateString()}</span>}
            {task.priority > 0 && <span className="text-orange-500 font-bold">P{task.priority}</span>}
            {task.tags?.map(tag => <span key={tag} className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>)}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-gray-400 hover:text-red-500 transition-opacity p-2"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function TaskList({ activeView, activeListId, activeTagName, activeTaskId, onSelectTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [detectedDate, setDetectedDate] = useState(null);
  const [detectedTags, setDetectedTags] = useState([]);
  
  // Dynamic Date Queries!
  const tasks = useLiveQuery(() => {
    if (activeView === 'today') {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      return db.tasks.where('dueDate').between(start, end, true, true).reverse().sortBy('createdAt');
    }
    if (activeView === 'tomorrow') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow.setHours(0,0,0,0));
      const end = new Date(tomorrow.setHours(23,59,59,999));
      return db.tasks.where('dueDate').between(start, end, true, true).reverse().sortBy('createdAt');
    }
    if (activeView === 'next7') {
      const start = new Date(); start.setHours(0,0,0,0);
      const next7 = new Date(); next7.setDate(next7.getDate() + 7);
      const end = new Date(next7.setHours(23,59,59,999));
      return db.tasks.where('dueDate').between(start, end, true, true).reverse().sortBy('createdAt');
    }
    if (activeTagName) return db.tasks.where('tags').equals(activeTagName).reverse().sortBy('createdAt');
    if (activeListId) return db.tasks.where('listId').equals(activeListId).reverse().sortBy('createdAt');
    return db.tasks.filter(t => !t.listId).reverse().sortBy('createdAt');
  }, [activeListId, activeTagName, activeView]);
  
  const { addTask, toggleTask, deleteTask } = useTaskStore();
  
  const handleTextChange = (e) => {
    const text = e.target.value; setNewTaskTitle(text);
    const parsed = chrono.parse(text);
    setDetectedDate(parsed.length > 0 ? { date: parsed[0].start.date(), text: parsed[0].text } : null);
    const matches = [...text.matchAll(/#(\\w+)/g)].map(m => m[1]);
    setDetectedTags(matches);
  };
  
  const handleAdd = (e) => {
    e.preventDefault(); if (!newTaskTitle.trim()) return;
    let title = newTaskTitle; let date = dueDate ? new Date(dueDate) : undefined;
    
    // Automatically set the date if the user is inside a Smart List
    if (!date && !detectedDate) {
      if (activeView === 'today') date = new Date();
      if (activeView === 'tomorrow') { date = new Date(); date.setDate(date.getDate() + 1); }
    }

    if (detectedDate) { title = title.replace(detectedDate.text, '').trim(); date = detectedDate.date; }
    detectedTags.forEach(tag => { title = title.replace(\`#\${tag}\`, '').trim(); });
    addTask(title, date, activeListId || undefined, detectedTags);
    setNewTaskTitle(''); setDueDate(''); setDetectedDate(null); setDetectedTags([]);
  };

  const getTitle = () => {
    if (activeView === 'today') return 'Today';
    if (activeView === 'tomorrow') return 'Tomorrow';
    if (activeView === 'next7') return 'Next 7 Days';
    if (activeTagName) return \`#\${activeTagName}\`;
    if (activeListId) return 'Custom List';
    return 'Inbox';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{getTitle()}</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-8 bg-gray-50 p-2 rounded-lg border border-gray-200 relative">
        <div className="flex gap-2">
          <input type="text" value={newTaskTitle} onChange={handleTextChange} placeholder="Add task... use #tags or natural dates" className="flex-1 px-4 py-2 bg-transparent outline-none" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent text-sm outline-none" />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium">Add</button>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium px-2">
          {detectedDate && <span className="text-blue-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {detectedDate.date.toLocaleDateString()}</span>}
          {detectedTags.length > 0 && <span className="text-green-600">Auto-tagging: {detectedTags.join(', ')}</span>}
        </div>
      </form>
      <div className="space-y-1">
        {tasks?.map(task => <DraggableTask key={task.id} task={task} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} deleteTask={deleteTask} />)}
        {tasks?.length === 0 && <div className="text-center text-gray-400 py-10">No tasks for this view. Enjoy your day!</div>}
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appCode);
fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/TaskList.tsx'), taskListCode);
console.log("✅ Smart Lists successfully added!");
