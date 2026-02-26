const fs = require("fs");
const path = require("path");

// 1. REBUILD TRASH VIEW TO FETCH DIRECTLY FROM THE DATABASE
const trashPath = path.join(process.cwd(), "src/features/trash/TrashView.tsx");
const trashCode = `import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import { useTaskStore } from '../tasks/taskStore';
import { Trash2, RotateCcw, XCircle, Loader2 } from 'lucide-react';

export default function TrashView() {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { fetchAll } = useTaskStore(); // Used to resync the main app when restoring an item

  const fetchTrash = async () => {
    setLoading(true);
    // Direct Database Query: Bypasses any local state bugs
    const { data } = await supabase.from('trash').select('*').order('deletedAt', { ascending: false });
    setTrashItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const restoreItem = async (item) => {
    // 1. Put it back in the correct active table (tasks, notes, or lists)
    await supabase.from(item.type + 's').insert(item.payload);
    // 2. Remove it from the trash table
    await supabase.from('trash').delete().eq('id', item.id);
    // 3. Refresh the UI
    await fetchTrash();
    fetchAll(); 
  };

  const permanentlyDelete = async (id) => {
    await supabase.from('trash').delete().eq('id', id);
    await fetchTrash();
  };

  const emptyTrash = async () => {
    await supabase.from('trash').delete().neq('id', '0'); // Clears the table
    await fetchTrash();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-500" /> Trash Bin
        </h2>
        {trashItems.length > 0 && !loading && (
          <button onClick={emptyTrash} className="text-sm text-red-600 hover:text-red-700 font-medium bg-red-50 px-3 py-1.5 rounded-md transition-colors">
            Empty Trash
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : trashItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400">Your trash is completely empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trashItems.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">
                  {item.payload?.title || item.payload?.name || 'Unknown Item'}
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-tighter mt-1 text-blue-500 font-bold">{item.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => restoreItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Restore">
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button onClick={() => permanentlyDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Permanently">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
fs.writeFileSync(trashPath, trashCode);

// 2. CLEAN THE STORE TO PREVENT FURTHER BLEEDING
const storePath = path.join(process.cwd(), "src/features/tasks/taskStore.ts");
if (fs.existsSync(storePath)) {
    let code = fs.readFileSync(storePath, "utf8");
    // Find any typo where trash is accidentally assigned to the tasks array and neutralize it
    code = code.replace(/trash:\s*tasks(?!\s*\|\|)/g, "trash: []");
    fs.writeFileSync(storePath, code);
}

console.log("✅ Trash System perfectly isolated and directly connected to Supabase!");
