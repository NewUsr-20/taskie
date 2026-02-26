const fs = require("fs");
const path = require("path");

const profileDir = path.join(process.cwd(), 'src/features/profile');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

// 1. CREATE THE PROFILE VIEW COMPONENT
const profileCode = `import { useState, useEffect } from 'react';
import { supabase } from '../../db/supabase';
import { User, Key, ShieldCheck, Loader2 } from 'lucide-react';

export default function ProfileView() {
  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email);
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true); setError(null); setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
        <div className="p-3 bg-blue-50 rounded-full">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Account Profile</h2>
          <p className="text-sm text-gray-500">Manage your security and account settings</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Email Display */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Account Details</h3>
          <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 flex items-center justify-between">
            <span className="text-gray-600 text-sm font-medium">Email Address</span>
            <span className="text-gray-900 font-bold">{userEmail || 'Loading...'}</span>
          </div>
        </div>

        {/* Password Change Form */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Security
          </h3>
          <form onSubmit={handleUpdatePassword} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">{error}</div>}
            {message && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-100">{message}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key className="h-4 w-4 text-gray-400" /></div>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border outline-none bg-gray-50 focus:bg-white transition-colors" placeholder="Enter new password" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key className="h-4 w-4 text-gray-400" /></div>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border outline-none bg-gray-50 focus:bg-white transition-colors" placeholder="Confirm new password" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-50 mt-4">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}`;
fs.writeFileSync(path.join(profileDir, 'ProfileView.tsx'), profileCode);

// 2. UPDATE SIDEBAR.TSX TO ADD PROFILE BUTTON
const sidebarPath = path.join(process.cwd(), 'src/components/Sidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

// Inject User icon
sidebarCode = sidebarCode.replace(
  `FolderPlus, Search, LogOut } from 'lucide-react';`,
  `FolderPlus, Search, LogOut, User } from 'lucide-react';`
);

// Add the Profile button right above the LogOut button
const profileButtonHTML = `
        {/* NEW: PROFILE VIEW */}
        <div className="pt-2 border-t border-gray-200 mt-auto">
           <button onClick={() => setActiveView('profile')} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all \${activeView === 'profile' ? 'bg-blue-100 text-blue-700 shadow-sm font-semibold' : 'text-gray-600 hover:bg-gray-100'}\`}>
             <User className={\`w-5 h-5 \${activeView === 'profile' ? 'text-blue-600' : 'text-gray-400'}\`} />
             <span className="text-sm">Profile Settings</span>
           </button>
        </div>
`;
sidebarCode = sidebarCode.replace(
  `<div className="pt-2 border-t border-gray-200 mt-2">\n           <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}`,
  `${profileButtonHTML}\n        <div className="pt-1 mt-1">\n           <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}`
);
fs.writeFileSync(sidebarPath, sidebarCode);

// 3. UPDATE APP.TSX TO ROUTE TO PROFILE VIEW
const appPath = path.join(process.cwd(), 'src/App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

appCode = appCode.replace(
  `import Auth from './features/auth/Auth';`,
  `import Auth from './features/auth/Auth';\nimport ProfileView from './features/profile/ProfileView';`
);

appCode = appCode.replace(
  `{activeView === 'calendar' ? <CalendarView /> :`,
  `{activeView === 'profile' ? <ProfileView /> : \n           activeView === 'calendar' ? <CalendarView /> :`
);

fs.writeFileSync(appPath, appCode);
console.log("✅ Profile View & Password Reset Installed!");
