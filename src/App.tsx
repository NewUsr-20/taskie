import { useState, useEffect } from 'react';
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
}