import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building2, Layers } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SALES':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WAREHOUSE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ACCOUNTS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const orgName = user?.organization?.name;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">Nexus ERP + CRM</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Multi-Tenant SaaS Operations Portal</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            {orgName && (
              <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>{orgName}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 border-r border-slate-200 pr-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-slate-800 leading-none">{user.name}</div>
                <div className="text-xs text-slate-500 mt-1">{user.email}</div>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-1 text-slate-600 hover:text-red-600 text-sm font-medium transition-colors px-2 py-1.5 rounded-md hover:bg-slate-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
