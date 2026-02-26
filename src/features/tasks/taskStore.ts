import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';

export const useTaskStore = create((set, get) => ({
  tasks: [], lists: [], tags: [], filters: [], notes: [], trash: [], initialized: false,
  
  fetchAll: async () => {
    try {
      const [t, l, tg, f, n, tr] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('lists').select('*'),
        supabase.from('tags').select('*'),
        supabase.from('filters').select('*'),
        supabase.from('notes').select('*'),
        supabase.from('trash').select('*')
      ]);
      set({ tasks: t.data||[], lists: l.data||[], tags: tg.data||[], filters: f.data||[], notes: n.data||[], trash: tr.data||[], initialized: true });
    } catch (e) { console.error("Supabase Connection Error:", e); }
  },

  addTask: async (title, dueDate, listId, tags = []) => {
    const newTask = { id: uuidv4(), title, isCompleted: false, priority: 0, createdAt: new Date().toISOString(), dueDate: dueDate ? new Date(dueDate).toISOString() : null, listId, tags, subtasks: [] };
    set(state => ({ tasks: [...state.tasks, newTask] }));
    await supabase.from('tasks').insert(newTask);
    
    // Check and create missing tags globally
    tags.forEach(async (tagName) => {
      if (!get().tags.find(t => t.name === tagName)) {
        const newTag = { id: uuidv4(), name: tagName };
        set(state => ({ tags: [...state.tags, newTag] }));
        await supabase.from('tags').insert(newTag);
      }
    });
  },
  updateTask: async (id, updates) => {
    set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }));
    await supabase.from('tasks').update(updates).eq('id', id);
  },
  toggleTask: async (id, currentStatus) => {
    set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, isCompleted: !currentStatus } : t) }));
    await supabase.from('tasks').update({ isCompleted: !currentStatus }).eq('id', id);
  },
 deleteTask: async (id) => {
    const taskToDelete = get().tasks.find((t) => t.id === id);
    if (taskToDelete) {
      // 1. Copy the task into the Supabase trash table
      await supabase.from('trash').insert({
        id: taskToDelete.id,
        type: 'task',
        payload: taskToDelete
      });
      
      // 2. Delete it from the active tasks table
      await supabase.from('tasks').delete().eq('id', id);
      
      // 3. Remove it from your local screen
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
  },
  
  addList: async (name, type = 'task') => {
    const newList = { id: uuidv4(), name, type };
    set(state => ({ lists: [...state.lists, newList] }));
    await supabase.from('lists').insert(newList);
  },
  deleteList: async (id) => {
    if (!window.confirm("Delete this folder? All tasks and notes inside will be moved to the Trash.")) return;
    const list = get().lists.find(l => l.id === id);
    if (list) {
      const trashItem = { id: uuidv4(), type: 'list', payload: list, deletedAt: new Date().toISOString() };
      const listTasks = get().tasks.filter(t => t.listId === id);
      const listNotes = get().notes.filter(n => n.listId === id);

      set(state => ({
        lists: state.lists.filter(l => l.id !== id), tasks: state.tasks.filter(t => t.listId !== id), notes: state.notes.filter(n => n.listId !== id),
        trash: [...state.trash, trashItem, ...listTasks.map(t => ({id:uuidv4(), type:'task', payload:t, deletedAt: new Date().toISOString()})), ...listNotes.map(n => ({id:uuidv4(), type:'note', payload:n, deletedAt: new Date().toISOString()}))]
      }));

      await supabase.from('trash').insert(trashItem);
      if(listTasks.length) await Promise.all(listTasks.map(t => supabase.from('trash').insert({ id: uuidv4(), type: 'task', payload: t, deletedAt: new Date().toISOString() })));
      if(listNotes.length) await Promise.all(listNotes.map(n => supabase.from('trash').insert({ id: uuidv4(), type: 'note', payload: n, deletedAt: new Date().toISOString() })));

      await supabase.from('lists').delete().eq('id', id);
      if(listTasks.length) await supabase.from('tasks').delete().eq('listId', id);
      if(listNotes.length) await supabase.from('notes').delete().eq('listId', id);
    }
  },

  addTag: async (name) => {
    const exists = get().tags.find(t => t.name === name);
    if (!exists) {
      const newTag = { id: uuidv4(), name };
      set(state => ({ tags: [...state.tags, newTag] }));
      await supabase.from('tags').insert(newTag);
    }
  },
  deleteTag: async (id, name) => {
    if (!window.confirm(`Delete the tag #${name}?`)) return;
    const tag = get().tags.find(t => t.id === id);
    if (tag) {
      const trashItem = { id: uuidv4(), type: 'tag', payload: tag, deletedAt: new Date().toISOString() };
      set(state => ({
        tags: state.tags.filter(t => t.id !== id),
        tasks: state.tasks.map(t => ({...t, tags: t.tags?.filter(tg => tg !== name) || []})),
        trash: [...state.trash, trashItem]
      }));
      await supabase.from('trash').insert(trashItem);
      await supabase.from('tags').delete().eq('id', id);
      
      const affectedTasks = get().tasks.filter(t => t.tags?.includes(name));
      await Promise.all(affectedTasks.map(t => supabase.from('tasks').update({ tags: t.tags.filter(tg => tg !== name) }).eq('id', t.id)));
    }
  },
  assignTagToTask: async (taskId, tagName) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagName)) {
       const newTags = [...currentTags, tagName];
       set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, tags: newTags } : t) }));
       await supabase.from('tasks').update({ tags: newTags }).eq('id', taskId);
       get().addTag(tagName);
    }
  },

  saveFilter: async (filter) => {
    const newFilter = { id: uuidv4(), ...filter };
    set(state => ({ filters: [...state.filters, newFilter] }));
    await supabase.from('filters').insert(newFilter);
  },
  deleteSavedFilter: async (id) => {
    if (!window.confirm("Delete this saved filter?")) return;
    set(state => ({ filters: state.filters.filter(f => f.id !== id) }));
    await supabase.from('filters').delete().eq('id', id);
  },

  addNote: async (title, listId) => {
    const newNote = { id: uuidv4(), title, content: '', listId, updatedAt: new Date().toISOString() };
    set(state => ({ notes: [...state.notes, newNote] }));
    await supabase.from('notes').insert(newNote);
  },
  updateNote: async (id, updates) => {
    const updated = { ...updates, updatedAt: new Date().toISOString() };
    set(state => ({ notes: state.notes.map(n => n.id === id ? { ...n, ...updated } : n) }));
    await supabase.from('notes').update(updated).eq('id', id);
  },
  deleteNote: async (id) => {
    if (!window.confirm("Move this note to the Trash?")) return;
    const note = get().notes.find(n => n.id === id);
    if (note) {
      const trashItem = { id: uuidv4(), type: 'note', payload: note, deletedAt: new Date().toISOString() };
      set(state => ({ notes: state.notes.filter(n => n.id !== id), trash: [...state.trash, trashItem] }));
      await supabase.from('trash').insert(trashItem);
      await supabase.from('notes').delete().eq('id', id);
    }
  },

  restoreTrashItem: async (id) => {
    const item = get().trash.find(t => t.id === id);
    if (!item) return;
    set(state => ({ trash: state.trash.filter(t => t.id !== id) }));
    await supabase.from('trash').delete().eq('id', id);
    if (item.type === 'task') { set(state => ({ tasks: [...state.tasks, item.payload] })); await supabase.from('tasks').insert(item.payload); }
    if (item.type === 'list') { set(state => ({ lists: [...state.lists, item.payload] })); await supabase.from('lists').insert(item.payload); }
    if (item.type === 'tag') { set(state => ({ tags: [...state.tags, item.payload] })); await supabase.from('tags').insert(item.payload); }
    if (item.type === 'note') { set(state => ({ notes: [...state.notes, item.payload] })); await supabase.from('notes').insert(item.payload); }
  },
  permanentlyDeleteTrashItem: async (id) => {
    if (!window.confirm("Permanently delete this item?")) return;
    set(state => ({ trash: state.trash.filter(t => t.id !== id) }));
    await supabase.from('trash').delete().eq('id', id);
  },
  emptyTrash: async () => {
    if (!window.confirm("Empty the trash? ALL items will be permanently deleted.")) return;
    const ids = get().trash.map(t => t.id);
    set({ trash: [] });
    if (ids.length) await supabase.from('trash').delete().in('id', ids);
  }
}));