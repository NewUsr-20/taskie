const fs = require("fs");
const path = require("path");

// 1. Create the Supabase Client File
const supabaseFile = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;

fs.writeFileSync(path.join(process.cwd(), 'src/db/supabase.ts'), supabaseFile);

// 2. Create the .env.local file
const envFile = `VITE_SUPABASE_URL="PASTE_YOUR_URL_HERE"
VITE_SUPABASE_ANON_KEY="PASTE_YOUR_ANON_KEY_HERE"
`;

if (!fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  fs.writeFileSync(path.join(process.cwd(), '.env.local'), envFile);
  console.log("✅ Created src/db/supabase.ts and .env.local file!");
} else {
  console.log("✅ Created src/db/supabase.ts! (.env.local already exists)");
}
