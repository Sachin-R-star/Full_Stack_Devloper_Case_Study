import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building2, Layers, UserCheck, Settings, ChevronDown, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SALES':
        return 'bg-red-100 text-red-800 border-red-200';
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
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-red-700 text-white p-2 rounded-xl shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">Nexus ERP + CRM</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Multi-Tenant SaaS Operations Portal</p>
          </div>
        </div>

        {/* User Workspace Profile & Menu */}
        {user && (
          <div className="flex items-center space-x-3" ref={dropdownRef}>
            {orgName && (
              <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                <Building2 className="h-3.5 w-3.5 text-red-700" />
                <span>{orgName}</span>
              </div>
            )}

            {/* Profile Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-red-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-bold text-slate-800">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">{user.role}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu Overlay */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 text-xs space-y-1">
                  {/* User Profile Banner */}
                  <div className="px-4 py-3 border-b border-slate-100 space-y-1">
                    <div className="font-bold text-slate-900 text-sm leading-none">{user.name}</div>
                    <div className="text-slate-500 font-mono text-[11px] truncate">{user.email}</div>
                    <div className="pt-1">
                      <span className={`px-2 py-0.5 rounded-full font-semibold border text-[10px] ${getRoleBadgeColor(user.role)}`}>
                        {user.role} PERMISSIONS
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1">
                    <Link
                      to="/settings/team"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-red-700 transition-colors"
                    >
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      <span>Team Members</span>
                    </Link>

                    <Link
                      to="/settings/organization"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-red-700 transition-colors"
                    >
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>Organization Settings</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-2 text-red-600 hover:bg-red-50 font-semibold transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
