import React, { useEffect, useState } from 'react';
import { Permission } from '../../types/models';
import { getPermissions, getUserPermissions, updateUserPermissions } from '../../services/permissionService';
import toast from 'react-hot-toast';

interface PermissionManagerProps {
  userId: string;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ userId }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const permissionsData = await getPermissions();
        setPermissions(permissionsData);
      } catch (error) {
        toast.error('Failed to load permissions.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchUserPermissions = async () => {
        try {
          const userPermissionsData = await getUserPermissions(userId);
          setUserPermissions(userPermissionsData.map(p => p._id!));
        } catch (error) {
          toast.error("Failed to load user's permissions.");
        }
      };
      fetchUserPermissions();
    } else {
      setUserPermissions([]);
    }
  }, [userId]);

  const handlePermissionChange = (permissionId: string) => {
    setUserPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSaveChanges = async () => {
    if (!userId) return;
    try {
      await updateUserPermissions(userId, userPermissions);
      toast.success('Permissions updated successfully!');
    } catch (error) {
      toast.error('Failed to update permissions.');
    }
  };

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Permission Management</h2>
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {permissions.map(permission => (
            <div key={permission._id} className="flex items-center">
              <input
                id={`perm-${permission._id}`}
                type="checkbox"
                checked={userPermissions.includes(permission._id!)}
                onChange={() => handlePermissionChange(permission._id!)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor={`perm-${permission._id}`} className="ml-2 block text-sm text-gray-900">
                {permission.name}
              </label>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button
            onClick={handleSaveChanges}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
