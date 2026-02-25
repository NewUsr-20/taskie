const fs = require("fs");
const path = require("path");

// 1. UPDATE TASK DETAILS (Add the Date Picker)
const detailsCode = `import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Calendar as CalendarIcon, Flag, AlignLeft, Hash, Plus, CheckSquare, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database';
import { useTaskStore } from './taskStore';

interface TaskDetailsProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetails({ taskId, onClose }: TaskDetailsProps) {
  const task = useLiveQuery(() => db.tasks.get(taskId), [taskId]);
  const { updateTask, addTag } = useTaskStore();
  
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  if (!task) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => updateTask(taskId, { title: e.target.value });
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => updateTask(taskId, { description: e.target.value });
  const handlePriorityChange = (priority: number) => updateTask(taskId, { priority });
  
  // NEW: Handle Date Edits
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateTask(taskId, { dueDate: val ? new Date(val) : undefined });
  };

  const assignTag = async (tagName: string) => {
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) {
      updateTask(taskId, { tags: [...currentTags, tagName] });
      await addTag(tagName);
    }
    setIsAddingTag(false);
    setNewTagInput('');
  };
  const removeTag = (tagName: string) => updateTask(taskId, { tags: (task.tags || []).filter(t => t !== tagName) });

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSubtask = { id: uuidv4(), title: newSubtaskTitle.trim(), isCompleted: false };
    updateTask(taskId, { subtasks: [...(task.subtasks || []), newSubtask] });
    setNewSubtaskTitle('');
  };
  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st);
    updateTask(taskId, { subtasks: updatedSubtasks });
  };
  const deleteSubtask = (subtaskId: string) => {
    updateTask(taskId, { subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId) });
  };

  const getPriorityColor = (level: number) => {
    switch (level) { case 3: return 'text-red-500 bg-red-50'; case 2: return 'text-orange-500 bg-orange-50'; case 1: return 'text-blue-500 bg-blue-50'; default: return 'text-gray-400 hover:bg-gray-100'; }
  };

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const progressPercent = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  // Format the existing date to YYYY-MM-DD for the HTML date input
  const dateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

  return (
    <div className="w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl z-20 absolute right-0 top-0 lg:relative transition-all">
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Task Details</span>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        
        {/* Title */}
        <div>
          <input type="text" value={task.title} onChange={handleTitleChange} className={\`w-full text-xl font-bold bg-transparent outline-none border-b border-transparent focus:border-blue-500 transition-colors \${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}\`} />
        </div>

        {/* Action Bar (Date & Priority) */}
        <div className="flex gap-3 items-center">
          
          {/* NEW: Date Picker */}
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 px-2 py-1 relative hover:bg-gray-100 transition-colors">
            <CalendarIcon className="w-4 h-4 text-blue-500 mr-2" />
            <input 
              type="date" 
              value={dateValue}
              onChange={handleDateChange}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer w-28"
            />
          </div>

          <div className="flex bg-gray-50 rounded-lg border border-gray-100 p-1">
            {[0, 1, 2, 3].map((level) => (
              <button key={level} onClick={() => handlePriorityChange(level)} className={\`p-1.5 rounded-md transition-colors \${task.priority === level ? getPriorityColor(level) : 'text-gray-400 hover:bg-gray-200'}\`} title={\`Priority \${level}\`}>
                <Flag className={\`w-4 h-4 \${task.priority === level && level > 0 ? 'fill-current' : ''}\`} />
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600 font-medium"><Hash className="w-4 h-4" /><span className="text-sm">Tags</span></div>
          <div className="flex flex-wrap gap-2">
            {task.tags?.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md border border-blue-100">
                #{tag} <button onClick={() => removeTag(tag)} className="hover:text-blue-800 ml-1"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {!isAddingTag ? (
              <button onClick={() => setIsAddingTag(true)} className="flex items-center gap-1 bg-gray-50 text-gray-500 hover:bg-gray-100 text-xs px-2 py-1 rounded-md border border-gray-200"><Plus className="w-3 h-3" /> Add Tag</button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (newTagInput.trim()) assignTag(newTagInput.trim().replace('#', '')); }}>
                <input autoFocus type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="type and enter..." className="text-xs px-2 py-1 border border-blue-400 rounded outline-none w-28" />
              </form>
            )}
          </div>
        </div>

        {/* Subtasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-gray-600 font-medium">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              <span className="text-sm">Subtasks</span>
            </div>
            {totalSubtasks > 0 && <span className="text-xs text-gray-400">{completedSubtasks}/{totalSubtasks}</span>}
          </div>
          
          {totalSubtasks > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: \`\${progressPercent}%\` }}></div>
            </div>
          )}

          <div className="space-y-1">
            {task.subtasks?.map(subtask => (
              <div key={subtask.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  <button onClick={() => toggleSubtask(subtask.id)}>
                    {subtask.isCompleted ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-blue-500" />}
                  </button>
                  <span className={\`text-sm \${subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}\`}>{subtask.title}</span>
                </div>
                <button onClick={() => deleteSubtask(subtask.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
            <Plus className="w-4 h-4 text-gray-400 ml-2" />
            <input 
              type="text" 
              value={newSubtaskTitle} 
              onChange={(e) => setNewSubtaskTitle(e.target.value)} 
              placeholder="Add subtask..." 
              className="flex-1 text-sm bg-transparent border-b border-gray-200 py-1.5 outline-none focus:border-blue-500 transition-colors"
            />
          </form>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600 font-medium"><AlignLeft className="w-4 h-4" /><span className="text-sm">Description</span></div>
          <textarea value={task.description || ''} onChange={handleDescriptionChange} placeholder="Add notes, links, or context here..." className="w-full h-40 p-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white resize-none transition-all" />
        </div>

      </div>
    </div>
  );
}`;
fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/TaskDetails.tsx'), detailsCode);

// 2. SURGICALLY UPDATE TASKLIST (Make Inbox show ALL tasks)
const taskListPath = path.join(process.cwd(), 'src/features/tasks/TaskList.tsx');
let taskListCode = fs.readFileSync(taskListPath, 'utf8');

// The line we are looking for is exactly: else if (activeView === 'list') { filtered = filtered.filter(t => !t.listId); }
// We replace it so it doesn't filter out assigned tasks.
taskListCode = taskListCode.replace(
  /else if \(activeView === 'list'\) \{ filtered = filtered\.filter\(t => !t\.listId\); \}/g, 
  "else if (activeView === 'list') { /* Now shows ALL tasks across all lists */ }"
);

// Optional: Change the header title so it's clear
taskListCode = taskListCode.replace(
  /return 'Inbox';/g,
  "return 'All Tasks';"
);

fs.writeFileSync(taskListPath, taskListCode);

// 3. SURGICALLY UPDATE SIDEBAR (Change "Inbox" label to "All Tasks")
const sidebarPath = path.join(process.cwd(), 'src/components/Sidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
sidebarCode = sidebarCode.replace(
  /<span className="text-sm">Inbox<\/span>/g,
  `<span className="text-sm">All Tasks</span>`
);
fs.writeFileSync(sidebarPath, sidebarCode);

console.log("✅ Fixes Applied! 'Inbox' is now 'All Tasks' and Date Editing is active.");
