import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  History,
  PlusCircle,
  ShieldCheck,
  Building2,
  UserCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      label: 'Customer CRM',
      path: '/customers',
      icon: Users,
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
    {
      label: 'Products Catalog',
      path: '/products',
      icon: Package,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      label: 'Stock Audit Movements',
      path: '/inventory',
      icon: History,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      label: 'Sales Challans',
      path: '/challans',
      icon: FileText,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      label: 'Team Members',
      path: '/settings/team',
      icon: UserCheck,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      label: 'Organization Settings',
      path: '/settings/organization',
      icon: Building2,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
  ];

  const orgName = user?.organization?.name || 'Workspace';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-57px)] flex flex-col justify-between p-4 no-print flex-shrink-0">
      <div className="space-y-6">
        {/* Workspace Organization Badge */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Tenant Workspace</div>
            <div className="text-xs font-bold text-white truncate">{orgName}</div>
          </div>
        </div>

        <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Portal Navigation
        </div>
        <nav className="space-y-1">
          {navItems
            .filter((item) => !user || item.roles.includes(user.role))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Actions
            </div>
            <NavLink
              to="/challans/new"
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Sales Challan</span>
            </NavLink>
          </div>
        )}
      </div>

      <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-xs text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 font-medium text-slate-200">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          <span>Active Role Session</span>
        </div>
        <p className="text-[11px] leading-tight">
          Permissions: <span className="font-semibold text-white uppercase">{user?.role}</span>
        </p>
      </div>
    </aside>
  );
};
