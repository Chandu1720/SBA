import api from './api';
import { Product } from '../types/models';

export const getProducts = async (shopId: string) => {
  try {
    const response = await api.get(`/products?shop=${shopId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllProducts = async (shopId: string) => {
  try {
    const response = await api.get(`/products?shop=${shopId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProductById = async (id: string) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createProduct = async (productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt' | 'sku' | 'createdBy'>) => {
  try {
    const response = await api.post('/products', productData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProduct = async (id: string, productData: Partial<Product>) => {
  try {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
