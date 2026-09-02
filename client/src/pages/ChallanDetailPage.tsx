import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Challan, ChallanItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  XCircle,
  Building,
  User as UserIcon,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const ChallanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchChallan = async () => {
    try {
      const res = await api.get(`/challans/${id}`);
      setChallan(res.data.challan);
    } catch (err) {
      console.error('Error fetching challan details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [id]);

  const handleStatusChange = async (newStatus: 'CONFIRMED' | 'CANCELLED') => {
    setError('');
    setUpdating(true);

    try {
      await api.patch(`/challans/${id}/status`, { status: newStatus });
      fetchChallan();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to update status to ${newStatus}.`);
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading sales challan document...</div>;
  }

  if (!challan) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-slate-600 text-sm">Sales challan document not found.</p>
        <Link to="/challans" className="text-brand-600 text-xs font-semibold hover:underline">
          Return to Challans List
        </Link>
      </div>
    );
  }

  const isDraft = challan.status === 'DRAFT';
  const isConfirmed = challan.status === 'CONFIRMED';
  const isCancelled = challan.status === 'CANCELLED';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Header (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <Link
            to="/challans"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{challan.challanNumber}</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border inline-block mt-0.5 ${
                isDraft
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : isConfirmed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {challan.status}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Challan</span>
          </button>

          {isDraft && hasRole(['ADMIN', 'SALES', 'ACCOUNTS']) && (
            <button
              onClick={() => handleStatusChange('CONFIRMED')}
              disabled={updating}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{updating ? 'Confirming...' : 'Confirm Order & Deduct Stock'}</span>
            </button>
          )}

          {isConfirmed && hasRole(['ADMIN', 'ACCOUNTS']) && (
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              disabled={updating}
              className="inline-flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs px-3.5 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{updating ? 'Cancelling...' : 'Cancel Order & Restock'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start space-x-2 no-print">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Printable Challan Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8 print:shadow-none print:border-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">SALES CHALLAN</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Nexus Wholesale & Distribution Operations</p>
          </div>
          <div className="text-right space-y-1">
            <div className="text-lg font-mono font-bold text-brand-600">{challan.challanNumber}</div>
            <div className="text-xs text-slate-500">Date: {new Date(challan.createdAt).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">Issued by: {challan.createdBy?.name}</div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">Billed To (Customer)</span>
            <div className="font-bold text-slate-900 text-sm">{challan.customer?.name}</div>
            <div className="text-slate-700 font-medium">{challan.customer?.businessName}</div>
            <div className="text-slate-600 mt-1">{challan.customer?.address}</div>
            {challan.customer?.gstNumber && (
              <div className="text-slate-500 font-mono mt-1">GSTIN: {challan.customer.gstNumber}</div>
            )}
          </div>

          <div className="text-right space-y-1">
            <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">Customer Contact</span>
            <div className="text-slate-800 font-medium">Mobile: {challan.customer?.mobile}</div>
            {challan.customer?.email && <div className="text-slate-600">Email: {challan.customer.email}</div>}
            <div className="text-slate-600 mt-2">Customer Type: <strong className="text-slate-800">{challan.customer?.customerType}</strong></div>
          </div>
        </div>

        {/* Snapshot Items Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Item Breakdown</h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product Name (Snapshot)</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Unit Price (₹)</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Subtotal (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challan.items?.map((item: ChallanItem, index: number) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-400 font-mono">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.productNameSnapshot}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{item.skuSnapshot}</td>
                    <td className="py-3 px-4 text-slate-700">
                      ₹{Number(item.unitPriceSnapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Quantity:</span>
              <span className="font-semibold text-slate-900">{challan.totalQuantity} items</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>₹{Number(challan.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Footer Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-slate-400 border-t border-slate-100">
          <div>
            <div className="h-12 border-b border-slate-300 w-48 mb-1" />
            <span>Authorized Signature / Receiver</span>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="h-12 border-b border-slate-300 w-48 mb-1" />
            <span>Dispatch Warehouse In-charge</span>
          </div>
        </div>
      </div>
    </div>
  );
};
