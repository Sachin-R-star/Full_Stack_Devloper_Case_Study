import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Building2,
  Users,
  Package,
  FileText,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  Clock,
} from 'lucide-react';

interface SubscriptionData {
  subscription: {
    id: string;
    plan: 'FREE' | 'PRO' | 'BUSINESS';
    status: string;
    startDate: string;
    renewalDate?: string;
    externalSubscriptionId?: string;
  };
  limits: {
    maxUsers: number;
    maxCustomers: number;
    maxProducts: number;
    maxChallansMonth: number;
    advancedReports: boolean;
  };
  usage: {
    users: number;
    customers: number;
    products: number;
    monthlyChallans: number;
  };
}

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organization/subscription');
      setData(res.data);
    } catch (err: any) {
      console.error('Error fetching subscription details:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handlePlanChange = async (newPlan: 'FREE' | 'PRO' | 'BUSINESS') => {
    if (updating || data?.subscription.plan === newPlan) return;
    setUpdating(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.put('/organization/subscription', { plan: newPlan });
      setSuccessMsg(`Plan updated successfully to ${newPlan}!`);
      fetchSubscription();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subscription plan.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500 text-sm font-medium">
        Loading billing & subscription parameters...
      </div>
    );
  }

  const currentPlan = data?.subscription.plan || 'FREE';
  const limits = data?.limits;
  const usage = data?.usage;

  const plans = [
    {
      id: 'FREE',
      name: 'Starter (Free)',
      price: '₹0',
      period: 'Forever free',
      description: 'Ideal for small businesses testing ERP workflows',
      badge: 'Current Default',
      features: [
        'Up to 2 Team Members',
        'Up to 10 Customers',
        'Up to 20 Catalog Products',
        '50 Monthly Sales Challans',
        'Standard Reports & PDF Export',
      ],
    },
    {
      id: 'PRO',
      name: 'Growth (Pro)',
      price: '₹1,999',
      period: 'per month',
      description: 'For growing trading businesses needing team scale',
      badge: 'Most Popular',
      popular: true,
      features: [
        'Up to 10 Team Members',
        'Up to 250 Customers',
        'Up to 500 Catalog Products',
        '1,000 Monthly Sales Challans',
        'Advanced Analytics & Reports',
        'Priority Technical Support',
      ],
    },
    {
      id: 'BUSINESS',
      name: 'Enterprise (Business)',
      price: '₹4,999',
      period: 'per month',
      description: 'Unlimited capacity for multi-warehouse operations',
      badge: 'Scale',
      features: [
        'Up to 100 Team Members',
        'Up to 10,000 Customers',
        'Up to 50,000 Catalog Products',
        '100,000 Monthly Sales Challans',
        'Custom Roles & Audit Logs',
        'Dedicated Account Manager',
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <span>Billing & Subscription Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your organization tier, view resource usage, and upgrade plan entitlements
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-4 rounded-xl border border-red-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-4 rounded-xl border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Current Subscription Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl border border-blue-800/40 p-6 text-white shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">Current Plan</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                {data?.subscription.status || 'ACTIVE'}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white flex items-center space-x-3">
              <span>{currentPlan} Tier</span>
            </h3>
            <p className="text-xs text-slate-400">
              Subscription started on {new Date(data?.subscription.startDate || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl space-y-1 text-right">
            <div className="text-xs text-slate-400">Billing Cycle</div>
            <div className="text-sm font-bold text-white flex items-center space-x-1.5 justify-end">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>{currentPlan === 'FREE' ? 'Free Tier (No Expiry)' : 'Monthly Auto-Renewal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage & Quota Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Members</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{usage?.users}</span>
            <span className="text-xs font-semibold text-slate-500">Limit: {limits?.maxUsers}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (usage?.users || 0) >= (limits?.maxUsers || 1) ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, ((usage?.users || 0) / (limits?.maxUsers || 1)) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers</span>
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{usage?.customers}</span>
            <span className="text-xs font-semibold text-slate-500">Limit: {limits?.maxCustomers}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (usage?.customers || 0) >= (limits?.maxCustomers || 1) ? 'bg-amber-500' : 'bg-purple-600'
              }`}
              style={{ width: `${Math.min(100, ((usage?.customers || 0) / (limits?.maxCustomers || 1)) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Products Catalog</span>
            <Package className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{usage?.products}</span>
            <span className="text-xs font-semibold text-slate-500">Limit: {limits?.maxProducts}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (usage?.products || 0) >= (limits?.maxProducts || 1) ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, ((usage?.products || 0) / (limits?.maxProducts || 1)) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 4: Monthly Challans */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Challans (This Month)</span>
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{usage?.monthlyChallans}</span>
            <span className="text-xs font-semibold text-slate-500">Limit: {limits?.maxChallansMonth}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (usage?.monthlyChallans || 0) >= (limits?.maxChallansMonth || 1) ? 'bg-amber-500' : 'bg-amber-600'
              }`}
              style={{
                width: `${Math.min(100, ((usage?.monthlyChallans || 0) / (limits?.maxChallansMonth || 1)) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Plan Matrix & Switcher */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Available SaaS Subscription Plans</h3>
          <p className="text-xs text-slate-500">
            Select a plan to expand limits. (Mock plan switcher enabled for testing entitlement enforcement)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentPlan === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col justify-between space-y-6 relative transition-all ${
                  isCurrent
                    ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] uppercase font-extrabold px-3 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{p.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{p.description}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                    <span className="text-xs text-slate-500 font-medium ml-1">/ {p.period}</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700">Included Limits & Features:</div>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full bg-slate-100 text-slate-600 text-xs font-bold py-2.5 rounded-xl border border-slate-200 cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : user?.role === 'ADMIN' ? (
                    <button
                      onClick={() => handlePlanChange(p.id as any)}
                      disabled={updating}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      {updating ? 'Updating...' : `Switch to ${p.id} Plan`}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-slate-50 text-slate-400 text-xs font-semibold py-2.5 rounded-xl border border-slate-200 cursor-not-allowed"
                    >
                      Contact Admin to Upgrade
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
