import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Mail, Lock, Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../services/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    try {
      await loginUser(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message.includes('Invalid login credentials')) {
        setLoginError('Invalid email or password. Please verify and try again.');
      } else {
        setLoginError(err.message || 'An error occurred during authentication.');
      }
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
          <div className="bg-purple-900/30 p-4 rounded-2xl border border-purple-500/20 mb-3 animate-pulse">
            <Music className="h-8 w-8 text-purple-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white font-outfit tracking-tight">
            Welcome Back
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            Login to access your music catalog
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {loginError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="block w-full pl-10 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-purple-400 hover:text-purple-300 hover:underline transition-all">
                Forgot password?
              </Link>
            </div>
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                 <Lock className="h-4 w-4" />
               </div>
               <input
                 id="password"
                 name="password"
                 type={showPassword ? 'text' : 'password'}
                 required
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="••••••••"
                 disabled={loading}
                 className="block w-full pl-10 pr-10 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
               >
                 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </button>
             </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-purple-500/10 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="-ml-1 mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </button>

          <div className="text-center text-xs text-zinc-500 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-purple-400 hover:text-purple-300 hover:underline transition-all">
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
