const fs = require("fs");
const path = require("path");

const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter } from 'lucide-react';
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

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleAddList = (e) => { e.preventDefault(); if (newListName.trim()) addList(newListName.trim()); setNewListName(''); setIsAddingList(false); };
  const handleAddTag = (e) => { e.preventDefault(); if (newTagName.trim()) addTag(newTagName.trim().replace('#', '')); setNewTagName(''); setIsAddingTag(false); };

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

        {/* NEW: Filters Section */}
        <div className="pt-2 border-t border-gray-200">
           <button onClick={() => { setActiveView('filters'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'filters' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Filter className="w-5 h-5 text-teal-500" /><span className="text-sm">Custom Filters</span></button>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Lists<button onClick={() => setIsAddingList(true)} className="hover:text-blue-500 transition-colors p-1"><Plus className="w-3.5 h-3.5" /></button></div>
          {isAddingList && <form onSubmit={handleAddList} className="px-3 mb-2"><input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} onBlur={() => setIsAddingList(false)} placeholder="List name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" /></form>}
          <div className="space-y-1">
            {customLists?.map(list => <DroppableSidebarItem key={list.id} id={\`list-\${list.id}\`} type="list" activeId={activeListId} onClick={() => { setActiveView('list'); setActiveListId(list.id); setActiveTagName(null); }} onDelete={() => deleteList(list.id)}><ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} /><span className="text-sm">{list.name}</span></DroppableSidebarItem>)}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Tags<button onClick={() => setIsAddingTag(true)} className="hover:text-blue-500 transition-colors p-1"><Plus className="w-3.5 h-3.5" /></button></div>
          {isAddingTag && <form onSubmit={handleAddTag} className="px-3 mb-2"><input autoFocus type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="Tag name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" /></form>}
          <div className="space-y-1">
            {allTags?.map(tag => <DroppableSidebarItem key={tag.id} id={\`tag-\${tag.name}\`} type="tag" name={tag.name} activeId={activeTagName} onClick={() => { setActiveView('tag'); setActiveTagName(tag.name); setActiveListId(null); }} onDelete={() => deleteTag(tag.id, tag.name)}><Hash className={\`w-4 h-4 \${activeTagName === tag.name ? 'text-blue-600' : 'text-blue-400'}\`} /><span className="text-sm">{tag.name}</span></DroppableSidebarItem>)}
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
           <button onClick={() => { setActiveView('calendar'); setActiveListId(null); setActiveTagName(null); }} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'calendar' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}><Calendar className="w-5 h-5 text-purple-500" /><span className="text-sm">Full Calendar View</span></button>
        </div>
      </div>
    </aside>
  );
}`;

const taskListCode = `import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, Flag, Hash, Sparkles, GripVertical, ArrowDownUp, Filter } from 'lucide-react';
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

export default function TaskList({ activeView, activeListId, activeTagName, activeTaskId, onSelectTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [detectedDate, setDetectedDate] = useState(null);
  const [detectedTags, setDetectedTags] = useState([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  
  // Custom Filter States
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterList, setFilterList] = useState('all');
  const [filterTag, setFilterTag] = useState('all');

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const customLists = useLiveQuery(() => db.lists.toArray(), []) || [];
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  
  const displayTasks = useMemo(() => {
    let filtered = [...allTasks];
    const now = new Date();
    
    if (activeView === 'filters') {
      // Apply Custom Combinations
      if (filterStatus === 'active') filtered = filtered.filter(t => !t.isCompleted);
      if (filterStatus === 'completed') filtered = filtered.filter(t => t.isCompleted);
      if (filterPriority !== 'all') filtered = filtered.filter(t => t.priority === Number(filterPriority));
      if (filterList !== 'all') filtered = filtered.filter(t => t.listId === filterList);
      if (filterTag !== 'all') filtered = filtered.filter(t => t.tags?.includes(filterTag));
    } else if (activeView === 'today') {
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
  }, [allTasks, activeView, activeTagName, activeListId, sortByPriority, filterStatus, filterPriority, filterList, filterTag]);
  
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
    
    // If they add a task while in custom filter view, respect the current filter list/tags
    const listToAssign = activeView === 'filters' && filterList !== 'all' ? filterList : (activeListId || undefined);
    const tagsToAssign = activeView === 'filters' && filterTag !== 'all' ? [...new Set([...detectedTags, filterTag])] : detectedTags;

    addTask(title, date, listToAssign, tagsToAssign);
    setNewTaskTitle(''); setDueDate(''); setDetectedDate(null); setDetectedTags([]);
  };

  const getTitle = () => {
    if (activeView === 'filters') return 'Custom Filters';
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
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {activeView === 'filters' && <Filter className="w-6 h-6 text-teal-500" />}
          {getTitle()}
        </h2>
        <button onClick={() => setSortByPriority(!sortByPriority)} className={\`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${sortByPriority ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}\`}>
          <ArrowDownUp className="w-4 h-4" />
          {sortByPriority ? 'Sorted by Priority' : 'Sort by Priority'}
        </button>
      </div>

      {/* NEW: Filter Control Panel */}
      {activeView === 'filters' && (
        <div className="mb-6 p-4 bg-teal-50/50 rounded-lg border border-teal-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase tracking-wide">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm bg-white border border-teal-200 text-gray-700 rounded-md p-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
              <option value="all">All Tasks</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase tracking-wide">Priority</label>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm bg-white border border-teal-200 text-gray-700 rounded-md p-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
              <option value="all">Any Priority</option>
              <option value="3">High (P3)</option>
              <option value="2">Medium (P2)</option>
              <option value="1">Low (P1)</option>
              <option value="0">None</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase tracking-wide">List</label>
            <select value={filterList} onChange={e => setFilterList(e.target.value)} className="text-sm bg-white border border-teal-200 text-gray-700 rounded-md p-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
              <option value="all">All Lists</option>
              {customLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-teal-800 mb-1.5 uppercase tracking-wide">Tag</label>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="text-sm bg-white border border-teal-200 text-gray-700 rounded-md p-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer">
              <option value="all">Any Tag</option>
              {allTags.map(t => <option key={t.id} value={t.name}>#{t.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-8 bg-gray-50 p-2 rounded-lg border border-gray-200 relative">
        <div className="flex gap-2">
          <input type="text" value={newTaskTitle} onChange={handleTextChange} placeholder="Add task... use #tags or natural dates" className="flex-1 px-4 py-2 bg-transparent outline-none" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent text-sm outline-none cursor-pointer" />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors">Add</button>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium px-2">
          {detectedDate && <span className="text-blue-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {detectedDate.date.toLocaleDateString()}</span>}
          {detectedTags.length > 0 && <span className="text-green-600 flex items-center gap-1"><Hash className="w-3 h-3" /> Auto-tagging: {detectedTags.join(', ')}</span>}
        </div>
      </form>
      
      <div className="space-y-1.5">
        {displayTasks?.map(task => <DraggableTask key={task.id} task={task} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} deleteTask={deleteTask} />)}
        {displayTasks?.length === 0 && <div className="text-center text-gray-400 py-10 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">No tasks match these filters.</div>}
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/TaskList.tsx'), taskListCode);

console.log("✅ Custom Filters panel successfully integrated!");
