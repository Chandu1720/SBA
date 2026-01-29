import api from './api';
import { Kit } from '../types/models';

export const getKits = async (shopId: string): Promise<Kit[]> => {
  const response = await api.get('/kits', { params: { shop: shopId } });
  return response.data;
};

export const getKitById = async (id: string): Promise<Kit> => {
  const response = await api.get(`/kits/${id}`);
  return response.data;
};

export const createKit = async (kitData: any): Promise<Kit> => {
  const response = await api.post('/kits', kitData);
  return response.data;
};

export const updateKit = async (id: string, kitData: any): Promise<Kit> => {
  const response = await api.put(`/kits/${id}`, kitData);
  return response.data;
};

export const deleteKit = async (id: string): Promise<void> => {
  await api.delete(`/kits/${id}`);
};
