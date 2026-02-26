import { useState } from 'react';
import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter, SlidersHorizontal, LayoutGrid, FileText, FolderPlus, Search, LogOut, User } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useTaskStore } from '../features/tasks/taskStore';
import { supabase } from '../db/supabase';

function DroppableSidebarItem({ id, type, name, activeId, onClick, children, onDelete }) {
  const { isOver, setNodeRef } = useDroppable({ id, data: { type, name } });
  return (
    <div ref={setNodeRef} className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${activeId === (type === 'tag' ? name : id) ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100'} ${isOver ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-105 z-10' : ''}`}>
      <button onClick={onClick} className="flex items-center gap-3 flex-1 truncate text-left font-medium">{children}</button>
      {onDelete && !isOver && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>}
    </div>
  );
}

export default function Sidebar({ activeView, setActiveView, activeListId, setActiveListId, activeTagName, setActiveTagName, activeFilterId, setActiveFilterId, onOpenSearch }) {
  const { lists: customLists, tags: allTags, filters: savedFilters, addList, deleteList, addTag, deleteTag, deleteSavedFilter } = useTaskStore();

  const [isAddingList, setIsAddingList] = useState(false); 
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState('task'); 
  
  const [isAddingTag, setIsAddingTag] = useState(false); 
  const [newTagName, setNewTagName] = useState('');

  const handleAddList = (e) => { 
    e.preventDefault(); 
    if (newListName.trim()) addList(newListName.trim(), newListType); 
    setNewListName(''); setIsAddingList(false); setNewListType('task');
  };
  const handleAddTag = (e) => { e.preventDefault(); if (newTagName.trim()) addTag(newTagName.trim().replace('#', '')); setNewTagName(''); setIsAddingTag(false); };

  const nav = (view, listId=null, tagName=null, filterId=null) => {
    setActiveView(view); setActiveListId(listId); setActiveTagName(tagName); setActiveFilterId(filterId);
  };

  return (
    <aside className="w-64 bg-[#f8f9fb] border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all shadow-inner">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-sm">T</div>
        <span className="ml-3 font-bold text-gray-800 tracking-tight text-lg">TAK's</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        
        {/* SEARCH BAR */}
        <button onClick={onOpenSearch} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 shadow-sm transition-all mb-6 group">
          <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
          <span className="text-sm">Search...</span>
          <span className="ml-auto text-[10px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">Ctrl K</span>
        </button>

        {/* TOP NAVIGATION */}
        <div className="space-y-1">
          <button onClick={() => nav('list')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'list' && !activeListId ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Inbox className="w-5 h-5 text-blue-500" /><span className="text-sm">All Tasks</span></button>
          <button onClick={() => nav('today')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'today' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Sun className="w-5 h-5 text-orange-500" /><span className="text-sm">Today</span></button>
          <button onClick={() => nav('tomorrow')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'tomorrow' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Sunrise className="w-5 h-5 text-amber-500" /><span className="text-sm">Tomorrow</span></button>
          <button onClick={() => nav('next7')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'next7' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><CalendarRange className="w-5 h-5 text-indigo-500" /><span className="text-sm">Next 7 Days</span></button>
          <div className="my-2 border-t border-gray-200"></div>
          <button onClick={() => nav('calendar')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'calendar' ? 'bg-purple-100 text-purple-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Calendar className="w-5 h-5 text-purple-500" /><span className="text-sm">Calendar</span></button>
          <button onClick={() => nav('matrix')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'matrix' ? 'bg-rose-100 text-rose-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutGrid className="w-5 h-5 text-rose-500" /><span className="text-sm">Eisenhower Matrix</span></button>
        </div>

        {/* RESTORED: CUSTOM FILTERS */}
        <div className="pt-2 border-t border-gray-200">
           <button onClick={() => nav('create-filter')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'create-filter' ? 'bg-teal-100 text-teal-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Filter className="w-5 h-5 text-teal-500" /><span className="text-sm">Custom Filters</span></button>
           {savedFilters?.length > 0 && (
             <div className="mt-3 space-y-1">
               <div className="px-3 mb-1 text-[10px] font-bold text-teal-600 uppercase tracking-[0.1em]">Saved Filters</div>
               {savedFilters.map(sf => (
                  <div key={sf.id} onClick={() => nav('saved-filter', null, null, sf.id)} className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${activeFilterId === sf.id ? 'bg-teal-100 text-teal-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-3 flex-1 truncate"><SlidersHorizontal className="w-4 h-4 text-teal-500" /><span className="text-sm">{sf.name}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); deleteSavedFilter(sf.id); if(activeFilterId===sf.id) nav('list'); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
               ))}
             </div>
           )}
        </div>

        {/* FOLDERS (TASKS AND NOTES) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Folders<button onClick={() => setIsAddingList(true)} className="hover:text-blue-500 p-1"><FolderPlus className="w-4 h-4" /></button></div>
          {isAddingList && (
            <form onSubmit={handleAddList} className="px-3 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Folder name..." className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded outline-none mb-2" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewListType('task')} className={`flex-1 text-xs py-1 rounded ${newListType === 'task' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Tasks</button>
                <button type="button" onClick={() => setNewListType('note')} className={`flex-1 text-xs py-1 rounded ${newListType === 'note' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Notes</button>
              </div>
              <div className="flex justify-end mt-2"><button type="submit" className="text-xs font-bold text-blue-600">Save</button></div>
            </form>
          )}
          <div className="space-y-1">
            {customLists?.map(list => (
              <DroppableSidebarItem key={list.id} id={`list-${list.id}`} type="list" activeId={activeListId} onClick={() => nav('list', list.id)} onDelete={() => deleteList(list.id)}>
                {list.type === 'note' ? <FileText className={`w-4 h-4 ${activeListId === list.id ? 'text-indigo-600' : 'text-gray-400'}`}/> : <ListTodo className={`w-4 h-4 ${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}`} />}
                <span className="text-sm">{list.name}</span>
              </DroppableSidebarItem>
            ))}
          </div>
        </div>

        {/* RESTORED: TAGS */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Tags<button onClick={() => setIsAddingTag(true)} className="hover:text-blue-500 p-1"><Plus className="w-3.5 h-3.5" /></button></div>
          {isAddingTag && <form onSubmit={handleAddTag} className="px-3 mb-2"><input autoFocus type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onBlur={() => setIsAddingTag(false)} placeholder="Tag name..." className="w-full text-sm px-2 py-1.5 border border-blue-400 rounded outline-none shadow-sm" /></form>}
          <div className="space-y-1">
            {allTags?.map(tag => <DroppableSidebarItem key={tag.id} id={`tag-${tag.name}`} type="tag" name={tag.name} activeId={activeTagName} onClick={() => nav('tag', null, tag.name)} onDelete={() => deleteTag(tag.id, tag.name)}><Hash className={`w-4 h-4 ${activeTagName === tag.name ? 'text-blue-600' : 'text-blue-400'}`} /><span className="text-sm">{tag.name}</span></DroppableSidebarItem>)}
          </div>
        </div>

      
        {/* NEW: TRASH VIEW */}
        <div className="pt-2 border-t border-gray-200 mt-auto">
           <button onClick={() => nav('trash')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'trash' ? 'bg-red-100 text-red-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
             <Trash2 className="w-5 h-5 text-red-500" />
             <span className="text-sm">Trash</span>
           </button>
        </div>
      
        {/* NEW: LOG OUT */}
        
        {/* NEW: PROFILE VIEW */}
        <div className="pt-2 border-t border-gray-200 mt-auto">
           <button onClick={() => setActiveView('profile')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${activeView === 'profile' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
             <User className={`w-5 h-5 ${activeView === 'profile' ? 'text-blue-600' : 'text-gray-400'}`} />
             <span className="text-sm">Profile Settings</span>
           </button>
        </div>

        <div className="pt-1 mt-1">
           <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all">
             <LogOut className="w-5 h-5 text-gray-400" />
             <span className="text-sm font-medium">Sign Out</span>
           </button>
        </div>
      </div>
    </aside>


  );
}