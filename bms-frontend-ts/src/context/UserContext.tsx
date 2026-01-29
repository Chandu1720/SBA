import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { DecodedUser } from '../types/models';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface UserContextType {
  user: DecodedUser | null;
  authLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<DecodedUser | null>>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DecodedUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode<DecodedUser>(token);

        // Token expired → refresh
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });

          const newToken = res.data?.token;
          if (!newToken) throw new Error('No token from refresh');

          localStorage.setItem('token', newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

          setUser(jwtDecode<DecodedUser>(newToken));
        } else {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(decoded);
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeUser();
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  return (
    <UserContext.Provider value={{ user, authLoading, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
