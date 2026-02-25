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
import { useTaskStore } from "../tasks/taskStore";

export default function CalendarView() {
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const { updateTask, addTask } = useTaskStore();

  // 1. Map Dexie tasks to FullCalendar event objects
  const events = tasks?.map((task) => ({
    id: task.id,
    title: task.title,
    start: task.dueDate || task.createdAt, 
    // If it has a specific time, don't make it an "all day" block
    allDay: !task.dueDate, 
    backgroundColor: task.isCompleted ? "#10B981" : "#3B82F6",
    borderColor: task.isCompleted ? "#10B981" : "#3B82F6",
    classNames: task.isCompleted ? ["opacity-60", "line-through"] : ["shadow-sm", "rounded-md", "border-0", "px-1"],
  })) || [];

  // 2. Drag-to-Reschedule: When you drop an event on a new time/day
  const handleEventDrop = (info) => {
    if (info.event.start) {
      updateTask(info.event.id, { dueDate: info.event.start });
    }
  };

  // 3. Click-to-Add: Click any empty slot on the calendar to instantly add a task there
  const handleDateClick = (info) => {
    // Format the time nicely for the prompt
    const timeString = info.date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const title = prompt(\`Add a task for \${timeString}:\`);
    
    if (title && title.trim()) {
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
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            multiMonthPlugin,
            interactionPlugin // INJECTED: Enables mouse/touch interaction
          ]}
          initialView="timeGridWeek" // Default to Week view so you can see time slots clearly
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          views={{
            multiMonthYear: { buttonText: "Year" },
            dayGridMonth: { buttonText: "Month" },
            timeGridWeek: { buttonText: "Week" },
            timeGridDay: { buttonText: "Day" },
            listWeek: { buttonText: "Agenda" },
          }}
          events={events}
          height="80vh"
          nowIndicator={true} // Shows a red line for the current time
          editable={true} // MAGIC: Allows dragging events around
          selectable={true}
          dateClick={handleDateClick} // MAGIC: Clicking empty slots adds tasks
          eventDrop={handleEventDrop} // MAGIC: Updates database on drop
          slotMinTime="06:00:00" // Hide the middle of the night to save screen space
          slotMaxTime="23:00:00"
        />
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(process.cwd(), 'src/features/calendar/CalendarView.tsx'), calendarCode);
console.log("📅 Interactive Calendar Upgrade Complete!");
