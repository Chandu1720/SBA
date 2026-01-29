import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserById } from '../../services/userService';
import { User } from '../../types/models';
import PermissionManager from './PermissionManager';
import { useUser } from '../../context/UserContext';

const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: loggedInUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) {
        setError('User ID is not provided');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const userData = await getUserById(id);
        setUser(userData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch user details');
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Details</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="mb-2"><strong>Name:</strong> {user.name}</p>
        <p className="mb-2"><strong>Email:</strong> {user.email}</p>
        {/* Add other user fields as necessary */}
      </div>

      {loggedInUser?.role === 'Admin' && id && <PermissionManager userId={id} />}

      <Link to="/users" className="text-blue-500 hover:underline mt-4 inline-block">
        Back to Users
      </Link>
    </div>
  );
};

export default UserDetails;
