import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Calendar as CalendarIcon, Flag, AlignLeft, Hash, Plus, CheckSquare, CheckCircle2, Circle, Trash2, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database';
import { useTaskStore } from './taskStore';

interface TaskDetailsProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetails({ taskId, onClose }: TaskDetailsProps) {
  const task = useLiveQuery(() => db.tasks.get(taskId), [taskId]);
  const allNotes = useLiveQuery(() => db.notes.toArray(), []) || [];
  const { updateTask, addTag } = useTaskStore();
  
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // NEW STATES: For the Note Linking Engine
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [viewingNote, setViewingNote] = useState<any | null>(null);

  if (!task) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => updateTask(taskId, { title: e.target.value });
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => updateTask(taskId, { description: e.target.value });
  const handlePriorityChange = (priority: number) => updateTask(taskId, { priority });
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => updateTask(taskId, { dueDate: e.target.value ? new Date(e.target.value) : undefined });

  const assignTag = async (tagName: string) => {
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) { updateTask(taskId, { tags: [...currentTags, tagName] }); await addTag(tagName); }
    setIsAddingTag(false); setNewTagInput('');
  };
  const removeTag = (tagName: string) => updateTask(taskId, { tags: (task.tags || []).filter(t => t !== tagName) });

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault(); if (!newSubtaskTitle.trim()) return;
    updateTask(taskId, { subtasks: [...(task.subtasks || []), { id: uuidv4(), title: newSubtaskTitle.trim(), isCompleted: false }] });
    setNewSubtaskTitle('');
  };
  const toggleSubtask = (subtaskId: string) => updateTask(taskId, { subtasks: (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st) });
  const deleteSubtask = (subtaskId: string) => { if(window.confirm('Delete this subtask?')) updateTask(taskId, { subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId) }); };

  const getPriorityColor = (level: number) => { switch (level) { case 3: return 'text-red-500 bg-red-50'; case 2: return 'text-orange-500 bg-orange-50'; case 1: return 'text-blue-500 bg-blue-50'; default: return 'text-gray-400 hover:bg-gray-100'; } };

  // AUTO-LINKING ENGINE: Scans description and converts Note titles to clickable links
  const renderDescription = () => {
    if (!task.description) return <span className="text-gray-400">Add notes, links, or context here... (Mention a Note Title to auto-link it!)</span>;
    
    let parts = [{ type: 'text', content: task.description }];
    // Sort notes by length descending to ensure longer titles match before shorter ones
    const sortedNotes = [...allNotes].filter(n => n.title.length > 2).sort((a,b) => b.title.length - a.title.length);
    
    sortedNotes.forEach(note => {
      const newParts: any[] = [];
      // Create a case-insensitive regex that perfectly extracts the note title
      const escapeRegExp = (str: string) => str.replace(/[.*+?^\$\{\}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapeRegExp(note.title)})`, 'gi');
      
      parts.forEach(part => {
        if (part.type === 'link') { newParts.push(part); return; }
        
        const splitText = part.content.split(regex);
        splitText.forEach(segment => {
          if (!segment) return;
          if (segment.toLowerCase() === note.title.toLowerCase()) {
            newParts.push({ type: 'link', note: note, originalText: segment });
          } else {
            newParts.push({ type: 'text', content: segment });
          }
        });
      });
      parts = newParts;
    });

    return parts.map((part, i) => 
      part.type === 'link' ? (
        <span 
          key={i} 
          onClick={(e) => { e.stopPropagation(); setViewingNote(part.note); }} 
          className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 mx-0.5 rounded shadow-sm cursor-pointer hover:bg-indigo-100 hover:underline font-medium inline-flex items-center gap-1 transition-colors"
          title="Click to view note"
        >
          <FileText className="w-3 h-3" /> {part.originalText}
        </span>
      ) : (
        <span key={i} className="whitespace-pre-wrap">{part.content}</span>
      )
    );
  };

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const dateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

  return (
    <>
      <div className="w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl z-20 absolute right-0 top-0 lg:relative transition-all">
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Task Details</span>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">
          <div><input type="text" value={task.title} onChange={handleTitleChange} className={`w-full text-xl font-bold bg-transparent outline-none border-b border-transparent focus:border-blue-500 transition-colors ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`} /></div>

          <div className="flex gap-3 items-center">
            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 px-2 py-1 relative hover:bg-gray-100 transition-colors">
              <CalendarIcon className="w-4 h-4 text-blue-500 mr-2" />
              <input type="date" value={dateValue} onChange={handleDateChange} className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer w-28" />
            </div>
            <div className="flex bg-gray-50 rounded-lg border border-gray-100 p-1">
              {[0, 1, 2, 3].map((level) => (<button key={level} onClick={() => handlePriorityChange(level)} className={`p-1.5 rounded-md transition-colors ${task.priority === level ? getPriorityColor(level) : 'text-gray-400 hover:bg-gray-200'}`}><Flag className={`w-4 h-4 ${task.priority === level && level > 0 ? 'fill-current' : ''}`} /></button>))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-600 font-medium"><Hash className="w-4 h-4" /><span className="text-sm">Tags</span></div>
            <div className="flex flex-wrap gap-2">
              {task.tags?.map(tag => (<span key={tag} className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md border border-blue-100">#{tag} <button onClick={() => removeTag(tag)} className="hover:text-blue-800 ml-1"><X className="w-3 h-3" /></button></span>))}
              {!isAddingTag ? <button onClick={() => setIsAddingTag(true)} className="flex items-center gap-1 bg-gray-50 text-gray-500 hover:bg-gray-100 text-xs px-2 py-1 rounded-md border border-gray-200"><Plus className="w-3 h-3" /> Add Tag</button> : <form onSubmit={(e) => { e.preventDefault(); if (newTagInput.trim()) assignTag(newTagInput.trim().replace('#', '')); }}><input autoFocus type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="type and enter..." className="text-xs px-2 py-1 border border-blue-400 rounded outline-none w-28" /></form>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-gray-600 font-medium">
              <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /><span className="text-sm">Subtasks</span></div>
              {totalSubtasks > 0 && <span className="text-xs text-gray-400">{completedSubtasks}/{totalSubtasks}</span>}
            </div>
            {totalSubtasks > 0 && <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4"><div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}></div></div>}
            <div className="space-y-1">
              {task.subtasks?.map(subtask => (
                <div key={subtask.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                  <div className="flex items-center gap-2 flex-1"><button onClick={() => toggleSubtask(subtask.id)}>{subtask.isCompleted ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-blue-500" />}</button><span className={`text-sm ${subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{subtask.title}</span></div>
                  <button onClick={() => deleteSubtask(subtask.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
              <Plus className="w-4 h-4 text-gray-400 ml-2" />
              <input type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Add subtask..." className="flex-1 text-sm bg-transparent border-b border-gray-200 py-1.5 outline-none focus:border-blue-500 transition-colors"/>
            </form>
          </div>

          {/* NEW: SMART DESCRIPTION AREA */}
          <div className="space-y-2 pb-10">
            <div className="flex items-center justify-between text-gray-600 font-medium">
              <div className="flex items-center gap-2"><AlignLeft className="w-4 h-4" /><span className="text-sm">Description</span></div>
              <button onClick={() => setIsEditingDesc(!isEditingDesc)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
                {isEditingDesc ? 'Save' : 'Edit'}
              </button>
            </div>
            
            {isEditingDesc ? (
              <textarea 
                autoFocus
                value={task.description || ''} 
                onChange={handleDescriptionChange} 
                onBlur={() => setIsEditingDesc(false)}
                placeholder="Write description... Mention a Note Title to link it automatically!" 
                className="w-full h-40 p-3 text-sm text-gray-700 bg-gray-50 border border-indigo-300 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white resize-none transition-all shadow-inner" 
              />
            ) : (
              <div 
                onClick={() => { if (!task.description) setIsEditingDesc(true); }}
                className={`w-full min-h-[160px] p-3 text-sm text-gray-700 bg-gray-50/50 border border-gray-100 rounded-lg transition-all leading-relaxed ${!task.description ? 'cursor-text' : ''}`}
              >
                {renderDescription()}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* NEW: POP-UP MODAL FOR VIEWING LINKED NOTES */}
      {viewingNote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" onClick={() => setViewingNote(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-indigo-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {viewingNote.title}
              </h3>
              <button onClick={() => setViewingNote(null)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-[#fdfdfd]">
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px]">
                {viewingNote.content || <span className="text-gray-400 italic">This note is currently empty.</span>}
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
               <span>Last updated: {new Date(viewingNote.updatedAt).toLocaleString()}</span>
               <span className="text-indigo-500 font-medium px-2 py-1 bg-indigo-50 rounded">Read-only view</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}