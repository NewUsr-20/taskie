import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Search, X, CheckSquare, FileText, Folder, Hash } from 'lucide-react';

export default function GlobalSearch({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');

  const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const allNotes = useLiveQuery(() => db.notes.toArray()) || [];
  const allLists = useLiveQuery(() => db.lists.toArray()) || [];
  const allTags = useLiveQuery(() => db.tags.toArray()) || [];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const res = [];

    allTasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        res.push({ type: 'task', id: t.id, title: t.title, subtitle: t.description?.substring(0, 50) || 'Task', item: t });
      }
    });
    allNotes.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        res.push({ type: 'note', id: n.id, title: n.title, subtitle: n.content?.substring(0, 50) || 'Note', item: n });
      }
    });
    allLists.forEach(l => {
      if (l.name.toLowerCase().includes(q)) {
        res.push({ type: 'list', id: l.id, title: l.name, subtitle: l.type === 'note' ? 'Note Folder' : 'Task Folder', item: l });
      }
    });
    allTags.forEach(t => {
      if (t.name.toLowerCase().includes(q)) {
        res.push({ type: 'tag', id: t.id, title: '#' + t.name, subtitle: 'Tag', item: t });
      }
    });

    return res.slice(0, 15); // Limit to top 15 results
  }, [query, allTasks, allNotes, allLists, allTags]);

  if (!isOpen) return null;

  const handleSelect = (result) => {
    onNavigate(result);
    setQuery('');
    onClose();
  };

  const getIcon = (type) => {
    if (type === 'task') return <CheckSquare className="w-4 h-4 text-blue-500" />;
    if (type === 'note') return <FileText className="w-4 h-4 text-indigo-500" />;
    if (type === 'list') return <Folder className="w-4 h-4 text-teal-500" />;
    if (type === 'tag') return <Hash className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] bg-gray-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            autoFocus 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search tasks, notes, folders, and tags..." 
            className="flex-1 text-lg bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-md text-xs font-bold px-2">ESC</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="text-center py-10 text-gray-400 text-sm">Start typing to search your workspace...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No results found for "{query}"</div>
          ) : (
            <div className="space-y-1">
              {results.map((res, i) => (
                <div 
                  key={i} 
                  onClick={() => handleSelect(res)}
                  className="flex items-center gap-4 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded-md">{getIcon(res.type)}</div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-sm font-semibold text-gray-800 truncate">{res.title}</span>
                    <span className="text-xs text-gray-400 truncate">{res.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}