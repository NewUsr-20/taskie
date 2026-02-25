const fs = require("fs");
const path = require("path");

// 1. UPDATE TASK STORE: Intercept every delete globally with window.confirm()
const storeCode = `import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database';
import type { Task, SavedFilter, Note } from '../../db/database';

interface TaskState {
  addTask: (title: string, dueDate?: Date, listId?: string, tags?: string[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>; toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addList: (name: string, type?: 'task'|'note') => Promise<void>; deleteList: (id: string) => Promise<void>;
  addTag: (name: string) => Promise<void>; deleteTag: (id: string, name: string) => Promise<void>;
  assignTagToTask: (taskId: string, tagName: string) => Promise<void>;
  saveFilter: (filter: Omit<SavedFilter, 'id'>) => Promise<void>; deleteSavedFilter: (id: string) => Promise<void>;
  addNote: (title: string, listId: string) => Promise<void>; updateNote: (id: string, updates: Partial<Note>) => Promise<void>; deleteNote: (id: string) => Promise<void>;
  restoreTrashItem: (id: string) => Promise<void>; permanentlyDeleteTrashItem: (id: string) => Promise<void>; emptyTrash: () => Promise<void>;
}

export const useTaskStore = create<TaskState>(() => ({
  addTask: async (title, dueDate, listId, tags = []) => {
    try {
      for (const tag of tags) { const exists = await db.tags.where('name').equals(tag).first(); if (!exists) await db.tags.add({ id: uuidv4(), name: tag }); }
      await db.tasks.add({ id: uuidv4(), title, isCompleted: false, priority: 0, createdAt: new Date(), dueDate: dueDate ? new Date(dueDate) : undefined, listId, tags, subtasks: [] });
    } catch (error) { console.error(error); }
  },
  updateTask: async (id, updates) => { await db.tasks.update(id, updates).catch(console.error); },
  toggleTask: async (id, currentStatus) => { await db.tasks.update(id, { isCompleted: !currentStatus }).catch(console.error); },
  
  // GLOBAL CONFIRMATIONS ADDED
  deleteTask: async (id) => {
    if (!window.confirm("Move this task to the Trash?")) return;
    const task = await db.tasks.get(id);
    if (task) {
      await db.trash.add({ id: uuidv4(), type: 'task', payload: task, deletedAt: new Date() });
      await db.tasks.delete(id).catch(console.error);
    }
  },
  
  addList: async (name, type = 'task') => { await db.lists.add({ id: uuidv4(), name, type }).catch(console.error); },
  
  // CASCADING DELETE LOGIC FOR LISTS
  deleteList: async (id) => { 
    if (!window.confirm("Delete this folder? All tasks and notes inside will also be moved to the Trash.")) return;
    const list = await db.lists.get(id);
    if (list) {
      await db.trash.add({ id: uuidv4(), type: 'list', payload: list, deletedAt: new Date() });
      
      // Cascade Delete Tasks
      const listTasks = await db.tasks.where('listId').equals(id).toArray();
      for (const t of listTasks) {
         await db.trash.add({ id: uuidv4(), type: 'task', payload: t, deletedAt: new Date() });
         await db.tasks.delete(t.id);
      }
      // Cascade Delete Notes
      const listNotes = await db.notes.where('listId').equals(id).toArray();
      for (const n of listNotes) {
         await db.trash.add({ id: uuidv4(), type: 'note', payload: n, deletedAt: new Date() });
         await db.notes.delete(n.id);
      }
      
      await db.lists.delete(id); 
    }
  },

  addTag: async (name) => { const exists = await db.tags.where('name').equals(name).first(); if (!exists) await db.tags.add({ id: uuidv4(), name }); },
  deleteTag: async (id, name) => { 
    if (!window.confirm(\`Delete the tag #\${name}? It will be removed from all tasks.\`)) return;
    const tag = await db.tags.get(id);
    if (tag) {
      await db.trash.add({ id: uuidv4(), type: 'tag', payload: tag, deletedAt: new Date() });
      const tasks = await db.tasks.where('tags').equals(name).toArray(); 
      for (const t of tasks) await db.tasks.update(t.id, { tags: t.tags?.filter(tg => tg !== name) || [] }); 
      await db.tags.delete(id); 
    }
  },

  assignTagToTask: async (taskId, tagName) => {
    const task = await db.tasks.get(taskId); if (!task) return; const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) { await db.tasks.update(taskId, { tags: [...currentTags, tagName] }); const exists = await db.tags.where('name').equals(tagName).first(); if (!exists) await db.tags.add({ id: uuidv4(), name: tagName }); }
  },

  saveFilter: async (filter) => { await db.filters.add({ id: uuidv4(), ...filter }).catch(console.error); },
  deleteSavedFilter: async (id) => { 
    if (!window.confirm("Delete this saved filter?")) return;
    await db.filters.delete(id).catch(console.error); 
  },

  addNote: async (title, listId) => { await db.notes.add({ id: uuidv4(), title, content: '', listId, updatedAt: new Date() }).catch(console.error); },
  updateNote: async (id, updates) => { await db.notes.update(id, { ...updates, updatedAt: new Date() }).catch(console.error); },
  deleteNote: async (id) => { 
    if (!window.confirm("Move this note to the Trash?")) return;
    const note = await db.notes.get(id);
    if (note) {
      await db.trash.add({ id: uuidv4(), type: 'note', payload: note, deletedAt: new Date() });
      await db.notes.delete(id).catch(console.error); 
    }
  },

  restoreTrashItem: async (id) => {
    const item = await db.trash.get(id);
    if (!item) return;
    try {
      if (item.type === 'task') await db.tasks.add(item.payload);
      if (item.type === 'list') await db.lists.add(item.payload);
      if (item.type === 'tag') await db.tags.add(item.payload);
      if (item.type === 'note') await db.notes.add(item.payload);
      await db.trash.delete(id);
    } catch (e) { console.error("Restore failed:", e); }
  },
  permanentlyDeleteTrashItem: async (id) => { 
    if (!window.confirm("Permanently delete this item? This cannot be undone.")) return;
    await db.trash.delete(id); 
  },
  emptyTrash: async () => { 
    if (!window.confirm("Empty the trash? ALL items will be permanently deleted.")) return;
    await db.trash.clear(); 
  }
}));`;

