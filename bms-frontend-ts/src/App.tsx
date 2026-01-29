import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import DashboardV3 from './components/Dashboard/DashboardV3';
import UserList from './components/Users/UserList';
import UserForm from './components/Users/UserForm';
import UserDetails from './components/Users/UserDetails';
import Suppliers from './components/Suppliers/Suppliers';
import SupplierForm from './components/Suppliers/SupplierForm';
import SupplierDetails from './components/Suppliers/SupplierDetails';
import Products from './components/Products/Products';
import ProductForm from './components/Products/ProductForm';
import Invoices from './components/Invoices/Invoices';
import InvoiceDetails from './components/Invoices/InvoiceDetails';
import InvoiceFormWrapper from './components/Invoices/InvoiceFormWrapper';
import Bills from './components/Bills/Bills';
import BillsFormV2 from './components/Bills/BillsFormV2';
import BillDetails from './components/Bills/BillDetails';
import DueManager from './components/Dues/DueManager';
import Profile from './components/Profile/Profile';
import ShopProfileManager from './components/ShopProfile/ShopProfileManager';
import Kits from './components/Kits/Kits';
import KitForm from './components/Kits/KitForm';

import Layout from './components/Layout/Layout';
import PrivateRoute from './components/Auth/PrivateRoute';
import Dashboard from './components/Dashboard/Dashboard';

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected layout */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard-v3"
          element={
            <PrivateRoute>
              <DashboardV3 />
            </PrivateRoute>
          }
        />

        <Route
          path="/users"
          element={
            <PrivateRoute permission="users:view">
              <UserList />
            </PrivateRoute>
          }
        />

        <Route
          path="/users/new"
          element={
            <PrivateRoute permission="users:create">
              <UserForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/users/:id"
          element={
            <PrivateRoute permission="users:view">
              <UserDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/users/:id/edit"
          element={
            <PrivateRoute permission="users:edit">
              <UserForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/suppliers"
          element={
            <PrivateRoute permission="suppliers:view">
              <Suppliers />
            </PrivateRoute>
          }
        />

        <Route
          path="/suppliers/new"
          element={
            <PrivateRoute permission="suppliers:create">
              <SupplierForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/suppliers/:id"
          element={
            <PrivateRoute permission="suppliers:view">
              <SupplierDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/suppliers/:id/edit"
          element={
            <PrivateRoute permission="suppliers:edit">
              <SupplierForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/products"
          element={
            <PrivateRoute permission="products:view">
              <Products />
            </PrivateRoute>
          }
        />

        <Route
          path="/products/new"
          element={
            <PrivateRoute permission="products:create">
              <ProductForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/products/:id/edit"
          element={
            <PrivateRoute permission="products:edit">
              <ProductForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/kits"
          element={
            <PrivateRoute permission="kits:view">
              <Kits />
            </PrivateRoute>
          }
        />

        <Route
          path="/kits/new"
          element={
            <PrivateRoute permission="kits:create">
              <KitForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/kits/edit/:id"
          element={
            <PrivateRoute permission="kits:edit">
              <KitForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <PrivateRoute>
              <Invoices />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoices/:id/details"
          element={
            <PrivateRoute permission="invoices:view">
              <InvoiceDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoices/new"
          element={
            <PrivateRoute permission="invoices:create">
              <InvoiceFormWrapper />
            </PrivateRoute>
          }
        />

        <Route
          path="/invoices/:id/edit"
          element={
            <PrivateRoute permission="invoices:edit">
              <InvoiceFormWrapper />
            </PrivateRoute>
          }
        />

        <Route
          path="/bills"
          element={
            <PrivateRoute>
              <Bills />
            </PrivateRoute>
          }
        />

        <Route
          path="/bills/new"
          element={
            <PrivateRoute>
              <BillsFormV2 />
            </PrivateRoute>
          }
        />

        <Route
          path="/bills/:id"
          element={
            <PrivateRoute>
              <BillDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/bills/:id/edit"
          element={
            <PrivateRoute>
              <BillsFormV2 />
            </PrivateRoute>
          }
        />

        <Route
          path="/dues"
          element={
            <PrivateRoute>
              <DueManager />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/shop-profile"
          element={
            <PrivateRoute permission="shop-profile:edit">
              <ShopProfileManager />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
