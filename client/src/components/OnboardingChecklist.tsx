import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Building2,
  Users,
  Package,
  UserPlus,
  FileText,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface OnboardingChecklistProps {
  customerCount: number;
  productCount: number;
  memberCount: number;
  challanCount: number;
  onOpenCustomerModal?: () => void;
  onOpenProductModal?: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  customerCount,
  productCount,
  memberCount,
  challanCount,
  onOpenCustomerModal,
  onOpenProductModal,
}) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('erp_onboarding_dismissed') === 'true';
  });

  if (dismissed) return null;

  const steps = [
    {
      id: 'org',
      title: 'Organization Created',
      description: 'Your multi-tenant ERP workspace is live',
      completed: true, // Always true since user registered
      icon: Building2,
      action: null,
    },
    {
      id: 'customer',
      title: 'Add First Customer',
      description: 'Register a business lead or retail customer',
      completed: customerCount > 0,
      icon: Users,
      action: { label: 'Add Customer', path: '/customers' },
    },
    {
      id: 'product',
      title: 'Add First Product',
      description: 'Populate your catalog with SKUs & prices',
      completed: productCount > 0,
      icon: Package,
      action: { label: 'Add Product', path: '/products' },
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Add sales reps, warehouse staff & accounts',
      completed: memberCount > 1,
      icon: UserPlus,
      action: { label: 'Manage Team', path: '/settings/team' },
    },
    {
      id: 'challan',
      title: 'Create First Challan',
      description: 'Issue a sales challan and auto-deduct stock',
      completed: challanCount > 0,
      icon: FileText,
      action: { label: 'Create Challan', path: '/challans/new' },
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isFullyComplete = completedCount === steps.length;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('erp_onboarding_dismissed', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 rounded-2xl border border-red-800/40 p-6 text-white shadow-xl relative overflow-hidden space-y-5">
      {/* Background Decorative Blur */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-700/30 border border-red-500/40 rounded-xl text-red-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white flex items-center space-x-2">
              <span>Setup Your Workspace</span>
              <span className="text-xs bg-red-500/20 text-red-300 border border-red-400/30 px-2.5 py-0.5 rounded-full font-semibold">
                {completedCount}/{steps.length} Steps
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete these quick setup tasks to unlock the full potential of your SaaS ERP
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          title="Dismiss Onboarding Checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>Onboarding Progress</span>
          <span className="text-red-300 font-semibold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className="bg-gradient-to-r from-red-600 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Steps List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
        {steps.map((s) => {
          const StepIcon = s.icon;
          return (
            <div
              key={s.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                s.completed
                  ? 'bg-slate-800/40 border-emerald-500/30 text-slate-300'
                  : 'bg-slate-800/80 border-slate-700 text-white hover:border-red-500/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-1.5 rounded-lg ${
                      s.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-700/20 text-red-400'
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>
                  {s.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold text-white leading-snug">{s.title}</div>
                  <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{s.description}</div>
                </div>
              </div>

              {s.action && !s.completed && (
                <Link
                  to={s.action.path}
                  className="mt-2 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center space-x-1 group pt-1"
                >
                  <span>{s.action.label}</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
