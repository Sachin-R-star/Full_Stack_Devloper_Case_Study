import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Organization } from '../types';
import { Building2, Save, Users, Package, FileText, CheckCircle2, AlertCircle, ShieldAlert, Key } from 'lucide-react';

interface EnrichedOrganization extends Organization {
  _count?: {
    users: number;
    customers: number;
    products: number;
    challans: number;
  };
}

export const OrganizationSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<EnrichedOrganization | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/organization/me');
      setOrganization(res.data.organization);
      setName(res.data.organization.name);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/organization/me', { name });
      setOrganization(res.data.organization);
      setName(res.data.organization.name);
      setSuccessMsg('Organization settings updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update organization settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-red-700" />
            <span>Organization Workspace Settings</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your company profile and dedicated multi-tenant SaaS workspace
          </p>
        </div>
        {!isAdmin && (
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Read-Only View</span>
          </span>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-2 text-sm">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workspace Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Team Members</div>
          <div className="text-xl font-bold text-slate-900">{organization?._count?.users || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Customers CRM</div>
          <div className="text-xl font-bold text-slate-900">{organization?._count?.customers || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Catalog Products</div>
          <div className="text-xl font-bold text-slate-900">{organization?._count?.products || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-medium">Sales Challans</div>
          <div className="text-xl font-bold text-slate-900">{organization?._count?.challans || 0}</div>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">General Business Information</h3>
          <p className="text-xs text-slate-500">Update company identity displayed across document headers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization Name</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-lg px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all disabled:opacity-75 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tenant Workspace Identifier (ID)</label>
            <div className="flex items-center space-x-2 max-w-lg">
              <div className="relative flex-1">
                <Key className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={organization?.id || ''}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 select-all"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unique multi-tenant database isolation ID</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Workspace Registration Date</label>
            <input
              type="text"
              readOnly
              value={organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'N/A'}
              className="w-full max-w-lg px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600"
            />
          </div>

          {isAdmin ? (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Organization Settings'}</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
              Editing organization settings requires ADMIN role privileges.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
