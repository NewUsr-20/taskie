const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), 'src/components/GlobalSearch.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace the bad path with the correct one
code = code.replace(
  `import { db } from '../../db/database';`,
  `import { db } from '../db/database';`
);

fs.writeFileSync(filePath, code);
console.log("✅ Import path fixed! Omni-Search should now be working perfectly.");
