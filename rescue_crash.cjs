const fs = require("fs");
const path = require("path");

// 1. MAIN.TSX - THE ERROR BOUNDARY
const mainCode = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); console.error("Caught by Error Boundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 max-w-3xl mx-auto mt-20 bg-red-50 border-2 border-red-200 rounded-xl font-sans">
          <h1 className="text-3xl font-bold text-red-700 mb-4">💥 React Crashed!</h1>
          <p className="text-red-600 mb-6 font-medium">Please copy the error below and send it to your AI assistant so we can fix it instantly:</p>
          <div className="bg-white p-4 rounded-lg text-sm text-red-800 overflow-auto border border-red-100 shadow-inner whitespace-pre-wrap font-mono">
            <strong>{this.state.error?.toString()}</strong>
            <br/><br/>
            {this.state.errorInfo?.componentStack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)`;

// 2. DATABASE.TS - CLEAN V4 SLATE
const dbCode = `import Dexie, { type EntityTable } from 'dexie';

export interface Subtask { id: string; title: string; isCompleted: boolean; }
export interface Task {
  id: string; title: string; description?: string; isCompleted: boolean;
  priority: number; createdAt: Date; dueDate?: Date; listId?: string;
  tags?: string[]; subtasks?: Subtask[]; isAllDay?: boolean;
}
export interface List { id: string; name: string; }
export interface Tag { id: string; name: string; }
export interface SavedFilter {
  id: string; name: string; status: string; priority: string; listId: string; tag: string;
}

const db = new Dexie('TickTickCloneDB_v4') as Dexie & {
  tasks: EntityTable<Task, 'id'>; lists: EntityTable<List, 'id'>;
  tags: EntityTable<Tag, 'id'>; filters: EntityTable<SavedFilter, 'id'>;
};

db.version(1).stores({ 
  tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags', 
  lists: 'id, name', 
  tags: 'id, name', 
  filters: 'id, name' 
});

export { db };`;

// 3. TASKLIST.TSX - SAFE RENDERING FIX
const taskListCode = `import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, Flag, Hash, Sparkles, GripVertical, ArrowDownUp, Filter, Save } from 'lucide-react';
import * as chrono from 'chrono-node';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../../db/database';
import { useTaskStore } from './taskStore';

function DraggableTask({ task, activeTaskId, onSelectTask, toggleTask, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  const style = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.8 : 1, touchAction: 'none' };
  
  const renderDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString();
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

export default function TaskList({ activeView, activeListId, activeTagName, activeFilterId, activeTaskId, onSelectTask, setActiveView }) {
  const [newTaskTitle, setNewTaskTitle] = useState(''); const [dueDate, setDueDate] = useState('');
  const [detectedDate, setDetectedDate] = useState(null); const [detectedTags, setDetectedTags] = useState([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('active'); const [filterPriority, setFilterPriority] = useState('all');
  const [filterList, setFilterList] = useState('all'); const [filterTag, setFilterTag] = useState('all');
  const [saveFilterName, setSaveFilterName] = useState('');

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const customLists = useLiveQuery(() => db.lists.toArray(), []) || [];
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  
  // FIXED: Prevents crashing if activeFilterId is null
  const activeSavedFilter = useLiveQuery(
    () => activeFilterId ? db.filters.get(activeFilterId) : Promise.resolve(null), 
    [activeFilterId]
  );
  
  const { addTask, toggleTask, deleteTask, saveFilter } = useTaskStore();

  const displayTasks = useMemo(() => {
    let filtered = [...allTasks]; 
    const now = new Date();
    
    if (activeView === 'create-filter') { 
      if (filterStatus === 'active') filtered = filtered.filter(t => !t.isCompleted);
      if (filterStatus === 'completed') filtered = filtered.filter(t => t.isCompleted);
      if (filterPriority !== 'all') filtered = filtered.filter(t => t.priority === Number(filterPriority));
      if (filterList !== 'all') filtered = filtered.filter(t => t.listId === filterList);
      if (filterTag !== 'all') filtered = filtered.filter(t => t.tags?.includes(filterTag));
    } 
    else if (activeView === 'saved-filter' && activeSavedFilter) { 
      if (activeSavedFilter.status === 'active') filtered = filtered.filter(t => !t.isCompleted);
      if (activeSavedFilter.status === 'completed') filtered = filtered.filter(t => t.isCompleted);
      if (activeSavedFilter.priority !== 'all') filtered = filtered.filter(t => t.priority === Number(activeSavedFilter.priority));
      if (activeSavedFilter.listId !== 'all') filtered = filtered.filter(t => t.listId === activeSavedFilter.listId);
      if (activeSavedFilter.tag !== 'all') filtered = filtered.filter(t => t.tags?.includes(activeSavedFilter.tag));
    } 
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
    detectedTags.forEach(tag => { title = title.replace('#' + tag, '').trim(); });
    
    const listToAssign = activeView === 'filters' && filterList !== 'all' ? filterList : (activeListId || undefined);
    const tagsToAssign = activeView === 'filters' && filterTag !== 'all' ? [...new Set([...detectedTags, filterTag])] : detectedTags;

    addTask(title, date, listToAssign, tagsToAssign);
    setNewTaskTitle(''); setDueDate(''); setDetectedDate(null); setDetectedTags([]);
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) return alert('Please enter a name for the filter.');
    await saveFilter({ name: saveFilterName, status: filterStatus, priority: filterPriority, listId: filterList, tag: filterTag });
    setSaveFilterName('');
    setActiveView('list'); 
  };

  const getTitle = () => {
    if (activeView === 'create-filter') return 'Create Filter';
    if (activeView === 'saved-filter' && activeSavedFilter) return activeSavedFilter.name;
    if (activeView === 'today') return 'Today';
    if (activeView === 'tomorrow') return 'Tomorrow';
    if (activeView === 'next7') return 'Next 7 Days';
    if (activeTagName) return '#' + activeTagName;
    if (activeListId) return 'Custom List';
    return 'Inbox';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {activeView === 'create-filter' && <Filter className="w-6 h-6 text-teal-500" />}
          {getTitle()}
        </h2>
        <button onClick={() => setSortByPriority(!sortByPriority)} className={\`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${sortByPriority ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}>
          <ArrowDownUp className="w-4 h-4" />{sortByPriority ? 'Sorted by Priority' : 'Sort by Priority'}
        </button>
      </div>

      {activeView === 'saved-filter' && activeSavedFilter && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">Status: {activeSavedFilter.status}</span>
          {activeSavedFilter.priority !== 'all' && <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">Priority: P{activeSavedFilter.priority}</span>}
        </div>
      )}

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

fs.writeFileSync(path.join(process.cwd(), 'src/main.tsx'), mainCode);
fs.writeFileSync(path.join(process.cwd(), 'src/db/database.ts'), dbCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/TaskList.tsx'), taskListCode);

console.log("✅ Error Boundary Installed, DB upgraded to v4, and TaskList simplified.");
