// components/AdminNotificationCenter.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, User, Music, Plus, Trash2, Edit, Heart, Disc3, Clock, Mic, Trash } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type AdminAction = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action_type: 'create_playlist' | 'add_song' | 'delete_song' | 'edit_song' | 'like_song' | 'create_artist' | 'edit_artist' | 'delete_artist';
  action_details: any;
  created_at: string;
  is_read: boolean;
};

export default function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminAction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAdmin } = useSupabaseAuth();
  const isMounted = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin || !isMounted.current) return;

    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      if (data && isMounted.current) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [isAdmin]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      const { error } = await supabase
        .from('admin_actions')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) {
        console.error("Error marking as read:", error);
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking as read:", error);
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      
      const { error } = await supabase
        .from('admin_actions')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) {
        console.error("Error marking all as read:", error);
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      await fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  const deleteReadNotifications = useCallback(async () => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id);
    if (readIds.length === 0) {
      alert("No read notifications to delete");
      return;
    }
    
    if (confirm(`Delete ${readIds.length} read notification${readIds.length > 1 ? 's' : ''}? This action cannot be undone.`)) {
      try {
        const remainingNotifications = notifications.filter(n => !n.is_read);
        setNotifications(remainingNotifications);
        
        const { error } = await supabase
          .from('admin_actions')
          .delete()
          .in('id', readIds);
        
        if (error) {
          console.error("Error deleting notifications:", error);
          await fetchNotifications();
        }
      } catch (error) {
        console.error("Error deleting notifications:", error);
        await fetchNotifications();
      }
    }
  }, [notifications, fetchNotifications]);

  const deleteSingleNotification = useCallback(async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (confirm("Delete this notification permanently?")) {
      try {
        const notificationToDelete = notifications.find(n => n.id === notificationId);
        const wasUnread = notificationToDelete && !notificationToDelete.is_read;
        
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        const { error } = await supabase
          .from('admin_actions')
          .delete()
          .eq('id', notificationId);
        
        if (error) {
          console.error("Error deleting notification:", error);
          await fetchNotifications();
        }
      } catch (error) {
        console.error("Error deleting notification:", error);
        await fetchNotifications();
      }
    }
  }, [notifications, fetchNotifications]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_playlist':
        return <Plus size={14} className="text-green-400" />;
      case 'add_song':
        return <Music size={14} className="text-blue-400" />;
      case 'delete_song':
        return <Trash2 size={14} className="text-red-400" />;
      case 'edit_song':
        return <Edit size={14} className="text-yellow-400" />;
      case 'like_song':
        return <Heart size={14} className="text-pink-400" />;
      case 'create_artist':
        return <Mic size={14} className="text-purple-400" />;
      case 'edit_artist':
        return <Edit size={14} className="text-purple-400" />;
      case 'delete_artist':
        return <Trash2 size={14} className="text-red-400" />;
      default:
        return <Bell size={14} />;
    }
  };

  const getActionMessage = (notification: AdminAction) => {
    const userName = notification.user_name || notification.user_email?.split('@')[0] || 'User';
    
    switch (notification.action_type) {
      case 'create_playlist':
        return `${userName} created playlist "${notification.action_details?.playlist_name || 'Unknown'}"`;
      case 'add_song':
        return `${userName} added song "${notification.action_details?.song_title || 'Unknown'}" by ${notification.action_details?.artist || 'Unknown'}`;
      case 'delete_song':
        return `${userName} deleted song "${notification.action_details?.song_title || 'Unknown'}"`;
      case 'edit_song':
        return `${userName} edited song "${notification.action_details?.song_title || 'Unknown'}"`;
      case 'like_song':
        return `${userName} liked song "${notification.action_details?.song_title || 'Unknown'}"`;
      case 'create_artist':
        return `${userName} created artist "${notification.action_details?.artist_name || 'Unknown'}"`;
      case 'edit_artist':
        return `${userName} edited artist "${notification.action_details?.artist_name || 'Unknown'}"`;
      case 'delete_artist':
        return `${userName} deleted artist "${notification.action_details?.artist_name || 'Unknown'}"`;
      default:
        return `${userName} performed an action`;
    }
  };

  // Fixed useEffect to prevent infinite loop
  useEffect(() => {
    if (!isAdmin) return;

    isMounted.current = true;
    
    // Only initialize once
    if (!initialized.current) {
      initialized.current = true;
      fetchNotifications();
    }
    
    // Set up interval for periodic refresh with longer delay
    intervalRef.current = setInterval(() => {
      if (isMounted.current && isAdmin) {
        fetchNotifications();
      }
    }, 30000); // Increased to 30 seconds to reduce updates
    
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAdmin, fetchNotifications]);

  if (!isAdmin) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const readCount = notifications.filter(n => n.is_read).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50 max-h-[500px] overflow-hidden"
          >
            <div className="p-3 border-b border-white/10 sticky top-0 bg-gray-900/95">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">Admin Dashboard</h3>
                  <p className="text-xs text-gray-400">User Activity Tracker</p>
                </div>
                <div className="flex gap-1">
                  {readCount > 0 && (
                    <button
                      onClick={deleteReadNotifications}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 transition text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                      title="Delete all read notifications"
                    >
                      <Trash size={14} />
                      <span className="hidden sm:inline">Clear Read</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    Mark all read
                  </button>
                )}
                {readCount > 0 && (
                  <span className="text-xs text-gray-500">
                    {readCount} read
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-white/10 max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm">No notifications</p>
                  <p className="text-gray-500 text-xs mt-1">User actions will appear here</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-white/5 transition cursor-pointer group relative ${!notification.is_read ? 'bg-blue-500/5' : 'opacity-75'}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3 pr-8">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-gray-300">
                            {notification.user_email?.split('@')[0] || 'User'}
                          </span>
                          <div className="w-4 h-4 flex items-center justify-center">
                            {getActionIcon(notification.action_type)}
                          </div>
                        </div>
                        <p className="text-sm text-white mb-1 pr-2">
                          {getActionMessage(notification)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock size={10} className="text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteSingleNotification(notification.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition hover:bg-red-500/20"
                      title="Delete notification permanently"
                      aria-label="Delete notification"
                    >
                      <Trash size={14} className="text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-white/10 bg-blue-500/10">
              <p className="text-xs text-blue-400 text-center">
                👑 Notifications are permanently deleted from database
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}