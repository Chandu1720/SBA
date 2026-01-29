import api from './api';
import { Permission } from '../types/models';

export const getPermissions = async () => {
  const response = await api.get<Permission[]>('/permissions');
  return response.data;
};

export const getUserPermissions = async (userId: string) => {
  const response = await api.get<Permission[]>(`/permissions/users/${userId}/permissions`);
  return response.data;
};

export const updateUserPermissions = async (userId: string, permissions: string[]) => {
  const response = await api.put(`/permissions/users/${userId}/permissions`, { permissions });
  return response.data;
};
