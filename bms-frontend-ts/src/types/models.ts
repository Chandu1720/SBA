export interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role?: 'user' | 'Admin';
  permissions?: string[];
}

export interface DecodedUser {
  id: string;
  _id?: string;
  role: string;
  permissions: string[];
  shop: string;
  iat: number;
  exp: number;
  name?: string;
  avatar?: string;
}

export interface Permission {
  _id?: string;
  name: string;
  description: string;
}

export interface Supplier {
  _id?: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstId: string;
  notes: string;
  createdAt?: string;
}

// ... (existing User, Permission, Supplier interfaces)

export interface LineItem {
  itemType: 'Simple' | 'Product' | 'Kit';
  itemId?: string; // ObjectId
  name: string;
  quantity: number;
  rate: number;
  total: number;
  itemModel?: 'Product' | 'Kit';
  _id?: string; // Mongoose adds this to subdocuments
}

export interface Bill {
  _id?: string;
  billNumber?: string;
  customerName: string;
  customerPhone: string;
  billDate: string;
  items: LineItem[];
  grandTotal: number;
  paymentStatus: string;
  paidAmount: number;
  paymentMode: string;
  notes: string;
  billCopy: string;
  shop?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Kit {
    _id: string;
    name: string;
    sku: string;
    description: string;
    price: number;
    products: {
        product: Product; // This will be populated
        quantity: number;
        _id: string;
    }[];
    shop: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface Product {
  _id?: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  productType?: string;
  brand?: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  quantity: number;
  minStockLevel?: number;
  unitType: string;
  taxRate?: number;
  taxType?: 'GST' | 'VAT' | 'None';
  supplier?: string;
  image?: string;
  status?: 'active' | 'inactive';
  createdBy?: string;
  shop?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  _id?: string;
  invoiceNumber?: string;
  supplierInvoiceNumber?: string;
  supplierId: {
    _id: string;
    name: string;
  };
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paymentStatus: string;
  paidAmount: number;
  paymentMode: string;
  notes: string;
  invoiceCopy: string;
  paymentProof?: string; // Path to cheque/UPI proof document
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoicePayload extends Omit<Invoice, 'supplierId' | '_id'> {
  supplierId: string;
}

export interface DueInvoice {
  _id: string;
  supplierId: {
    _id: string;
    name: string;
  };
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paymentStatus: string;
}

export interface DueBill {
  _id: string;
  customerName: string;
  billDate: string;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: string;
}

export interface DashboardData {
  suppliers: Supplier[];
  invoices: Invoice[];
  bills: Bill[];
  dueSuppliers: DueInvoice[];
  dueCustomers: DueBill[];
  recentBills: Bill[];
  recentInvoices: Invoice[];
}

export interface Totals {
  dues: number;
  paid: number;
  recived:number;
}

export interface CardData {
  title: string;
  value: string | number;
  color: string;
  route: string;
  icon: string;
}

export interface Notification {
  _id: string;
  message: string;
  type: 'supplier_due' | 'customer_due';
  link: string;
  isRead: boolean;
  dueDate?: string;
  createdAt: string;
}