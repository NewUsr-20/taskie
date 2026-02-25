const fs = require("fs");
const path = require("path");

// 1. Fresh Database (v2) to bypass all corruption
const dbCode = `import Dexie, { type EntityTable } from 'dexie';

export interface Subtask { id: string; title: string; isCompleted: boolean; }
export interface Task {
  id: string; title: string; description?: string; isCompleted: boolean;
  priority: number; createdAt: Date; dueDate?: Date; listId?: string;
  tags?: string[]; subtasks?: Subtask[];
}
export interface List { id: string; name: string; }
export interface Tag { id: string; name: string; }

// Renaming the DB forces a 100% clean slate in the browser
const db = new Dexie('TickTickCloneDB_v2') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  lists: EntityTable<List, 'id'>;
  tags: EntityTable<Tag, 'id'>;
};

db.version(1).stores({
  tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags',
  lists: 'id, name',
  tags: 'id, name'
});

export { db };`;

// 2. Bulletproof Task Store with Error Logging
const storeCode = `import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database';
import type { Task } from '../../db/database';

interface TaskState {
  addTask: (title: string, dueDate?: Date, listId?: string, tags?: string[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addList: (name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addTag: (name: string) => Promise<void>;
  deleteTag: (id: string, name: string) => Promise<void>;
  assignTagToTask: (taskId: string, tagName: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>(() => ({
  addTask: async (title, dueDate, listId, tags = []) => {
    try {
      for (const tag of tags) {
        const exists = await db.tags.where('name').equals(tag).first();
        if (!exists) await db.tags.add({ id: uuidv4(), name: tag });
      }
      await db.tasks.add({
        id: uuidv4(), title, isCompleted: false, priority: 0, 
        createdAt: new Date(), dueDate: dueDate ? new Date(dueDate) : undefined,
        listId, tags, subtasks: []
      });
      console.log("✅ Task added successfully to DB");
    } catch (error) {
      console.error("❌ FAILED TO ADD TASK:", error);
    }
  },
  updateTask: async (id, updates) => { await db.tasks.update(id, updates).catch(console.error); },
  toggleTask: async (id, currentStatus) => { await db.tasks.update(id, { isCompleted: !currentStatus }).catch(console.error); },
  deleteTask: async (id) => { await db.tasks.delete(id).catch(console.error); },
  addList: async (name) => { await db.lists.add({ id: uuidv4(), name }).catch(console.error); },
  deleteList: async (id) => {
    await db.tasks.where('listId').equals(id).modify({ listId: undefined }).catch(console.error);
    await db.lists.delete(id).catch(console.error);
  },
  addTag: async (name) => {
    const exists = await db.tags.where('name').equals(name).first();
    if (!exists) await db.tags.add({ id: uuidv4(), name }).catch(console.error);
  },
  deleteTag: async (id, name) => {
    const tasks = await db.tasks.where('tags').equals(name).toArray();
    for (const t of tasks) await db.tasks.update(t.id, { tags: t.tags?.filter(tag => tag !== name) || [] });
    await db.tags.delete(id).catch(console.error);
  },
  assignTagToTask: async (taskId, tagName) => {
    const task = await db.tasks.get(taskId);
    if (!task) return;
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) {
      await db.tasks.update(taskId, { tags: [...currentTags, tagName] }).catch(console.error);
      const exists = await db.tags.where('name').equals(tagName).first();
      if (!exists) await db.tags.add({ id: uuidv4(), name: tagName }).catch(console.error);
    }
  }
}));`;

// 3. TaskList with Safe Date Parsing
const taskListCode = `import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, Flag, Hash, Sparkles, GripVertical, ArrowDownUp } from 'lucide-react';
import * as chrono from 'chrono-node';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../../db/database';
import { useTaskStore } from './taskStore';

function DraggableTask({ task, activeTaskId, onSelectTask, toggleTask, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  const style = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.8 : 1, touchAction: 'none' };
  
  // Safe Date Renderer
  const renderDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  };

  return (
    <div ref={setNodeRef} style={style} onClick={() => onSelectTask(task.id)} className={\`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer \${activeTaskId === task.id ? 'border-blue-200 bg-blue-50/50 shadow-sm' : 'border-transparent hover:border-gray-100 hover:bg-gray-50'} \${task.isCompleted ? 'opacity-50' : ''}\`}>
      <div className="flex items-center gap-3 w-full">
        <div {...listeners} {...attributes} className="cursor-grab hover:bg-gray-200 p-1 rounded text-gray-400"><GripVertical className="w-4 h-4" /></div>
        <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.isCompleted); }}>{task.isCompleted ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5 text-gray-400" />}</button>
        <div className="flex flex-col flex-1">
          <span className={\`text-gray-800 font-medium \${task.isCompleted ? 'line-through text-gray-500' : ''}\`}>{task.title}</span>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
            {task.dueDate && renderDate(task.dueDate) && <span className="text-blue-500 flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{renderDate(task.dueDate)}</span>}
            {task.priority > 0 && <span className="text-orange-500 font-bold flex items-center gap-1"><Flag className="w-3 h-3 fill-current" />P{task.priority}</span>}
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
  const [sortByPriority, setSortByPriority] = useState(false);
  
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  
  const displayTasks = useMemo(() => {
    let filtered = [...allTasks];
    const now = new Date();
    
    if (activeView === 'today') {
      filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString());
    } else if (activeView === 'tomorrow') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === tomorrow.toDateString());
    } else if (activeView === 'next7') {
      const next7 = new Date(); next7.setDate(next7.getDate() + 7);
      filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= next7);
    } else if (activeTagName) {
      filtered = filtered.filter(t => t.tags?.includes(activeTagName));
    } else if (activeListId) {
      filtered = filtered.filter(t => t.listId === activeListId);
    } else if (activeView === 'list') {
      filtered = filtered.filter(t => !t.listId); 
    }

    return filtered.sort((a, b) => {
      if (sortByPriority && b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allTasks, activeView, activeTagName, activeListId, sortByPriority]);
  
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{getTitle()}</h2>
        <button 
          onClick={() => setSortByPriority(!sortByPriority)}
          className={\`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${sortByPriority ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}
        >
          <ArrowDownUp className="w-4 h-4" />
          {sortByPriority ? 'Sorted by Priority' : 'Sort by Priority'}
        </button>
      </div>

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
        {displayTasks?.map(task => <DraggableTask key={task.id} task={task} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} deleteTask={deleteTask} />)}
        {displayTasks?.length === 0 && <div className="text-center text-gray-400 py-10">No tasks for this view.</div>}
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/db/database.ts'), dbCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/taskStore.ts'), storeCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/TaskList.tsx'), taskListCode);

console.log("✅ Hard Reset Complete! Database v2 created and Sort By Priority enabled.");
