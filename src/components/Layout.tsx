import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Grid2x2,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  const canViewDashboard = user.role === 'ADMIN' || user.role === 'AUDITOR';
  const canManageUsers = user.role === 'ADMIN';

  const navItems = [
    { to: '/', label: 'Warehouse Map', icon: Grid2x2, visible: true },
    { to: '/shuttle', label: 'Shuttle Status', icon: Bot, visible: true },
    {
      to: '/dashboard',
      label: 'Auditor Dashboard',
      icon: BarChart3,
      visible: canViewDashboard,
    },
    {
      to: '/admin/users',
      label: 'User Admin',
      icon: Users,
      visible: canManageUsers,
    },
  ].filter((item) => item.visible);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeClass =
    user.role === 'ADMIN'
      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
      : user.role === 'AUDITOR'
        ? 'bg-amber-100 text-amber-900 border-amber-200'
        : 'bg-emerald-100 text-emerald-900 border-emerald-200';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold">
              5×5
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base leading-tight">
                WMS Floor Control
              </p>
              <p className="text-xs text-slate-400 hidden sm:block">
                Automated Shuttle Storage &amp; Audit
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-medium" data-testid="current-username">
                {user.username}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${roleBadgeClass}`}
                data-testid="current-user-role"
              >
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-rose-600/90 text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-200">{user.username}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${roleBadgeClass}`}>
                {user.role}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-slate-800 text-white' : 'text-slate-300'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-slate-800 text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
