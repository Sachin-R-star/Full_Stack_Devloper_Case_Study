import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  MapPin,
  Edit2,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add/Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    initialStock: '0',
    minStockAlertQty: '10',
    location: '',
  });
  const [productError, setProductError] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Stock Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity: '1',
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });
  const [adjustError, setAdjustError] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (lowStockOnly) params.lowStockOnly = 'true';

      const res = await api.get('/products', { params });
      setProducts(res.data.data);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, lowStockOnly]);

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: '',
      category: '',
      unitPrice: '',
      initialStock: '0',
      minStockAlertQty: '10',
      location: '',
    });
    setProductError('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: String(p.unitPrice),
      initialStock: String(p.currentStock),
      minStockAlertQty: String(p.minimumStock),
      location: p.warehouseLocation,
    });
    setProductError('');
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductError('');
    setSavingProduct(true);

    const payload = {
      name: productForm.name,
      sku: productForm.sku,
      category: productForm.category,
      unitPrice: Number(productForm.unitPrice),
      initialStock: Number(productForm.initialStock),
      minimumStock: Number(productForm.minStockAlertQty),
      warehouseLocation: productForm.location,
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setProductError(err.response?.data?.message || 'Failed to save product record.');
    } finally {
      setSavingProduct(false);
    }
  };

  const openStockAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustForm({
      quantity: '1',
      movementType: 'IN',
      reason: 'Manual Warehouse Adjustment',
    });
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setAdjustError('');
    setSavingAdjust(true);

    try {
      await api.post('/inventory/movements', {
        productId: adjustingProduct.id,
        quantityChanged: Number(adjustForm.quantity),
        movementType: adjustForm.movementType,
        reason: adjustForm.reason,
      });
      setIsAdjustModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setAdjustError(err.response?.data?.message || 'Failed to adjust stock level.');
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-600" />
            <span>Inventory & Stock Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catalog product management, minimum stock thresholds, and location tracking
          </p>
        </div>

        {hasRole(['ADMIN', 'WAREHOUSE']) && (
          <button
            onClick={openCreateProductModal}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
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
            placeholder="Search by product name, SKU, or category..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 border border-slate-200 rounded-lg select-none hover:bg-slate-100">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <AlertTriangle className={`h-4 w-4 ${lowStockOnly ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>Low Stock Alerts Only</span>
        </label>
      </div>

      {/* Inventory Table / Empty State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Loading inventory records...
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Your product catalog is empty"
          description="Add your first SKU item to manage prices, track warehouse stock levels, and issue sales challans."
          actionLabel="Add First Product"
          onActionClick={openCreateProductModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ₹{Number(p.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold text-sm ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                            {p.currentStock} units
                          </span>
                          {isLow && (
                            <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-semibold">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              <span>Min: {p.minimumStock}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{p.warehouseLocation}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {hasRole(['ADMIN', 'WAREHOUSE']) && (
                          <>
                            <button
                              onClick={() => openStockAdjustModal(p)}
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              <span>Adjust Stock</span>
                            </button>

                            <button
                              onClick={() => openEditProductModal(p)}
                              className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product Catalog Details' : 'Add New Inventory Product'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              {productError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                  {productError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Heavy Duty Power Drill 800W"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono uppercase"
                    placeholder="PWR-DRL-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Power Tools"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.unitPrice}
                    onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="3499.00"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      required
                      value={productForm.initialStock}
                      onChange={(e) => setProductForm({ ...productForm, initialStock: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Alert Stock *</label>
                  <input
                    type="number"
                    required
                    value={productForm.minStockAlertQty}
                    onChange={(e) => setProductForm({ ...productForm, minStockAlertQty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Location *</label>
                <input
                  type="text"
                  required
                  value={productForm.location}
                  onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Warehouse A - Bay 04"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {savingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manual Stock Adjustment</h3>
                <p className="text-xs text-slate-500">{adjustingProduct.name}</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="p-6 space-y-4">
              {adjustError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                  {adjustError}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-xs">
                <span>Current In Stock:</span>
                <span className="font-bold text-slate-900">{adjustingProduct.currentStock} units</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Movement Type</label>
                  <select
                    value={adjustForm.movementType}
                    onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value as 'IN' | 'OUT' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="IN">IN (Add Stock)</option>
                    <option value="OUT">OUT (Reduce Stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Log Reason *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Purchase Shipment PO-901, Stock Damage Correction"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdjust}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {savingAdjust ? 'Adjusting...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
