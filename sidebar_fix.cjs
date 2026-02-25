const fs = require("fs");
const path = require("path");

const sidebarCode = `import { useState } from 'react';
import { Inbox, Hash, ListTodo, Plus, Trash2, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable } from '@dnd-kit/core';
import { db } from '../db/database';
import { useTaskStore } from '../features/tasks/taskStore';

function DroppableSidebarItem({ id, type, name, activeId, onClick, children, onDelete }) {
  const { isOver, setNodeRef } = useDroppable({ 
    id: id, 
    data: { type, name } 
  });

  return (
    <div 
      ref={setNodeRef} 
      className={\`
        group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer
        \${activeId === (type === 'tag' ? name : id) ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}
        \${isOver ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-105 z-10' : ''}
      \`}
    >
      <button onClick={onClick} className="flex items-center gap-3 flex-1 truncate text-left font-medium">
        {children}
      </button>
      {onDelete && !isOver && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Sidebar({ activeView, setActiveView, activeListId, setActiveListId, activeTagName, setActiveTagName, isOpen, setIsOpen }) {
  const customLists = useLiveQuery(() => db.lists.toArray());
  const allTags = useLiveQuery(() => db.tags.toArray());
  const { addList, deleteList } = useTaskStore();

  const isFilterActive = (view, listId = null) => {
    return activeView === view && activeListId === listId;
  };

  return (
    <aside className="w-64 bg-[#f8f9fb] border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all shadow-inner">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-sm">T</div>
        <span className="ml-3 font-bold text-gray-800 tracking-tight text-lg">TickTick</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Smart Filters Section */}
        <div className="space-y-1">
          <button 
            onClick={() => { setActiveView('list'); setActiveListId(null); setActiveTagName(null); }}
            className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${isFilterActive('list') ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}
          >
            <Inbox className="w-5 h-5 text-blue-500" />
            <span className="text-sm">Inbox</span>
          </button>
          
          <button 
            onClick={() => { setActiveView('calendar'); setActiveListId(null); setActiveTagName(null); }}
            className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'calendar' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}
          >
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-sm">Calendar</span>
          </button>
        </div>

        {/* Lists Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
            Lists
          </div>
          <div className="space-y-1">
            {customLists?.map(list => (
              <DroppableSidebarItem 
                key={list.id} id={list.id} type="list" 
                activeId={activeListId} 
                onClick={() => { setActiveView('list'); setActiveListId(list.id); setActiveTagName(null); }}
                onDelete={() => deleteList(list.id)}
              >
                <ListTodo className={\`w-4 h-4 \${activeListId === list.id ? 'text-blue-600' : 'text-gray-400'}\`} />
                <span className="text-sm">{list.name}</span>
              </DroppableSidebarItem>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
            Tags
          </div>
          <div className="space-y-1">
            {allTags?.map(tag => (
              <DroppableSidebarItem 
                key={tag.id} id={tag.name} type="tag" name={tag.name}
                activeId={activeTagName} 
                onClick={() => { setActiveView('tag'); setActiveTagName(tag.name); setActiveListId(null); }}
              >
                <Hash className={\`w-4 h-4 \${activeTagName === tag.name ? 'text-blue-600' : 'text-blue-400'}\`} />
                <span className="text-sm">{tag.name}</span>
              </DroppableSidebarItem>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/components/Sidebar.tsx'), sidebarCode);
console.log("🎨 Sidebar Updated Successfully!");
