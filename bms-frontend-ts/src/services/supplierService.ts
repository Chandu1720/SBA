import api from './api';

interface Supplier {
  _id?: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstId: string;
  notes: string;
}

export const getSuppliers = async (params?: any) => {
  const response = await api.get('/suppliers', { params });
  return response.data;
};

export const getSupplierById = async (id: string) => {
  const response = await api.get<Supplier>(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (supplierData: Supplier) => {
  const response = await api.post<Supplier>('/suppliers', supplierData);
  return response.data;
};

export const updateSupplier = async (id: string, supplierData: Supplier) => {
  const response = await api.put<Supplier>(`/suppliers/${id}`, supplierData);
  return response.data;
};

export const deleteSupplier = async (id: string) => {
  const response = await api.delete(`/suppliers/${id}`);
  return response.data;
};