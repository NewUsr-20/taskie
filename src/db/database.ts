import Dexie, { type EntityTable } from 'dexie';

export interface Subtask { id: string; title: string; isCompleted: boolean; }
export interface Task { id: string; title: string; description?: string; isCompleted: boolean; priority: number; createdAt: Date; dueDate?: Date; listId?: string; tags?: string[]; subtasks?: Subtask[]; isAllDay?: boolean; }
export interface List { id: string; name: string; type: 'task' | 'note'; }
export interface Tag { id: string; name: string; }
export interface SavedFilter { id: string; name: string; status: string; priority: string; listId: string; tag: string; }
export interface Note { id: string; title: string; content: string; listId: string; updatedAt: Date; }
// NEW: Trash table structure
export interface TrashItem { id: string; type: 'task' | 'list' | 'tag'; payload: any; deletedAt: Date; }

const db = new Dexie('TickTickCloneDB_v6') as Dexie & {
  tasks: EntityTable<Task, 'id'>; lists: EntityTable<List, 'id'>;
  tags: EntityTable<Tag, 'id'>; filters: EntityTable<SavedFilter, 'id'>;
  notes: EntityTable<Note, 'id'>; trash: EntityTable<TrashItem, 'id'>;
};

db.version(1).stores({ 
  tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags', 
  lists: 'id, name, type', tags: 'id, name', filters: 'id, name', notes: 'id, listId, updatedAt',
  trash: 'id, type, deletedAt' // NEW
});

export { db };