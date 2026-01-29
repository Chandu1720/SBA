import api from './api';

interface DueInvoice {
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

interface DueBill {
  _id: string;
  customerName: string;
  billDate: string;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: string;
}

export const getSupplierDues = async () => {
  const response = await api.get<DueInvoice[]>('/dues/suppliers');
  return response.data;
};

export const getCustomerDues = async () => {
  const response = await api.get<DueBill[]>('/dues/customers');
  return response.data;
};