import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { UserRole } from '../types';
import { ArrowRight, AlertCircle } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('Developer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName) return;
    try {
      setLoading(true);
      setError(null);
      await signup(email, displayName, role);
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 selection:bg-mint-200">
      <AmbientBackground />

      <div className="glass-panel-elevated w-full max-w-md rounded-4xl p-8 border border-emerald-950/15 shadow-elevated animate-fade-in">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-white shadow-sm transition-transform group-hover:scale-105">
              <span className="font-bold text-base">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 font-sans">
              Stride
            </span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 font-sans">Create an Account</h1>
          <p className="text-xs text-zinc-500 mt-1">Join Stride for collaborative Agile management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              className="w-full text-xs px-4 py-2.5 rounded-2xl bg-white/90 border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@company.com"
              className="w-full text-xs px-4 py-2.5 rounded-2xl bg-white/90 border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Initial Agile Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-xs px-4 py-2.5 rounded-2xl bg-white/90 border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            >
              <option value="Developer">Developer</option>
              <option value="ScrumMaster">Scrum Master</option>
              <option value="ProductOwner">Product Owner</option>
              <option value="WorkspaceAdmin">Workspace Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs px-4 py-2.5 rounded-2xl bg-white/90 border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-pill-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Creating Account...' : 'Get Started'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-900 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
