import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { getShopProfile, updateShopProfile, ShopProfile } from '../../services/shopProfileService';

const ShopProfileManager: React.FC = () => {
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [shop_name, setShopName] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone_number, setPhoneNumber] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getShopProfile();
        setShopProfile(data);
        if (data) {
          setShopName(data.shop_name);
          setGstin(data.gstin);
          setAddress(data.address);
          setPhoneNumber(data.phone_number);
          if (data.logo_url && data.logo_url.startsWith('http')) {
            setLogoPreview(data.logo_url);
          } else {
            setLogoPreview(null);
          }
          if (data.qrCodePath && data.qrCodePath.startsWith('http')) {
            setQrCodePreview(data.qrCodePath);
          } else {
            setQrCodePreview(null);
          }
          if (data.bankDetails) {
            setAccountHolderName(data.bankDetails.accountHolderName);
            setAccountNumber(data.bankDetails.accountNumber);
            setIfsc(data.bankDetails.ifsc);
            setBankName(data.bankDetails.bankName);
          }
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching shop profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleQrCodeFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrCodeFile(file);
      setQrCodePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('shop_name', shop_name);
    formData.append('gstin', gstin);
    formData.append('address', address);
    formData.append('phone_number', phone_number);
    formData.append('accountHolderName', accountHolderName);
    formData.append('accountNumber', accountNumber);
    formData.append('ifsc', ifsc);
    formData.append('bankName', bankName);

    if (logoFile) {
      formData.append('logo', logoFile);
    }
    if (qrCodeFile) {
      formData.append('qrCode', qrCodeFile);
    }

    try {
      const updatedProfile = await updateShopProfile(formData);
      setShopProfile(updatedProfile);
      setShopName(updatedProfile.shop_name);
      setGstin(updatedProfile.gstin);
      setAddress(updatedProfile.address);
      setPhoneNumber(updatedProfile.phone_number);
      if (updatedProfile.logo_url) {
        setLogoPreview(updatedProfile.logo_url);
      }
      if (updatedProfile.qrCodePath) {
        setQrCodePreview(updatedProfile.qrCodePath);
      }
      if (updatedProfile.bankDetails) {
        setAccountHolderName(updatedProfile.bankDetails.accountHolderName);
        setAccountNumber(updatedProfile.bankDetails.accountNumber);
        setIfsc(updatedProfile.bankDetails.ifsc);
        setBankName(updatedProfile.bankDetails.bankName);
      }
      setLogoFile(null);
      setQrCodeFile(null);
      setSuccess('Shop profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating shop profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Shop Profile Management</h1>

      {loading && <p className="text-blue-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label htmlFor="shop_name" className="block text-gray-700 text-sm font-bold mb-2">
            Shop Name:
          </label>
          <input
            type="text"
            id="shop_name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={shop_name}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="gstin" className="block text-gray-700 text-sm font-bold mb-2">
            GSTIN:
          </label>
          <input
            type="text"
            id="gstin"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">
            Address:
          </label>
          <textarea
            id="address"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="phone_number" className="block text-gray-700 text-sm font-bold mb-2">
            Phone Number:
          </label>
          <input
            type="text"
            id="phone_number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={phone_number}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="logo" className="block text-gray-700 text-sm font-bold mb-2">
            Shop Logo:
          </label>
          <input
            type="file"
            id="logo"
            accept="image/*"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={handleLogoFileChange}
          />
          {logoPreview && (
            <div className="mt-4">
              <p className="text-gray-700 text-sm font-bold mb-2">Current Logo:</p>
              <img src={logoPreview} alt="Shop Logo Preview" className="max-w-xs h-auto rounded shadow" />
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mt-6 mb-4">Bank Details</h2>

        <div className="mb-4">
          <label htmlFor="accountHolderName" className="block text-gray-700 text-sm font-bold mb-2">
            Account Holder Name:
          </label>
          <input
            type="text"
            id="accountHolderName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="accountNumber" className="block text-gray-700 text-sm font-bold mb-2">
            Account Number:
          </label>
          <input
            type="text"
            id="accountNumber"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="ifsc" className="block text-gray-700 text-sm font-bold mb-2">
            IFSC Code:
          </label>
          <input
            type="text"
            id="ifsc"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="bankName" className="block text-gray-700 text-sm font-bold mb-2">
            Bank Name:
          </label>
          <input
            type="text"
            id="bankName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="qrCode" className="block text-gray-700 text-sm font-bold mb-2">
            QR Code:
          </label>
          <input
            type="file"
            id="qrCode"
            accept="image/*"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={handleQrCodeFileChange}
          />
          {qrCodePreview && (
            <div className="mt-4">
              <p className="text-gray-700 text-sm font-bold mb-2">Current QR Code:</p>
              <img src={qrCodePreview} alt="QR Code Preview" className="max-w-xs h-auto rounded shadow" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShopProfileManager;
