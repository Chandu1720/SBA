import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import * as notificationService from "../../services/notificationService";
import { Notification } from "../../types/models";
import moment from "moment";

interface TopNavProps {
  toggleSidebar: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ toggleSidebar }) => {
  const { user, logout } = useUser();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        try {
          const unread = await notificationService.getUnreadNotifications();
          setNotifications(unread);
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        }
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await notificationService.markAsRead(notif._id);
      setNotifications(notifications.filter(n => n._id !== notif._id));
      setNotifMenuOpen(false);
      navigate(notif.link);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setNotifMenuOpen(false);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-gray-700 transition"
          >
            <Menu size={24} />
          </button>
          <Link
            to="/"
            className="text-2xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500"
          >
            BMS
          </Link>
        </div>

        <div className="hidden md:flex items-center bg-gray-800 px-3 py-2 rounded-lg w-1/3 border border-gray-700 focus-within:border-blue-500 transition">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent w-full text-sm focus:outline-none text-gray-200 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotifMenuOpen(!notifMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-700 transition relative"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {notifications.length}
                </span>
              )}
            </button>
            {notifMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 z-50">
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                  <h3 className="font-semibold">Notifications</h3>
                  <button onClick={handleMarkAllAsRead} className="text-sm text-blue-400 hover:underline">Mark all as read</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-700 transition cursor-pointer"
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full mt-1.5 ${notif.type === 'supplier_due' ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {moment(notif.createdAt).fromNow()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 py-4">No new notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 hover:bg-gray-800 px-2 py-1 rounded-lg transition"
              >
                <img
                  src={
                    user.avatar ||
                    `https://ui-avatars.com/api/?name=${user.name ? user.name.split(" ").join("+") : ""}&background=0D8ABC&color=fff`
                  }
                  alt="User avatar"
                  className="w-8 h-8 rounded-full"
                />
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="text-xs text-gray-400">{user.role}</span>
                </div>
                <ChevronDown size={16} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700 transition"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={16} /> Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700 transition"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={16} /> Settings
                  </Link>
                  <hr className="border-gray-700 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-blue-400 transition">
                Login
              </Link>
              <Link to="/signup" className="hover:text-blue-400 transition">
                Signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