fs.writeFileSync(path.join(process.cwd(), 'src/features/tasks/taskStore.ts'), storeCode);

// 2. UPDATE TRASH VIEW: Properly render Notes and Lists
const trashViewCode = `import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useTaskStore } from '../tasks/taskStore';
import { Trash2, RotateCcw, XCircle, ListTodo, Hash, CheckSquare, AlertCircle, FileText } from 'lucide-react';

export default function TrashView() {
  const trashItems = useLiveQuery(() => db.trash.toArray()) || [];
  const { restoreTrashItem, permanentlyDeleteTrashItem, emptyTrash } = useTaskStore();

  const sortedItems = [...trashItems].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  const getIcon = (type) => {
    if (type === 'task') return <CheckSquare className="w-5 h-5 text-blue-500" />;
    if (type === 'list') return <ListTodo className="w-5 h-5 text-indigo-500" />;
    if (type === 'tag') return <Hash className="w-5 h-5 text-purple-500" />;
    if (type === 'note') return <FileText className="w-5 h-5 text-teal-500" />;
    return <AlertCircle className="w-5 h-5 text-gray-400" />;
  };

  const getTitle = (item) => {
    if (item.type === 'task') return item.payload.title;
    if (item.type === 'list') return item.payload.name;
    if (item.type === 'tag') return '#' + item.payload.name;
    if (item.type === 'note') return item.payload.title;
    return 'Unknown Item';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-500" /> Trash Bin
        </h2>
        {sortedItems.length > 0 && (
          <button onClick={emptyTrash} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md text-sm font-semibold transition-colors">
            <XCircle className="w-4 h-4" /> Empty Trash
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sortedItems.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-md shadow-sm border border-gray-100">
                {getIcon(item.type)}
              </div>
              <div className="flex flex-col">
                <span className="text-gray-800 font-medium line-through decoration-gray-300">{getTitle(item)}</span>
                <span className="text-xs text-gray-400">
                  Deleted {new Date(item.deletedAt).toLocaleString()} • {item.type.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => restoreTrashItem(item.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
              <button 
                onClick={() => permanentlyDeleteTrashItem(item.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}

        {sortedItems.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center justify-center text-gray-400">
            <Trash2 className="w-16 h-16 opacity-20 mb-4" />
            <p className="text-lg font-medium">Your trash is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/features/trash/TrashView.tsx'), trashViewCode);

// 3. SURGICAL FIX: Add confirmation to Subtask deletes inside TaskDetails.tsx
const detailsPath = path.join(process.cwd(), 'src/features/tasks/TaskDetails.tsx');
let detailsCode = fs.readFileSync(detailsPath, 'utf8');
detailsCode = detailsCode.replace(
  "const deleteSubtask = (subtaskId: string) => updateTask(taskId, { subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId) });",
  "const deleteSubtask = (subtaskId: string) => { if(window.confirm('Delete this subtask?')) updateTask(taskId, { subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId) }); };"
);
fs.writeFileSync(detailsPath, detailsCode);

console.log("✅ Confirmation Dialogs & Cascading Trash are active!");
