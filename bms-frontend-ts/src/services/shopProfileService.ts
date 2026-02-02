import api from './api';

export interface ShopProfile {
  _id?: string;
  shop_name: string;
  gstin: string;
  address: string;
  phone_number: string;
  logo_url?: string;
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  qrCodePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getShopProfile = async (): Promise<ShopProfile | null> => {
  try {
    const response = await api.get<ShopProfile>('/shop-profile');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null; // No shop profile found
    }
    throw error;
  }
};

export const updateShopProfile = async (formData: FormData): Promise<ShopProfile> => {
  // For file uploads, Content-Type 'multipart/form-data' is automatically set by the browser when using FormData
  // with fetch or an Axios instance configured for it.
  const response = await api.post<ShopProfile>('/shop-profile', formData);
  return response.data;
};
