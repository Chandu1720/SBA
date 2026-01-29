import api from './api';

interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
}

export const getUsers = async () => {
  const response = await api.get<User[]>('/users');
  return response.data;
};

export const getUserById = async (id: string) => {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
};

export const createUser = async (userData: User) => {
  const response = await api.post<User>('/users', userData);
  return response.data;
};

export const updateUser = async (id: string, userData: User) => {
  const response = await api.put<User>(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get<User>('/users/me');
  return response.data;
};