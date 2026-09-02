import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StockMovementLog } from '../types';
import { History, ArrowDownLeft, ArrowUpRight, Filter, Search } from 'lucide-react';

export const StockMovementPage: React.FC = () => {
  const [logs, setLogs] = useState<StockMovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementFilter, setMovementFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (movementFilter) params.movementType = movementFilter;

      const res = await api.get('/products/movements', { params });
      setLogs(res.data.data);
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [movementFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <History className="h-6 w-6 text-brand-600" />
            <span>Stock Audit Movement Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable transaction history of all stock additions, sales deductions, and inventory adjustments
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Movement Types</option>
            <option value="IN">Stock IN (+)</option>
            <option value="OUT">Stock OUT (-)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4">Quantity Changed</th>
                <th className="py-3 px-4">Reason / Reference</th>
                <th className="py-3 px-4">Log Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading stock audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No stock movement logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.product?.name}{' '}
                      <span className="text-slate-400 font-mono font-normal">({log.product?.sku})</span>
                    </td>
                    <td className="py-3 px-4">
                      {log.movementType === 'IN' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-200">
                          <ArrowDownLeft className="h-3 w-3" />
                          <span>STOCK IN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-amber-200">
                          <ArrowUpRight className="h-3 w-3" />
                          <span>STOCK OUT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-sm text-slate-900">
                      {log.movementType === 'IN' ? `+${log.quantity}` : `-${log.quantity}`}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{log.reason}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{log.createdBy?.name}</span>{' '}
                      <span className="text-[10px] text-slate-400">({log.createdBy?.role})</span>
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
