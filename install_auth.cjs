const fs = require("fs");
const path = require("path");

const authDir = path.join(process.cwd(), 'src/features/auth');
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

// 1. CREATE THE LOGIN/SIGNUP COMPONENT
const authCode = `import { useState } from 'react';
import { supabase } from '../../db/supabase';
import { CheckSquare, Mail, Lock, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Success! Check your email to confirm your account (or just log in if email confirmation is disabled in Supabase).');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 mb-4"><CheckSquare className="w-12 h-12" /></div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLogin ? 'Welcome back' : 'Create your workspace'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleAuth}>
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">{error}</div>}
            {message && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-100">{message}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border outline-none" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border outline-none" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }} className="text-sm text-blue-600 hover:text-blue-500 font-medium">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}`;
fs.writeFileSync(path.join(authDir, 'Auth.tsx'), authCode);

// 2. ADD SIGN OUT BUTTON TO SIDEBAR
const sidebarPath = path.join(process.cwd(), 'src/components/Sidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

// Inject LogOut icon
sidebarCode = sidebarCode.replace(
  `FolderPlus, Search } from 'lucide-react';`,
  `FolderPlus, Search, LogOut } from 'lucide-react';`
);
// Import Supabase
sidebarCode = sidebarCode.replace(
  `import { useTaskStore } from '../features/tasks/taskStore';`,
  `import { useTaskStore } from '../features/tasks/taskStore';\nimport { supabase } from '../db/supabase';`
);
// Add the logout button below the trash button
const logoutHTML = `
        {/* NEW: LOG OUT */}
        <div className="pt-2 border-t border-gray-200 mt-2">
           <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all">
             <LogOut className="w-5 h-5 text-gray-400" />
             <span className="text-sm font-medium">Sign Out</span>
           </button>
        </div>
      </div>
    </aside>
`;
sidebarCode = sidebarCode.replace(/<\/div>\s*<\/aside>/g, logoutHTML);
fs.writeFileSync(sidebarPath, sidebarCode);

// 3. SECURE THE APP (Check for Session before showing workspace)
const appPath = path.join(process.cwd(), 'src/App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

appCode = appCode.replace(
  `import { useTaskStore } from './features/tasks/taskStore';`,
  `import { useTaskStore } from './features/tasks/taskStore';\nimport { supabase } from './db/supabase';\nimport Auth from './features/auth/Auth';`
);

appCode = appCode.replace(
  `const [isSearchOpen, setIsSearchOpen] = useState(false);`,
  `const [isSearchOpen, setIsSearchOpen] = useState(false);\n  const [session, setSession] = useState(null);`
);

// Add auth listener hook inside App component
const authHook = `
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);
`;
appCode = appCode.replace(`// 1. Fetch data from Supabase on mount`, `${authHook}\n\n  // 1. Fetch data from Supabase on mount`);

// Prevent data fetching if not logged in
appCode = appCode.replace(
  `useEffect(() => { \n    if (!initialized) fetchAll(); \n  }, [initialized, fetchAll]);`,
  `useEffect(() => { \n    if (session && !initialized) fetchAll(); \n  }, [session, initialized, fetchAll]);`
);

// Add the Auth Block logic before the loading screen check
appCode = appCode.replace(
  `// NOW we can safely do the early return for the loading screen!`,
  `// If no user is logged in, show the Auth Screen\n  if (!session) return <Auth />;\n\n  // NOW we can safely do the early return for the loading screen!`
);

fs.writeFileSync(appPath, appCode);
console.log("✅ Authentication Interface Installed and Secured!");
