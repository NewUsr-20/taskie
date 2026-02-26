import { useState } from 'react';
import { supabase } from '../../db/supabase';
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const [view, setView] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Success! Check your email to confirm your account.');
      } else if (view === 'forgot') {
        // Supabase sends a recovery email that logs the user in when clicked
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Password reset email sent! Click the link in your email to log in securely, then go to Profile Settings to type a new password.');
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
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg border-4 border-white">
            <span className="text-4xl font-black tracking-tighter">RAK's</span>
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
          {view === 'login' ? "Welcome to RAK's" : view === 'signup' ? "Join RAK's Workspace" : 'Reset Password'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleAuth}>
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">{error}</div>}
            {message && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-100 leading-relaxed">{message}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5 border outline-none bg-gray-50 focus:bg-white transition-colors" placeholder="you@example.com" />
              </div>
            </div>

            {/* Only show password field if we are NOT on the forgot password screen */}
            {view !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5 border outline-none bg-gray-50 focus:bg-white transition-colors" placeholder="••••••••" />
                </div>
              </div>
            )}

            {view === 'login' && (
              <div className="flex items-center justify-end">
                <button type="button" onClick={() => { setView('forgot'); setError(null); setMessage(null); }} className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot your password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link')}
            </button>
          </form>

          <div className="mt-6 text-center">
            {view === 'forgot' ? (
              <button onClick={() => { setView('login'); setError(null); setMessage(null); }} className="text-sm text-gray-500 hover:text-gray-800 font-semibold flex items-center justify-center gap-1 mx-auto transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
            ) : (
              <button onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }} className="text-sm text-gray-500 hover:text-gray-800 font-semibold transition-colors">
                {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}