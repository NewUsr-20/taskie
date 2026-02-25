const fs = require("fs");
const path = require("path");

const dbCode = `import Dexie, { type EntityTable } from 'dexie';

export interface Subtask { id: string; title: string; isCompleted: boolean; }
export interface Task {
  id: string; title: string; description?: string; isCompleted: boolean;
  priority: number; createdAt: Date; dueDate?: Date; listId?: string;
  tags?: string[]; subtasks?: Subtask[];
}
export interface List { id: string; name: string; }
export interface Tag { id: string; name: string; }
export interface SavedFilter {
  id: string; name: string; status: string; priority: string; listId: string; tag: string;
}

// Bumping to v3 to completely bypass the browser's database lock
const db = new Dexie('TickTickCloneDB_v3') as Dexie & {
  tasks: EntityTable<Task, 'id'>; lists: EntityTable<List, 'id'>;
  tags: EntityTable<Tag, 'id'>; filters: EntityTable<SavedFilter, 'id'>;
};

db.version(1).stores({ 
  tasks: 'id, title, isCompleted, priority, createdAt, dueDate, listId, *tags', 
  lists: 'id, name', 
  tags: 'id, name', 
  filters: 'id, name' 
});

export { db };`;

fs.writeFileSync(path.join(process.cwd(), 'src/db/database.ts'), dbCode);
console.log("✅ Database unlocked and upgraded to v3!");
