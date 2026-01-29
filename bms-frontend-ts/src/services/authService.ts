import api from './api';

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signup = async (name: string, email: string, password: string,role:string) => {
  const response = await api.post('/auth/register', { name, email, password,role });
  return response.data;
};