const fs = require("fs");
const path = require("path");

// 1. CREATE THE GLOBAL SEARCH COMPONENT
const searchCode = `import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
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
}`;
fs.writeFileSync(path.join(process.cwd(), 'src/components/GlobalSearch.tsx'), searchCode);

// 2. UPDATE NOTESVIEW (Lift activeNoteId state so Search can control it)
const notesViewPath = path.join(process.cwd(), 'src/features/notes/NotesView.tsx');
let notesViewCode = fs.readFileSync(notesViewPath, 'utf8');
notesViewCode = notesViewCode.replace(
  `export default function NotesView({ listId, listName }) {`,
  `export default function NotesView({ listId, listName, activeNoteId, setActiveNoteId }) {`
);
notesViewCode = notesViewCode.replace(
  `const [activeNoteId, setActiveNoteId] = useState(null);`,
  `// Lifted to App level for search navigation`
);
fs.writeFileSync(notesViewPath, notesViewCode);

// 3. UPDATE SIDEBAR (Add Search Button)
const sidebarPath = path.join(process.cwd(), 'src/components/Sidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
sidebarCode = sidebarCode.replace(
  `import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter, SlidersHorizontal, LayoutGrid, FileText, FolderPlus } from 'lucide-react';`,
  `import { Inbox, Hash, ListTodo, Trash2, Calendar, Sun, Sunrise, CalendarRange, Plus, Filter, SlidersHorizontal, LayoutGrid, FileText, FolderPlus, Search } from 'lucide-react';`
);
sidebarCode = sidebarCode.replace(
  `export default function Sidebar({ activeView, setActiveView, activeListId, setActiveListId, activeTagName, setActiveTagName, activeFilterId, setActiveFilterId }) {`,
  `export default function Sidebar({ activeView, setActiveView, activeListId, setActiveListId, activeTagName, setActiveTagName, activeFilterId, setActiveFilterId, onOpenSearch }) {`
);
sidebarCode = sidebarCode.replace(
  `{/* TOP NAVIGATION */}`,
  `{/* SEARCH BAR */}\n        <button onClick={onOpenSearch} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 shadow-sm transition-all mb-6 group">\n          <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />\n          <span className="text-sm">Search...</span>\n          <span className="ml-auto text-[10px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">Ctrl K</span>\n        </button>\n\n        {/* TOP NAVIGATION */}`
);
fs.writeFileSync(sidebarPath, sidebarCode);

// 4. UPDATE APP (Integrate Search, Routing, and Keyboard Shortcuts)
const appCode = `import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DndContext, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import TaskList from './features/tasks/TaskList';
import CalendarView from './features/calendar/CalendarView';
import EisenhowerMatrix from './features/matrix/EisenhowerMatrix';
import NotesView from './features/notes/NotesView';
import Sidebar from './components/Sidebar';
import TaskDetails from './features/tasks/TaskDetails';
import GlobalSearch from './components/GlobalSearch';
import { useTaskStore } from './features/tasks/taskStore';
import { db } from './db/database';

export default function App() {
  const [activeView, setActiveView] = useState('list');
  const [activeListId, setActiveListId] = useState(null);
  const [activeTagName, setActiveTagName] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState(null);
  
  // Lifted selection states
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { updateTask, assignTagToTask } = useTaskStore();
  const activeList = useLiveQuery(() => activeListId ? db.lists.get(activeListId) : Promise.resolve(null), [activeListId]);

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Global Keyboard Shortcut for Search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event; if (!over) return;
    const taskId = active.id; const targetType = over.data.current?.type;
    if (targetType === 'list') { updateTask(taskId, { listId: String(over.id).replace('list-', '') }); } 
    else if (targetType === 'tag') { assignTagToTask(taskId, over.data.current.name); }
    else if (targetType === 'matrix') { updateTask(taskId, { priority: Number(String(over.id).replace('matrix-', '')) }); }
  };

  // Teleportation Engine (Routes search clicks to the exact location)
  const handleSearchNavigation = (result) => {
    if (result.type === 'task') {
      setActiveView('list');
      setActiveListId(result.item.listId || null);
      setActiveTagName(null);
      setActiveTaskId(result.id);
    } else if (result.type === 'note') {
      setActiveView('list');
      setActiveListId(result.item.listId);
      setActiveNoteId(result.id);
    } else if (result.type === 'list') {
      setActiveView('list');
      setActiveListId(result.id);
    } else if (result.type === 'tag') {
      setActiveView('tag');
      setActiveTagName(result.item.name);
      setActiveListId(null);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-[#f3f4f6] font-sans relative">
        <Sidebar 
          activeView={activeView} setActiveView={setActiveView}
          activeListId={activeListId} setActiveListId={setActiveListId}
          activeTagName={activeTagName} setActiveTagName={setActiveTagName}
          activeFilterId={activeFilterId} setActiveFilterId={setActiveFilterId}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeView === 'calendar' ? <CalendarView /> : 
           activeView === 'matrix' ? <EisenhowerMatrix activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} /> :
           (activeView === 'list' && activeList?.type === 'note') ? <NotesView listId={activeList.id} listName={activeList.name} activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId} /> :
           <TaskList activeView={activeView} activeListId={activeListId} activeTagName={activeTagName} activeFilterId={activeFilterId} activeTaskId={activeTaskId} onSelectTask={setActiveTaskId} setActiveView={setActiveView} />
          }
        </main>
        
        {activeTaskId && activeList?.type !== 'note' && activeView !== 'calendar' && activeView !== 'matrix' && (
          <TaskDetails taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
        )}

        <GlobalSearch 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onNavigate={handleSearchNavigation} 
        />
      </div>
    </DndContext>
  );
}`;
fs.writeFileSync(path.join(process.cwd(), 'src/App.tsx'), appCode);

console.log("✅ Omni-Search Installed! Press Ctrl+K to test it out.");
