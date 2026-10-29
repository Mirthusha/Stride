import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import {
  ArrowRight,
  Zap,
  Kanban,
  Target,
  Clock,
  Sparkles,
  ShieldCheck,
  CircleDollarSign,
  TestTubes
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col font-sans selection:bg-mint-200">
      <AmbientBackground />

      {/* Top Navigation */}
      <header className="w-full border-b border-emerald-950/10 bg-mint-50/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-white shadow-sm">
              <span className="font-bold text-base">S</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900">Stride</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-700">
            <a href="#features" className="hover:text-zinc-950 transition-colors">Features</a>
            <a href="#governance" className="hover:text-zinc-950 transition-colors">Agile Governance</a>
            <a href="#qa-finance" className="hover:text-zinc-950 transition-colors">Quality & Finance</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/app/dashboard"
                className="btn-pill-primary text-xs flex items-center gap-1.5"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-pill-subtle text-xs font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-pill-primary text-xs flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center flex-1 flex flex-col items-center justify-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-emerald-950/15 shadow-sm text-xs font-medium text-emerald-950 mb-8 backdrop-blur-sm animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Professional Agile Project Management Platform</span>
        </div>

        {/* Minimalist Bold Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-950 leading-[1.08] mb-6">
          Agile project intelligence,{' '}
          <span className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-700 bg-clip-text text-transparent">
            refined.
          </span>
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-zinc-600 mb-10 leading-relaxed font-normal">
          Plan iterative sprints, manage product backlogs, synchronize interactive Kanban workflows, and govern quality engineering with genuine database persistence.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link
            to={user ? '/app/dashboard' : '/signup'}
            className="btn-pill-primary px-8 py-3 text-sm flex items-center gap-2 shadow-soft hover:shadow-card"
          >
            <span>{user ? 'Open Workspace' : 'Create Free Account'}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={user ? '/app/board' : '/login'}
            className="btn-pill-outline px-6 py-3 text-sm flex items-center gap-2"
          >
            <Kanban className="h-4 w-4" />
            <span>{user ? 'Go to Kanban Board' : 'Sign In'}</span>
          </Link>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-2">
            Practical Agile Tools
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-sans">
            Built for software development teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sprints */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft hover:shadow-card transition-all">
            <div className="h-10 w-10 rounded-2xl bg-mint-200 text-emerald-900 flex items-center justify-center mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">Sprint Lifecycle & Rollover</h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              Plan sprints with date integrity, capacity calculations, single active sprint constraints, and automated task rollover.
            </p>
            <Link to="/app/sprints" className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1">
              <span>Sprint Planning</span> &rarr;
            </Link>
          </div>

          {/* Card 2: Kanban */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft hover:shadow-card transition-all">
            <div className="h-10 w-10 rounded-2xl bg-mint-200 text-emerald-900 flex items-center justify-center mb-4">
              <Kanban className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">Interactive Kanban Board</h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              Drag-and-drop cards between To Do, In Progress, QA, and Done with instantaneous backend persistence and card order synchronization.
            </p>
            <Link to="/app/board" className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1">
              <span>Kanban Board</span> &rarr;
            </Link>
          </div>

          {/* Card 3: Backlog & Epics */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft hover:shadow-card transition-all">
            <div className="h-10 w-10 rounded-2xl bg-mint-200 text-emerald-900 flex items-center justify-center mb-4">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">Product Backlog & Epics</h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-4">
              Prioritize User Stories, Tasks, and Bugs with story points, epic progress tracking, and sprint assignment.
            </p>
            <Link to="/app/backlog" className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1">
              <span>Backlog & Epics</span> &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Governance & QA Section */}
      <section id="governance" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/70 border border-emerald-950/10">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-2">Role-Based Governance</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Enforce role permissions across Workspace Admin, Product Owner, Scrum Master, and Developer accounts.
            </p>
          </div>

          <div id="qa-finance" className="p-6 rounded-3xl bg-white/70 border border-emerald-950/10">
            <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center mb-4">
              <TestTubes className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-2">QA & Test Execution</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Manage test suites, execute test runs, track defects, and monitor test pass rates linked directly to work items.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 border border-emerald-950/10">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-2">Time & Expense Tracking</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Track live task durations with an active timer, log project expenses, and oversee project budgets.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-950/10 bg-mint-50/80 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 font-sans">Stride</span>
            <span>— Agile Project Management Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/app/dashboard" className="hover:text-zinc-900">Dashboard</Link>
            <Link to="/app/board" className="hover:text-zinc-900">Kanban</Link>
            <Link to="/app/backlog" className="hover:text-zinc-900">Backlog</Link>
            <Link to="/app/team" className="hover:text-zinc-900">Team</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
