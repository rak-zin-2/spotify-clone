"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, User, Music, Plus, Trash2, Edit, Heart } from "lucide-react";
import { usePendingChanges, PendingChange } from "@/hooks/usePendingChanges";
import { useAuth } from "@/hooks/useAuth";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useLikedSongs } from "@/hooks/useLikedSongs";

// List of all regular user IDs (non-admin)
const ALL_USER_IDS = ["user-1", "user-2", "user-3", "user-4"];

export default function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAdmin } = useAuth();
  const { pendingChanges, approveChange, rejectChange, getPendingChanges } = usePendingChanges();
  const { addSongToPlaylist, removeSongFromPlaylist, createPlaylist, renamePlaylist, deletePlaylist } = usePlaylist();
  const { toggleLike } = useLikedSongs();

  // Function to sync data to all users
  const syncToAllUsers = useCallback((type: string, data: any) => {
    for (const userId of ALL_USER_IDS) {
      const storageKey = type === "playlist" 
        ? `pavpav_${userId}_playlists`
        : `pavpav_${userId}_likedSongs`;
      
      let currentData = localStorage.getItem(storageKey);
      let parsedData = currentData ? JSON.parse(currentData) : (type === "playlist" ? [] : []);
      
      switch (type) {
        case "create_playlist":
          parsedData.push(data.newPlaylist);
          break;
        case "add_song":
          parsedData = parsedData.map((p: any) => {
            if (p.id === data.playlistId && !p.songs.includes(data.songTitle)) {
              return { ...p, songs: [...p.songs, data.songTitle] };
            }
            return p;
          });
          break;
        case "remove_song":
          parsedData = parsedData.map((p: any) => {
            if (p.id === data.playlistId) {
              return { ...p, songs: p.songs.filter((s: string) => s !== data.songTitle) };
            }
            return p;
          });
          break;
        case "rename_playlist":
          parsedData = parsedData.map((p: any) => {
            if (p.id === data.playlistId) {
              return { ...p, name: data.newName };
            }
            return p;
          });
          break;
        case "delete_playlist":
          parsedData = parsedData.filter((p: any) => p.id !== data.playlistId);
          break;
        case "like_song":
          if (!parsedData.includes(data.songTitle)) {
            parsedData.push(data.songTitle);
          }
          break;
        case "unlike_song":
          parsedData = parsedData.filter((s: string) => s !== data.songTitle);
          break;
      }
      
      localStorage.setItem(storageKey, JSON.stringify(parsedData));
    }
    
    // Also update admin's global data
    const adminPlaylistKey = "pavpav_global_playlists";
    const adminLikedKey = "pavpav_global_likedSongs";
    
    if (type === "playlist") {
      let adminPlaylists = localStorage.getItem(adminPlaylistKey);
      let parsedAdminPlaylists = adminPlaylists ? JSON.parse(adminPlaylists) : [];
      
      switch (data.action) {
        case "create":
          parsedAdminPlaylists.push(data.newPlaylist);
          break;
        case "add_song":
          parsedAdminPlaylists = parsedAdminPlaylists.map((p: any) => {
            if (p.id === data.playlistId && !p.songs.includes(data.songTitle)) {
              return { ...p, songs: [...p.songs, data.songTitle] };
            }
            return p;
          });
          break;
        case "remove_song":
          parsedAdminPlaylists = parsedAdminPlaylists.map((p: any) => {
            if (p.id === data.playlistId) {
              return { ...p, songs: p.songs.filter((s: string) => s !== data.songTitle) };
            }
            return p;
          });
          break;
        case "rename":
          parsedAdminPlaylists = parsedAdminPlaylists.map((p: any) => {
            if (p.id === data.playlistId) {
              return { ...p, name: data.newName };
            }
            return p;
          });
          break;
        case "delete":
          parsedAdminPlaylists = parsedAdminPlaylists.filter((p: any) => p.id !== data.playlistId);
          break;
      }
      localStorage.setItem(adminPlaylistKey, JSON.stringify(parsedAdminPlaylists));
    } else if (type === "liked") {
      let adminLiked = localStorage.getItem(adminLikedKey);
      let parsedAdminLiked = adminLiked ? JSON.parse(adminLiked) : [];
      
      if (data.action === "like" && !parsedAdminLiked.includes(data.songTitle)) {
        parsedAdminLiked.push(data.songTitle);
      } else if (data.action === "unlike") {
        parsedAdminLiked = parsedAdminLiked.filter((s: string) => s !== data.songTitle);
      }
      localStorage.setItem(adminLikedKey, JSON.stringify(parsedAdminLiked));
    }
  }, []);

  const handleApprove = useCallback(async (change: PendingChange) => {
    switch (change.type) {
      case "create_playlist":
        const newPlaylist = {
          id: crypto.randomUUID(),
          name: change.data.name,
          songs: [],
          cover: "",
          createdAt: new Date().toISOString(),
        };
        syncToAllUsers("playlist", { action: "create", newPlaylist });
        break;
      case "add_song":
        syncToAllUsers("playlist", { action: "add_song", playlistId: change.data.playlistId, songTitle: change.data.songTitle });
        break;
      case "remove_song":
        syncToAllUsers("playlist", { action: "remove_song", playlistId: change.data.playlistId, songTitle: change.data.songTitle });
        break;
      case "rename_playlist":
        syncToAllUsers("playlist", { action: "rename", playlistId: change.data.playlistId, newName: change.data.newName });
        break;
      case "delete_playlist":
        syncToAllUsers("playlist", { action: "delete", playlistId: change.data.playlistId });
        break;
      case "like_song":
        syncToAllUsers("liked", { action: "like", songTitle: change.data.songTitle });
        break;
      case "unlike_song":
        syncToAllUsers("liked", { action: "unlike", songTitle: change.data.songTitle });
        break;
    }
    
    approveChange(change.id);
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [syncToAllUsers, approveChange]);

  const handleReject = useCallback((changeId: string) => {
    rejectChange(changeId);
  }, [rejectChange]);

  useEffect(() => {
    if (isAdmin) {
      const pending = getPendingChanges();
      setUnreadCount(pending.length);
    }
  }, [isAdmin, pendingChanges, getPendingChanges]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "create_playlist": return <Plus size={14} className="text-green-400" />;
      case "add_song": return <Music size={14} className="text-blue-400" />;
      case "remove_song": return <Trash2 size={14} className="text-red-400" />;
      case "rename_playlist": return <Edit size={14} className="text-yellow-400" />;
      case "delete_playlist": return <Trash2 size={14} className="text-red-400" />;
      case "like_song": return <Heart size={14} className="text-pink-400" />;
      case "unlike_song": return <Heart size={14} className="text-gray-400" />;
      default: return <Music size={14} />;
    }
  };

  const getActionText = (change: PendingChange) => {
    switch (change.type) {
      case "create_playlist":
        return `wants to create playlist "${change.data.name}" for everyone`;
      case "add_song":
        return `wants to add "${change.data.songTitle}" to a playlist for everyone`;
      case "remove_song":
        return `wants to remove "${change.data.songTitle}" from a playlist for everyone`;
      case "rename_playlist":
        return `wants to rename playlist to "${change.data.newName}" for everyone`;
      case "delete_playlist":
        return `wants to delete playlist for everyone`;
      case "like_song":
        return `wants to like "${change.data.songTitle}" for everyone`;
      case "unlike_song":
        return `wants to unlike "${change.data.songTitle}" for everyone`;
      default:
        return "made a change request for everyone";
    }
  };

  if (!isAdmin) return null;

  const pending = getPendingChanges();

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

      {/* Dropdown - opens to the RIGHT to avoid sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50 max-h-96 overflow-y-auto"
            style={{ right: 0, left: 'auto' }}
          >
            <div className="p-3 border-b border-white/10 sticky top-0 bg-gray-900/95">
              <h3 className="font-semibold text-white">Change Requests</h3>
              <p className="text-xs text-gray-400">Approve to apply changes to ALL users</p>
            </div>

            <div className="divide-y divide-white/10">
              {pending.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending requests</p>
                  <p className="text-xs">User changes will appear here</p>
                </div>
              ) : (
                pending.map((change) => (
                  <div key={change.id} className="p-3 hover:bg-white/5 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getActionIcon(change.type)}
                          <p className="text-sm font-medium text-white truncate">
                            {change.userName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(change.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {getActionText(change)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleApprove(change)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 hover:bg-green-500/30 transition text-green-400 text-xs"
                          >
                            <Check size={12} />
                            Approve for All
                          </button>
                          <button
                            onClick={() => handleReject(change.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 transition text-red-400 text-xs"
                          >
                            <X size={12} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}