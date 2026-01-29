import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  Receipt,
  AlertCircle,
  Menu,
  X,
  Package, // 💡 Import a suitable icon for Kits
} from "lucide-react";

interface SideNavProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SideNav: React.FC<SideNavProps> = ({ isOpen: isVisible, setIsOpen: setIsVisible }) => {
  const { user } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);

  const allNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, permission: null },
    { path: "/dashboard-v3", label: "Dashboard V3", icon: LayoutDashboard, permission: null },
    { path: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers:view" },
    { path: "/bills", label: "Bills", icon: FileText, permission: null },
    { path: "/invoices", label: "Invoices", icon: Receipt, permission: null },
    { path: "/products", label: "Products", icon: LayoutDashboard, permission: "products:view" },
    { path: "/kits", label: "Kits", icon: Package, permission: "kits:view" }, // 💡 Added Kits link
    { path: "/dues", label: "Dues", icon: AlertCircle, permission: null },
    { path: "/users", label: "Users", icon: Users, permission: "users:view" },
    { path: "/admin/shop-profile", label: "Shop Profile", icon: LayoutDashboard, permission: "shop-profile:edit" },
  ];

  const navItems = allNavItems.filter(item => {
    if (!item.permission) {
      return true;
    }
    if (user?.role === 'Admin') {
      return true;
    }
    return user?.permissions?.includes(item.permission);
  });

  return (
    <div
      className={`${
        isExpanded ? "w-64" : "w-20"
      } bg-gray-900 text-gray-200 h-screen transition-all duration-300 flex flex-col shadow-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <h2
          className={` items-center text-2xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500  transition-all ${
            isExpanded ? "opacity-100" : "opacity-0 w-0"
          }`}
        >
          BMS 
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-md hover:bg-gray-800 transition"
        >
          {isExpanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <ul className="flex-1 mt-4 space-y-2 px-3">
        {navItems.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                `flex items-center space-x-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg"
                    : "hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <Icon size={20} />
              {isExpanded && <span className="font-medium">{label}</span>}
            </NavLink>
          </li>
        ))}


      </ul>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
        {isExpanded ? "© 2025 BMS Portal" : "©"}
      </div>
    </div>
  );
};

export default SideNav;
