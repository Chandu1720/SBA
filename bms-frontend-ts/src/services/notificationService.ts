import api from './api';

export interface Notification {
  _id: string;
  message: string;
  type: 'supplier_due' | 'customer_due';
  link: string;
  isRead: boolean;
  dueDate?: string;
  createdAt: string;
}

export const getUnreadNotifications = async (): Promise<Notification[]> => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markAsRead = async (id: string): Promise<Notification> => {
  const response = await api.put(`/notifications/${id}`);
  return response.data;
};

export const markAllAsRead = async (): Promise<{ msg: string }> => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};
