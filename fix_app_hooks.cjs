const fs = require("fs");
const path = require("path");

const appCode = `import { useState, useEffect } from 'react';
import { DndContext, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import TaskList from './features/tasks/TaskList';
import CalendarView from './features/calendar/CalendarView';
import EisenhowerMatrix from './features/matrix/EisenhowerMatrix';
import NotesView from './features/notes/NotesView';
import Sidebar from './components/Sidebar';
import TaskDetails from './features/tasks/TaskDetails';
import GlobalSearch from './components/GlobalSearch';
import { useTaskStore } from './features/tasks/taskStore';

export default function App() {
  const [activeView, setActiveView] = useState('list');
  const [activeListId, setActiveListId] = useState(null);
  const [activeTagName, setActiveTagName] = useState(null);
  const [activeFilterId, setActiveFilterId] = useState(null);
  
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ALL HOOKS MUST BE CALLED AT THE TOP!
  const { updateTask, assignTagToTask, lists, initialized, fetchAll } = useTaskStore();
  const activeList = lists.find(l => l.id === activeListId) || null;

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // 1. Fetch data from Supabase on mount
  useEffect(() => { 
    if (!initialized) fetchAll(); 
  }, [initialized, fetchAll]);

  // 2. Global Keyboard Shortcut for Search (Ctrl+K or Cmd+K)
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

  const handleSearchNavigation = (result) => {
    if (result.type === 'task') {
      setActiveView('list'); setActiveListId(result.item.listId || null); setActiveTagName(null); setActiveTaskId(result.id);
    } else if (result.type === 'note') {
      setActiveView('list'); setActiveListId(result.item.listId); setActiveNoteId(result.id);
    } else if (result.type === 'list') {
      setActiveView('list'); setActiveListId(result.id);
    } else if (result.type === 'tag') {
      setActiveView('tag'); setActiveTagName(result.item.name); setActiveListId(null);
    }
  };

  // NOW we can safely do the early return for the loading screen!
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f3f4f6] text-gray-500 font-medium">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        Connecting to Cloud Workspace...
      </div>
    );
  }

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
console.log("✅ App.tsx fixed! The React Hook order is now correct.");
