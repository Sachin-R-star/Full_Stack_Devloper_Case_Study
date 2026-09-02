import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Package,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  PlusCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setData(res.data.summary);
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500 text-sm">
        Loading operations overview...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-slate-500 mt-1">
            System Operational Role: <span className="font-semibold text-slate-700">{user?.role}</span>
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
          <Link
            to="/challans/new"
            className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Sales Challan</span>
          </Link>
        )}
      </div>

      {/* Low Stock Warning Alert Banner */}
      {data?.inventory?.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">Stock Alert Warning</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              There are <span className="font-bold">{data.inventory.lowStockCount} product(s)</span> at or below minimum alert stock thresholds.
            </p>
          </div>
          <Link
            to="/inventory"
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline flex items-center space-x-1"
          >
            <span>Review Inventory</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers CRM</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.customers?.total || 0}</div>
          <div className="flex items-center space-x-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Leads: <strong className="text-slate-700">{data?.customers?.lead || 0}</strong></span>
            <span>Active: <strong className="text-emerald-700">{data?.customers?.active || 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Inventory */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Stock</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.inventory?.totalProducts || 0}</div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Low Stock Alerts: <span className="font-semibold text-amber-600">{data?.inventory?.lowStockCount || 0}</span>
          </div>
        </div>

        {/* Card 3: Challans */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales Challans</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.challans?.total || 0}</div>
          <div className="flex items-center space-x-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Draft: <strong className="text-amber-700">{data?.challans?.draft || 0}</strong></span>
            <span>Confirmed: <strong className="text-emerald-700">{data?.challans?.confirmed || 0}</strong></span>
          </div>
        </div>

        {/* Card 4: Confirmed Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmed Revenue</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{Number(data?.challans?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            From {data?.challans?.confirmed || 0} confirmed order challans
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Inventory Stock Movements</h3>
          </div>
          <Link
            to="/inventory/movements"
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <span>View Full Audit Log</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Log User</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentMovements?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                data?.recentMovements?.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {m.product?.name} <span className="text-slate-400 font-mono">({m.product?.sku})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {m.movementType === 'IN' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                          <ArrowDownLeft className="h-3 w-3" />
                          <span>STOCK IN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                          <ArrowUpRight className="h-3 w-3" />
                          <span>STOCK OUT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{m.quantity}</td>
                    <td className="py-2.5 px-3 text-slate-600">{m.reason}</td>
                    <td className="py-2.5 px-3 text-slate-600">{m.createdBy?.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
