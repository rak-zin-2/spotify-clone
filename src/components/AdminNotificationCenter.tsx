"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, User, Music, Plus, Trash2, Edit, Heart } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabasePlaylist } from "@/hooks/useSupabasePlaylist";
import { useSupabaseLikedSongs } from "@/hooks/useSupabaseLikedSongs";

// Since we're using Supabase, we don't need the old pending changes system
// This component is simplified for admin notifications

export default function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAdmin } = useSupabaseAuth();
  const { playlists, refreshPlaylists } = useSupabasePlaylist();
  const { likedSongs, refreshLikedSongs } = useSupabaseLikedSongs();

  // For demo purposes, we'll show some example notifications
  // In a real app, you'd fetch these from a notifications table
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      // You can fetch real notifications from Supabase here
      // For now, we'll just show that everything is synced
      setUnreadCount(0);
    }
  }, [isAdmin]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "playlist": return <Music size={14} className="text-blue-400" />;
      case "like": return <Heart size={14} className="text-pink-400" />;
      default: return <Music size={14} />;
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition"
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
            className="absolute top-full right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50"
            style={{ right: 0, left: 'auto' }}
          >
            <div className="p-3 border-b border-white/10 sticky top-0 bg-gray-900/95">
              <h3 className="font-semibold text-white">Admin Panel</h3>
              <p className="text-xs text-gray-400">Supabase is now live</p>
            </div>

            <div className="divide-y divide-white/10">
              <div className="p-3 hover:bg-white/5 transition">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white">Supabase Connected</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Your data is now synced to the cloud
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 hover:bg-white/5 transition">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Music size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white">Playlists Ready</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {playlists.length} playlists available
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 hover:bg-white/5 transition">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Heart size={14} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white">Liked Songs Ready</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {likedSongs.length} liked songs
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border-t border-blue-500/20">
                <p className="text-xs text-blue-400 text-center">
                  ✅ All data is now stored in Supabase cloud
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}