import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerListPage } from './pages/CustomerListPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { StockMovementPage } from './pages/StockMovementPage';
import { ChallanListPage } from './pages/ChallanListPage';
import { ChallanCreatePage } from './pages/ChallanCreatePage';
import { ChallanDetailPage } from './pages/ChallanDetailPage';
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: Role[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
        Validating session token...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center space-y-2 max-w-xl mx-auto my-12">
          <h3 className="font-bold text-base">403 Access Forbidden</h3>
          <p className="text-xs">
            Your current role (<strong className="uppercase">{user.role}</strong>) does not have authorization for this module.
          </p>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <CustomerListPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <CustomerDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <StockMovementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans"
            element={
              <ProtectedRoute>
                <ChallanListPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans/new"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <ChallanCreatePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans/:id"
            element={
              <ProtectedRoute>
                <ChallanDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings/organization"
            element={
              <ProtectedRoute>
                <OrganizationSettingsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
