export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export type StockMovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName: string;
  gstNumber?: string | null;
  type: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    followUps: number;
    challans: number;
  };
}

export interface FollowUpNote {
  id: string;
  customerId: string;
  userId: string;
  note: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: Role;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlertQty: number;
  location: string;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementLog {
  id: string;
  productId: string;
  quantity: number;
  movementType: StockMovementType;
  reason: string;
  createdById: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  createdBy?: {
    id: string;
    name: string;
    role: Role;
  };
}

export interface SalesChallanItem {
  id: string;
  challanId: string;
  productId: string;
  snapshotName: string;
  snapshotSku: string;
  snapshotPrice: number;
  quantity: number;
  subtotal: number;
  product?: {
    id: string;
    currentStock: number;
    minStockAlertQty: number;
  };
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  totalAmount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  createdBy?: User;
  items?: SalesChallanItem[];
  _count?: {
    items: number;
  };
}
