import api from './api';
import { Bill } from '../types/models';

export const getBills = async (params?: any) => {
  const response = await api.get('/bills', { params });
  return response.data;
};
export const downloadBill = async (billId: any) => {
  return api.get(`/bills/${billId}/download`, {
    responseType: "blob",
  });
};
export const getBillById = async (id: string) => {
  const response = await api.get<Bill>(`/bills/${id}`);
  return response.data;
};

export const createBill = async (billData: Partial<Bill>) => {
  const response = await api.post<Bill>('/bills', billData);
  return response.data;
};

export const updateBill = async (id: string, billData: Partial<Bill>) => {
  const response = await api.put<Bill>(`/bills/${id}`, billData);
  return response.data;
};

export const deleteBill = async (id: string) => {
  const response = await api.delete(`/bills/${id}`);
  return response.data;
};