import { create } from 'zustand';
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
    if (!window.confirm(`Delete the tag #${name}? It will be removed from all tasks.`)) return;
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
}));