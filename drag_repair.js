const fs = require("fs");

const taskListCode = `import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, Trash2, Plus, Calendar as CalendarIcon, Flag, Hash, Sparkles, GripVertical } from 'lucide-react';
import * as chrono from 'chrono-node';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../../db/database';
import { useTaskStore } from './taskStore';

function DraggableTask({ task, activeTaskId, onSelectTask, toggleTask, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id: task.id, 
    data: { task } 
  });

  const style = { 
    transform: CSS.Translate.toString(transform), 
    zIndex: isDragging ? 999 : 'auto', 
    opacity: isDragging ? 0.6 : 1,
    touchAction: 'none'
  };

  return (
    <div ref={setNodeRef} style={style} className={\`flex items-center justify-between p-3 rounded-lg border transition-all \${activeTaskId === task.id ? 'border-blue-200 bg-blue-50/50' : 'border-transparent hover:bg-gray-50'}\`}>
      <div className="flex items-center gap-3 w-full">
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 rounded text-gray-400 hover:text-blue-500 transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>
        <div onClick={() => onSelectTask(task.id)} className="flex items-center gap-3 flex-1 cursor-pointer">
          <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.isCompleted); }}>
            {task.isCompleted ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5 text-gray-400" />}
          </button>
          <div className="flex flex-col">
            <span className={\`text-gray-800 font-medium \${task.isCompleted ? 'line-through text-gray-400' : ''}\`}>{task.title}</span>
            <div className="flex gap-2 mt-1">
              {task.tags?.map(tag => <span key={tag} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>)}
            </div>
          </div>
        </div>
        <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function TaskList({ activeListId, activeTagName, activeTaskId, onSelectTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const tasks = useLiveQuery(() => {
    if (activeTagName) return db.tasks.where('tags').equals(activeTagName).reverse().sortBy('createdAt');
    if (activeListId) return db.tasks.where('listId').equals(activeListId).reverse().sortBy('createdAt');
    return db.tasks.filter(t => !t.listId).reverse().sortBy('createdAt');
  }, [activeListId, activeTagName]);
  const { addTask, toggleTask, deleteTask } = useTaskStore();

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const tags = [...newTaskTitle.matchAll(/#(\\w+)/g)].map(m => m[1]);
    const cleanTitle = newTaskTitle.replace(/#(\\w+)/g, '').trim();
    addTask(cleanTitle, undefined, activeListId || undefined, tags);
    setNewTaskTitle('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{activeTagName ? \`#\${activeTagName}\` : 'Tasks'}</h2>
      <form onSubmit={handleAdd} className="mb-8 flex gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
        <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add task... use #tags" className="flex-1 px-4 py-2 bg-transparent outline-none" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium">Add</button>
      </form>
      <div className="space-y-1">
        {tasks?.map(task => <DraggableTask key={task.id} task={task} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} deleteTask={deleteTask} />)}
      </div>
    </div>
  );
}\`;

const appCode = \`import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, MouseSensor } from '@dnd-kit/core';
import TaskList from './features/tasks/TaskList';
import Sidebar from './components/Sidebar';
import TaskDetails from './features/tasks/TaskDetails';
import { useTaskStore } from './features/tasks/taskStore';

export default function App() {
  const [activeView, setActiveView] = useState('list');
  const [activeListId, setActiveListId] = useState(null);
  const [activeTagName, setActiveTagName] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
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
          isOpen={false} setIsOpen={() => {}}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
          <TaskList activeListId={activeListId} activeTagName={activeTagName} activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} />
        </main>
        {activeTaskId && <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />}
      </div>
    </DndContext>
  );
}\`;

fs.writeFileSync('src/features/tasks/TaskList.tsx', taskListCode);
fs.writeFileSync('src/App.tsx', appCode);
console.log("🚀 Repair Successful!");
