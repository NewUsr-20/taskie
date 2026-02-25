const fs = require("fs");
const path = require("path");

const calendarCode = `import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin from "@fullcalendar/interaction";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/database";
import { useTaskStore } from "./taskStore";

export default function CalendarView() {
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const { updateTask, addTask } = useTaskStore();

  const events = tasks?.map((task) => {
    // BUG FIX: If we explicitly saved it as an all-day task, respect that. 
    // Otherwise, tasks without a due date default to all-day.
    const isAllDay = task.isAllDay !== undefined ? task.isAllDay : !task.dueDate;
    
    return {
      id: task.id,
      title: task.title,
      start: task.dueDate || task.createdAt,
      allDay: isAllDay, 
      backgroundColor: task.isCompleted ? "#10B981" : "#3B82F6",
      borderColor: task.isCompleted ? "#10B981" : "#3B82F6",
      classNames: task.isCompleted ? ["opacity-60", "line-through"] : ["shadow-sm", "rounded-md", "border-0", "px-1"],
    };
  }) || [];

  const handleEventDrop = (info) => {
    if (info.event.start) {
      // BUG FIX: Capture both the new time AND whether it was dropped in the all-day zone
      updateTask(info.event.id, { 
        dueDate: info.event.start,
        isAllDay: info.event.allDay 
      });
    }
  };

  const handleEventResize = (info) => {
    if (info.event.start) {
      updateTask(info.event.id, {
        dueDate: info.event.start,
        isAllDay: info.event.allDay
      });
    }
  };

  const handleDateClick = (info) => {
    const timeString = info.allDay 
      ? info.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      : info.date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      
    const title = prompt(\`Add a task for \${timeString}:\`);
    
    if (title && title.trim()) {
      // Add the task. FullCalendar will handle it gracefully.
      addTask(title.trim(), info.date);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 mt-2">
      <div className="calendar-container custom-calendar">
        <style dangerouslySetInnerHTML={{__html: \`
          .custom-calendar .fc-theme-standard td, .custom-calendar .fc-theme-standard th { border-color: #f1f5f9; }
          .custom-calendar .fc-col-header-cell { padding: 12px 0; background-color: #f8fafc; color: #475569; font-weight: 600; }
          .custom-calendar .fc-v-event { border-radius: 6px; border: none; padding: 2px 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .custom-calendar .fc-event-title { font-weight: 500; font-size: 0.85rem; }
          .custom-calendar .fc-button-primary { background-color: #eff6ff !important; color: #2563eb !important; border-color: transparent !important; text-transform: capitalize; font-weight: 600; }
          .custom-calendar .fc-button-active { background-color: #2563eb !important; color: white !important; }
        \`}} />
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: "prev,next today", center: "title", right: "multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
          views={{ multiMonthYear: { buttonText: "Year" }, dayGridMonth: { buttonText: "Month" }, timeGridWeek: { buttonText: "Week" }, timeGridDay: { buttonText: "Day" }, listWeek: { buttonText: "Agenda" } }}
          events={events}
          height="80vh"
          nowIndicator={true}
          editable={true}
          selectable={true}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
        />
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/features/calendar/CalendarView.tsx'), calendarCode);
console.log("✅ All-Day Drag Fixed! Tasks will now stay exactly where you drop them.");
