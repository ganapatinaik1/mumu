import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Mail, Lock, User, AtSign, Loader2, Sparkles, Check, X } from 'lucide-react';
import { signUpUser } from '../services/auth';
import { checkUsernameAvailability } from '../services/profile';
import { useAuth } from '../hooks/useAuth';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { isConfigured } = useAuth();

  // Form Fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'invalid' | 'taken'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Real-time username validation
  useEffect(() => {
    if (!isConfigured) return;
    
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    // Client-side validation: 3-20 chars, lowercase, numbers, underscores
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      setUsernameStatus('invalid');
      setUsernameError('3-20 chars, lowercase numbers/underscores only');
      return;
    }

    setUsernameError(null);
    setUsernameStatus('checking');

    // Debounce username uniqueness check
    const delayDebounceFn = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(cleanUsername);
        if (isAvailable) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        setUsernameStatus('available'); // Fallback if API fails to prevent blocking signup
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username, isConfigured]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Final checks
    if (usernameStatus === 'invalid' || usernameStatus === 'taken') {
      setRegError('Please choose a valid & unique username.');
      return;
    }

    if (password.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await signUpUser(
        email.trim(),
        password,
        username.toLowerCase().trim(),
        displayName.trim()
      );
      
      setRegSuccess(true);
      // Wait a couple of seconds before sending to login or home
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error('Signup error:', err);
      // Parse friendly messages from Supabase or triggers
      if (err.message.includes('unique_username')) {
        setRegError('This username is already taken (DB verification).');
      } else {
        setRegError(err.message || 'An error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-radial-gradient py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full glass-card music-glow rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative">
          <div className="bg-purple-900/30 p-4 rounded-2xl border border-purple-500/20 mb-3 animate-pulse">
            <Music className="h-8 w-8 text-purple-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white font-outfit tracking-tight">
            Create Account
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            Join the premium music experience
          </p>
        </div>

        {regSuccess ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-950/40 border border-green-500/30 mb-4">
              <Check className="h-8 w-8 text-green-400 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Registration Successful!</h3>
            <p className="text-zinc-400 text-sm">
              Account created. If required, check your email for a validation link, or logging in automatically...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative">
            {regError && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                <X className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <AtSign className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  disabled={loading}
                  className="block w-full pl-10 pr-10 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                />
                
                {/* Username state icons */}
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="h-4 w-4 text-green-400" />
                  )}
                  {(usernameStatus === 'invalid' || usernameStatus === 'taken') && (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {usernameError && (
                <p className="text-[11px] text-red-400 mt-1.5 ml-1">{usernameError}</p>
              )}
              {!usernameError && usernameStatus === 'available' && (
                <p className="text-[11px] text-green-400 mt-1.5 ml-1">Username is available</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                  className="block w-full pl-10 py-3 bg-neutral-900/60 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Email Address <span className="text-red-500">*</span>
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Password <span className="text-red-500">*</span>
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Confirm Password <span className="text-red-500">*</span>
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
              className="mt-2 w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-purple-500/10 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Sparkles className="-ml-1 mr-2 h-4 w-4" />
                  Sign Up
                </>
              )}
            </button>

            <div className="text-center text-xs text-zinc-500 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-purple-400 hover:text-purple-300 hover:underline transition-all">
                Log In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
