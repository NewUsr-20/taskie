import { useState } from 'react';
import { useTaskStore } from '../tasks/taskStore';
import { Plus, Trash2, FileText, Clock } from 'lucide-react';

export default function NotesView({ listId, listName, activeNoteId, setActiveNoteId }) {
  const { notes: allNotes, addNote, updateNote, deleteNote } = useTaskStore();
  const notes = [...allNotes].filter(n => n.listId === listId).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  // Lifted to App level for search navigation
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const activeNote = notes?.find(n => n.id === activeNoteId);

  const handleAdd = (e) => {
    e.preventDefault();
    if(newNoteTitle.trim()) { addNote(newNoteTitle.trim(), listId); setNewNoteTitle(''); }
  };

  return (
    <div className="flex h-[80vh] max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* LEFT PANE: Note Directory */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500"/> {listName}</h2>
        </div>
        <form onSubmit={handleAdd} className="p-3 border-b border-gray-100 flex gap-2">
          <input type="text" value={newNoteTitle} onChange={e=>setNewNoteTitle(e.target.value)} placeholder="New note title..." className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-md outline-none focus:border-indigo-400 transition-colors"/>
          <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-3 rounded-md"><Plus className="w-4 h-4"/></button>
        </form>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes?.map(note => (
            <div key={note.id} onClick={()=>setActiveNoteId(note.id)} className={`group flex flex-col justify-center p-3 rounded-lg cursor-pointer transition-colors ${activeNoteId === note.id ? 'bg-indigo-100 text-indigo-900 shadow-sm' : 'hover:bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold truncate">{note.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); if(activeNoteId===note.id) setActiveNoteId(null); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {new Date(note.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
          {notes?.length === 0 && <div className="text-center text-xs text-gray-400 mt-10">No notes in this folder yet.</div>}
        </div>
      </div>
      
      {/* RIGHT PANE: Note Editor */}
      <div className="w-2/3 flex flex-col bg-white relative">
        {activeNote ? (
          <>
            <div className="px-8 py-6 border-b border-gray-100">
               <input 
                 type="text" 
                 value={activeNote.title} 
                 onChange={(e) => updateNote(activeNote.id, { title: e.target.value })} 
                 className="text-2xl font-bold text-gray-800 w-full outline-none bg-transparent"
               />
            </div>
            <textarea 
              className="flex-1 px-8 py-6 outline-none resize-none text-gray-700 leading-relaxed bg-transparent" 
              placeholder="Start writing..."
              value={activeNote.content || ''}
              onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="font-medium">Select a note to start writing</p>
          </div>
        )}
      </div>
    </div>
  );
}