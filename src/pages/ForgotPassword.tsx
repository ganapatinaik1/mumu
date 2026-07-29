import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Send, Check, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from '../services/auth';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(email.trim());
      setSuccessMsg('Recovery email sent. Check your inbox (and spam folder) for instructions.');
      setEmail('');
    } catch (err: any) {
      console.error('Password reset email error:', err);
      setErrorMsg(err.message || 'Unable to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-radial-gradient py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full glass-card music-glow rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="mb-6 relative">
          <Link to="/login" className="inline-flex items-center text-xs font-semibold text-zinc-400 hover:text-white transition-all space-x-1.5 float-left mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Login</span>
          </Link>
          <div className="clear-both"></div>
        </div>

        <div className="flex flex-col items-center mb-8 relative">
          <h2 className="text-3xl font-extrabold text-white font-outfit tracking-tight">
            Reset Password
          </h2>
          <p className="text-zinc-400 text-sm mt-2 text-center">
            Enter your email to receive a secure recovery configuration link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {errorMsg && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg ? (
            <div className="bg-green-950/40 border border-green-500/30 text-green-200 p-4 rounded-xl text-xs flex flex-col items-center text-center space-y-3.5 animate-fadeIn">
              <div className="bg-green-950/60 p-2 rounded-full border border-green-500/30">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <span className="font-medium">{successMsg}</span>
            </div>
          ) : (
            <>
              {/* Email Address */}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-purple-500/10 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <Send className="-ml-1 mr-2 h-3.5 w-3.5" />
                    Send Reset Link
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
