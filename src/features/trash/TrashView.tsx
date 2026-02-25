import { useLiveQuery } from 'dexie-react-hooks';
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
}