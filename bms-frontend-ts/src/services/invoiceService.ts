import { Invoice } from '../types/models';
import api from './api';

export const getInvoices = async (params?: any) => {
  const response = await api.get<{ invoices: Invoice[]; pagination: { total: number; pages: number; page: number } }>('/invoices', { params });
  return response.data;
};

export const getInvoiceById = async (id: string) => {
  const response = await api.get<Invoice>(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (formData: FormData): Promise<Invoice> => {
  const response = await api.post<Invoice>('/invoices', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/* UPDATE */
export const updateInvoice = async (
  id: string,
  formData: FormData
): Promise<Invoice> => {
  const response = await api.put<Invoice>(`/invoices/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};



export const deleteInvoice = async (id: string) => {

  const response = await api.delete(`/invoices/${id}`);

  return response.data;

};



export const clearInvoiceDue = async (id: string) => {

  const response = await api.put(`/invoices/${id}/clear-due`);

  return response.data;

};
