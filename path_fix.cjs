const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), 'src/features/calendar/CalendarView.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace the bad import path with the correct one
code = code.replace(
  `import { useTaskStore } from "./taskStore";`, 
  `import { useTaskStore } from "../tasks/taskStore";`
);

fs.writeFileSync(filePath, code);
console.log("✅ Import path fixed! Calendar should be visible now.");
