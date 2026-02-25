const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), 'src/features/tasks/TaskList.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// The exact function we accidentally deleted
const missingFunction = `
  const handleTextChange = (e) => {
    const text = e.target.value; 
    setNewTaskTitle(text);
    const parsed = chrono.parse(text);
    setDetectedDate(parsed.length > 0 ? { date: parsed[0].start.date(), text: parsed[0].text } : null);
    const matches = [...text.matchAll(/#(\\w+)/g)].map(m => m[1]);
    setDetectedTags(matches);
  };
`;

// Find where handleAdd is, and inject handleTextChange right before it
if (!code.includes("const handleTextChange")) {
  code = code.replace("const handleAdd = (e) => {", missingFunction + "\n  const handleAdd = (e) => {");
  fs.writeFileSync(filePath, code);
  console.log("✅ Successfully injected handleTextChange! The app will now reload.");
} else {
  console.log("⚠️ handleTextChange is already in the file. No changes made.");
}
