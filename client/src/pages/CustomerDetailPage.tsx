import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, FollowUpNote } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  FileText,
  MessageSquare,
  Receipt,
} from 'lucide-react';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Follow up state
  const [noteContent, setNoteContent] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomerDetails = async () => {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.customer);
    } catch (err) {
      console.error('Error fetching customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setAddingNote(true);
    setError('');

    try {
      await api.post(`/customers/${id}/follow-ups`, {
        note: noteContent,
        nextFollowUpDate: nextFollowUpDate || undefined,
      });

      setNoteContent('');
      setNextFollowUpDate('');
      fetchCustomerDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add follow-up note.');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading customer profile...</div>;
  }

  if (!customer) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-slate-600 text-sm">Customer record not found.</p>
        <Link to="/customers" className="text-brand-600 text-xs font-semibold hover:underline">
          Return to Customer List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center space-x-3">
        <Link
          to="/customers"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
          <p className="text-xs text-slate-500">{customer.businessName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Details */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Customer Overview</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-800">
                {customer.customerType}
              </span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-3 text-slate-600">
                <Building className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">{customer.businessName}</span>
                  {customer.gstNumber ? (
                    <span className="text-slate-400 font-mono text-[11px]">GST: {customer.gstNumber}</span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">GST Unregistered</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="font-medium text-slate-800">{customer.mobile}</span>
              </div>

              {customer.email && (
                <div className="flex items-center space-x-3 text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}

              <div className="flex items-start space-x-3 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{customer.address}</span>
              </div>

              <div className="flex items-center space-x-3 text-slate-600 pt-2 border-t border-slate-100">
                <Calendar className="h-4 w-4 text-brand-600 flex-shrink-0" />
                <div>
                  <span className="text-slate-500">Next Scheduled Follow-up: </span>
                  <span className="font-semibold text-slate-900">
                    {customer.followUpDate
                      ? new Date(customer.followUpDate).toLocaleDateString()
                      : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Challans List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              <span>Issued Sales Challans</span>
            </h3>

            {(customer as any).challans?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No sales challans created yet.</p>
            ) : (
              <div className="space-y-2">
                {(customer as any).challans?.map((ch: any) => (
                  <Link
                    key={ch.id}
                    to={`/challans/${ch.id}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-brand-600">{ch.challanNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(ch.createdAt).toLocaleDateString()} • {ch.totalQuantity} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">₹{Number(ch.totalAmount).toLocaleString()}</div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {ch.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Follow-up History Timeline & Add Note */}
        <div className="space-y-6 lg:col-span-2">
          {/* Add Follow-up Form */}
          {hasRole(['ADMIN', 'SALES']) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-brand-600" />
                <span>Log New Follow-up Interaction</span>
              </h3>

              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddFollowUp} className="space-y-3">
                <div>
                  <textarea
                    required
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter notes about phone calls, client queries, price discussions, or meeting summary..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600 font-medium">Update Next Follow-up Date:</span>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingNote}
                    className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{addingNote ? 'Saving Note...' : 'Save Follow-up Note'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>CRM Activity & Follow-up History Log</span>
            </h3>

            {(customer as any).followUps?.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No follow-up notes recorded yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(customer as any).followUps?.map((fn: FollowUpNote) => (
                  <div key={fn.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white ring-2 ring-slate-100" />
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{fn.user?.name || 'System User'}</span>
                        <span className="text-slate-400">{new Date(fn.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{fn.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
