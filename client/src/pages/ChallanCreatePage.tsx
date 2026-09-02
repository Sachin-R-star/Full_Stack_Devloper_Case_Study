import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, Product } from '../types';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Save,
  CheckCircle,
  Building,
} from 'lucide-react';

interface RowItem {
  productId: string;
  quantity: number;
}

export const ChallanCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<RowItem[]>([{ productId: '', quantity: 1 }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get('/customers?limit=100'),
          api.get('/products?limit=100'),
        ]);
        setCustomers(cRes.data.data);
        setProducts(pRes.data.data);
      } catch (err) {
        console.error('Error loading data for challan creation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof RowItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Helper product map
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculated totals
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = items.reduce((sum, item) => {
    const prod = productMap.get(item.productId);
    if (!prod) return sum;
    return sum + Number(prod.unitPrice) * (Number(item.quantity) || 0);
  }, 0);

  const handleSubmit = async (initialStatus: 'DRAFT' | 'CONFIRMED') => {
    setError('');

    if (!selectedCustomerId) {
      setError('Please select a customer for this sales challan.');
      return;
    }

    if (items.some((i) => !i.productId)) {
      setError('Please select a product for all item rows.');
      return;
    }

    if (items.some((i) => i.quantity <= 0)) {
      setError('Product quantity must be greater than 0.');
      return;
    }

    // Check duplicate product selections
    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      setError('Duplicate products selected. Please merge quantities into a single row.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/challans', {
        customerId: selectedCustomerId,
        items,
        status: initialStatus,
      });

      const createdId = res.data.challan.id;
      navigate(`/challans/${createdId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating sales challan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading order creation builder...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          to="/challans"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create New Sales Challan</h2>
          <p className="text-xs text-slate-500">Draft or confirm sales orders with live inventory checks</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Main Builder Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Customer Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Select Customer *</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">-- Choose Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.businessName} ({c.customerType})
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Item Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Order Product Items
            </h3>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="inline-flex items-center space-x-1 text-brand-600 hover:text-brand-800 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Available Stock</th>
                  <th className="py-2.5 px-3">Unit Price (₹)</th>
                  <th className="py-2.5 px-3 w-28">Quantity</th>
                  <th className="py-2.5 px-3">Subtotal (₹)</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const prod = productMap.get(item.productId);
                  const isInsufficient = prod ? prod.currentStock < item.quantity : false;
                  const rowSubtotal = prod ? Number(prod.unitPrice) * item.quantity : 0;

                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — ₹{Number(p.unitPrice)}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3">
                        {prod ? (
                          <span className={`font-semibold ${isInsufficient ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                            {prod.currentStock} in stock
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {prod ? `₹${Number(prod.unitPrice).toFixed(2)}` : '—'}
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-center font-bold focus:ring-2 focus:ring-brand-500"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        ₹{rowSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          disabled={items.length === 1}
                          className="text-slate-400 hover:text-red-600 p-1 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Totals */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Total Selected Products: <strong className="text-slate-900">{items.filter((i) => i.productId).length}</strong> | Total Items Quantity: <strong className="text-slate-900">{totalQuantity}</strong>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Total Order Amount</span>
            <span className="text-xl font-bold text-slate-900">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4 text-slate-500" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('CONFIRMED')}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Confirm & Deduct Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
