import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, CustomerType, CustomerStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Calendar,
  Phone,
  Building,
  Mail,
  Edit2,
  X,
} from 'lucide-react';

export const CustomerListPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    type: 'RETAIL' as CustomerType,
    address: '',
    status: 'LEAD' as CustomerStatus,
    followUpDate: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.customerType = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, typeFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      type: 'RETAIL',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile,
      email: c.email || '',
      businessName: c.businessName,
      gstNumber: c.gstNumber || '',
      type: c.customerType,
      address: c.address,
      status: c.status,
      followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '',
      notes: c.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save customer details.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: CustomerStatus) => {
    switch (status) {
      case 'LEAD':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-brand-600" />
            <span>Customer CRM Portal</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer profiles, lead statuses, GST records, and follow-ups
          </p>
        </div>

        {hasRole(['ADMIN', 'SALES']) && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Customer</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, mobile, business, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="flex items-center space-x-1 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white"
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer / Business</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Follow-up Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customers found matching search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Building className="h-3 w-3 text-slate-400" />
                        <span>{c.businessName}</span>
                        {c.gstNumber && <span className="text-slate-400 font-mono">({c.gstNumber})</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{c.mobile}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {c.customerType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.followUpDate ? (
                        <div className="flex items-center space-x-1 text-slate-700 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-brand-600" />
                          <span>{new Date(c.followUpDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        to={`/customers/${c.id}`}
                        className="inline-flex items-center space-x-1 text-brand-600 hover:text-brand-800 font-semibold px-2 py-1 bg-brand-50 hover:bg-brand-100 rounded transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </Link>

                      {hasRole(['ADMIN', 'SALES']) && (
                        <button
                          onClick={() => openEditModal(c)}
                          className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer Record' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="e.g. Apex Wholesalers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="client@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomerType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CRM Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                    placeholder="07AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Street address, city, state..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
