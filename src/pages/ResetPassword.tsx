import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { updatePassword } from '../services/auth';
import { useAuth } from '../hooks/useAuth';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = setTimeout(() => {
      if (!user) {
        setErrorMsg('Unauthorized access. Please click the reset link in your email to authenticate first.');
      }
    }, 1500);
    return () => clearTimeout(checkUser);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(false);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } catch (err: any) {
      console.error('Password update error:', err);
      setErrorMsg(err.message || 'Unable to update password. Try initiating reset forgot password again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-radial-gradient py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full glass-card music-glow rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative">
          <h2 className="text-3xl font-extrabold text-white font-outfit tracking-tight">
            New Credentials
          </h2>
          <p className="text-zinc-400 text-sm mt-3 text-center">
            Set your new account password below
          </p>
        </div>

        {success ? (
          <div className="text-center py-6 animate-fadeIn">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-950/40 border border-green-500/30 mb-4 animate-scaleIn">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Password Updated!</h3>
            <p className="text-zinc-400 text-sm">
              Your password has been successfully reset. Redirecting you to home...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative">
            {errorMsg && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="block w-full pl-10 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="block w-full pl-10 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !user}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-purple-500/10 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating password...
                </>
              ) : (
                <>
                  <Sparkles className="-ml-1 mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
