import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [view, setView] = useState('list'); // 'list' or 'add'
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `${process.env.REACT_APP_API_URL}/api/users`;

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // ✅ Wrap fetchUsers in useCallback with empty deps (since getAuthToken & API_URL are stable)
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }
      const response = await axios.get(API_URL, {
        headers: { 'x-auth-token': token },
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Safe empty deps — getAuthToken and API_URL don't change

  // ✅ Now safe to include fetchUsers in deps
  useEffect(() => {
    if (view === 'list') {
      fetchUsers();
    }
  }, [view, fetchUsers]);

  // Handle new user form input
  const handleNewUserChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  // Handle edit form input
  const handleEditFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }
      await axios.post(API_URL, newUser, {
        headers: { 'x-auth-token': token },
      });
      setNewUser({ name: '', email: '', password: '' });
      setView('list');
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.response?.data?.message || 'Failed to add user.');
    }
  };

  // Set user for editing
  const startEditing = (user) => {
    setEditingUser(user._id);
    setEditFormData({ name: user.name, email: user.email, password: '' });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingUser(null);
    setEditFormData({ name: '', email: '', password: '' });
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }
      await axios.put(`${API_URL}/${editingUser}`, editFormData, {
        headers: { 'x-auth-token': token },
      });
      cancelEditing();
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.message || 'Failed to update user.');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    setError(null);
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = getAuthToken();
        if (!token) {
          setError('No authentication token found. Please log in.');
          return;
        }
        await axios.delete(`${API_URL}/${userId}`, {
          headers: { 'x-auth-token': token },
        });
        fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        setError(err.response?.data?.message || 'Failed to delete user.');
      }
    }
  };

  if (loading && view === 'list') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  // ✅ RENDER ADD USER "PAGE"
  if (view === 'add') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Add New User</h1>
            <button
              onClick={() => setView('list')}
              className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to List
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={newUser.name}
                onChange={handleNewUserChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter user's full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleNewUserChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleNewUserChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Minimum 6 characters"
                minLength="6"
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition flex-1 flex justify-center items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Create User
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition flex-1 flex justify-center items-center"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ✅ RENDER USER LIST "PAGE"
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-800">User Management</h1>
          <button
            onClick={() => setView('add')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium transition flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add New User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8 flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Existing Users</h2>
          </div>
          <div className="p-6">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <p className="text-gray-500 text-lg">No users found.</p>
                <button
                  onClick={() => setView('add')}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Add your first user
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {users.map((user) => (
                  <li
                    key={user._id}
                    className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition group bg-gray-50"
                  >
                    {editingUser === user._id ? (
                      <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditFormChange}
                          className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Name"
                          required
                        />
                        <input
                          type="email"
                          name="email"
                          value={editFormData.email}
                          onChange={handleEditFormChange}
                          className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Email"
                          required
                        />
                        <input
                          type="password"
                          name="password"
                          placeholder="New Password (optional)"
                          value={editFormData.password}
                          onChange={handleEditFormChange}
                          className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="md:col-span-3 flex flex-col sm:flex-row gap-3 mt-3">
                          <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition flex-1 flex justify-center"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-medium transition flex-1 flex justify-center"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-800 text-lg">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => startEditing(user)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;