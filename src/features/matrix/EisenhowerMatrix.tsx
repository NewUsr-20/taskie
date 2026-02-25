import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, GripVertical, AlertTriangle, CalendarClock, Users, Trash } from 'lucide-react';
import { db } from '../../db/database';
import { useTaskStore } from '../tasks/taskStore';

function DraggableMatrixTask({ task, activeTaskId, onSelectTask, toggleTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task, type: 'task' } });
  const style = { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.6 : 1, touchAction: 'none' };
  
  return (
    <div ref={setNodeRef} style={style} onClick={() => onSelectTask(task.id)} className={`flex items-start gap-2 p-2.5 bg-white rounded-lg shadow-sm border cursor-pointer transition-all ${activeTaskId === task.id ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100 hover:border-gray-200'}`}>
      <div {...listeners} {...attributes} className="cursor-grab hover:bg-gray-100 p-0.5 rounded text-gray-400 mt-0.5"><GripVertical className="w-3.5 h-3.5" /></div>
      <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.isCompleted); }} className="mt-0.5 flex-shrink-0">
        {task.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-blue-500" />}
      </button>
      <div className="flex flex-col overflow-hidden">
        <span className={`text-sm font-medium truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</span>
      </div>
    </div>
  );
}

function Quadrant({ priorityLevel, title, description, icon, colorClass, tasks, activeTaskId, onSelectTask, toggleTask }) {
  const { isOver, setNodeRef } = useDroppable({ id: `matrix-${priorityLevel}`, data: { type: 'matrix' } });
  
  return (
    <div ref={setNodeRef} className={`flex flex-col h-[350px] rounded-xl border-2 p-4 transition-all ${colorClass} ${isOver ? 'ring-4 ring-opacity-40 scale-[1.02] shadow-lg' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 font-medium mb-4">{description}</p>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {tasks.map(t => <DraggableMatrixTask key={t.id} task={t} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />)}
        {tasks.length === 0 && <div className="text-center text-sm text-gray-400/70 mt-10 border-2 border-dashed border-gray-200/50 rounded-lg p-4">Drag tasks here</div>}
      </div>
    </div>
  );
}

export default function EisenhowerMatrix({ activeTaskId, onSelectTask }) {
  // Only fetch active (uncompleted) tasks for the matrix to keep it actionable
  const allTasks = useLiveQuery(() => db.tasks.filter(t => !t.isCompleted).toArray(), []) || [];
  const { toggleTask } = useTaskStore();

  const p3Tasks = allTasks.filter(t => t.priority === 3);
  const p2Tasks = allTasks.filter(t => t.priority === 2);
  const p1Tasks = allTasks.filter(t => t.priority === 1);
  const p0Tasks = allTasks.filter(t => t.priority === 0);

  return (
    <div className="max-w-5xl mx-auto p-2">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Eisenhower Matrix</h2>
        <p className="text-gray-500 text-sm mt-1">Drag and drop tasks between quadrants to instantly update their priority.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Quadrant priorityLevel={3} title="Do First" description="Urgent & Important (P3)" icon={<AlertTriangle className="w-5 h-5 text-red-500" />} colorClass="bg-red-50/50 border-red-100 ring-red-400" tasks={p3Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
        <Quadrant priorityLevel={2} title="Schedule" description="Important, Not Urgent (P2)" icon={<CalendarClock className="w-5 h-5 text-orange-500" />} colorClass="bg-orange-50/50 border-orange-100 ring-orange-400" tasks={p2Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
        <Quadrant priorityLevel={1} title="Delegate" description="Urgent, Not Important (P1)" icon={<Users className="w-5 h-5 text-blue-500" />} colorClass="bg-blue-50/50 border-blue-100 ring-blue-400" tasks={p1Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
        <Quadrant priorityLevel={0} title="Eliminate" description="Not Urgent, Not Important (None)" icon={<Trash className="w-5 h-5 text-gray-400" />} colorClass="bg-gray-50/80 border-gray-200 ring-gray-400" tasks={p0Tasks} activeTaskId={activeTaskId} onSelectTask={onSelectTask} toggleTask={toggleTask} />
      </div>
    </div>
  );
}