"use client";

import { useEffect, useState } from "react";
import { Playlist } from "@/types/playlist";
import { songs } from "@/data/songs";
import { useAuth } from "./useAuth";
import { usePendingChanges } from "./usePendingChanges";

export function usePlaylist() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentUserId, isAdmin } = useAuth();
  const { submitChangeRequest } = usePendingChanges();

  // Function to dispatch playlist change event
  const dispatchPlaylistChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('playlistChanged'));
    }
  };

  // Get storage key based on user role
  const getStorageKey = () => {
    if (isAdmin) {
      return "pavpav_global_playlists";
    }
    return currentUserId ? `pavpav_${currentUserId}_playlists` : null;
  };

  // Function to sync all users' data with admin data
  const syncAllUsersWithAdmin = (adminPlaylists: Playlist[]) => {
    const userIds = ["user-1", "user-2", "user-3", "user-4"];
    
    userIds.forEach(userId => {
      const userKey = `pavpav_${userId}_playlists`;
      localStorage.setItem(userKey, JSON.stringify(adminPlaylists));
    });
  };

  // Load playlists based on user role
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      setPlaylists([]);
      setIsLoaded(true);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlaylists(parsed);
      } catch (error) {
        console.error("Failed to parse playlists:", error);
        setPlaylists([]);
      }
    } else {
      setPlaylists([]);
      localStorage.setItem(storageKey, JSON.stringify([]));
    }
    setIsLoaded(true);
  }, [currentUserId, isAdmin]);

  // Save playlists - if admin, sync to all users
  useEffect(() => {
    if (isLoaded && playlists) {
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(playlists));
        
        if (isAdmin) {
          syncAllUsersWithAdmin(playlists);
        }
      }
    }
  }, [playlists, isLoaded, currentUserId, isAdmin]);

  const createPlaylist = (name: string) => {
    if (!name || name.trim() === "") return;
    
    if (isAdmin) {
      const newPlaylist: Playlist = {
        id: crypto.randomUUID(),
        name: name.trim(),
        songs: [],
        cover: "",
        createdAt: new Date().toISOString(),
      };
      setPlaylists((prev) => [...prev, newPlaylist]);
    } else {
      submitChangeRequest("create_playlist", { name: name.trim() });
      const newPlaylist: Playlist = {
        id: crypto.randomUUID(),
        name: name.trim(),
        songs: [],
        cover: "",
        createdAt: new Date().toISOString(),
      };
      setPlaylists((prev) => [...prev, newPlaylist]);
    }
    dispatchPlaylistChange();
  };

  const addSongToPlaylist = (playlistId: string, songTitle: string) => {
    if (isAdmin) {
      setPlaylists((prev) =>
        prev.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          if (playlist.songs.includes(songTitle)) return playlist;
          const song = songs.find((s) => s.title === songTitle);
          return {
            ...playlist,
            songs: [...playlist.songs, songTitle],
            cover: playlist.cover || song?.cover || "",
          };
        })
      );
    } else {
      submitChangeRequest("add_song", { playlistId, songTitle });
      setPlaylists((prev) =>
        prev.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          if (playlist.songs.includes(songTitle)) return playlist;
          const song = songs.find((s) => s.title === songTitle);
          return {
            ...playlist,
            songs: [...playlist.songs, songTitle],
            cover: playlist.cover || song?.cover || "",
          };
        })
      );
    }
    dispatchPlaylistChange();
  };

  const removeSongFromPlaylist = (playlistId: string, songTitle: string) => {
    if (isAdmin) {
      setPlaylists((prev) =>
        prev.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          const updatedSongs = playlist.songs.filter((song) => song !== songTitle);
          return {
            ...playlist,
            songs: updatedSongs,
            cover: updatedSongs.length === 0 ? "" : playlist.cover,
          };
        })
      );
    } else {
      submitChangeRequest("remove_song", { playlistId, songTitle });
      setPlaylists((prev) =>
        prev.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          const updatedSongs = playlist.songs.filter((song) => song !== songTitle);
          return {
            ...playlist,
            songs: updatedSongs,
            cover: updatedSongs.length === 0 ? "" : playlist.cover,
          };
        })
      );
    }
    dispatchPlaylistChange();
  };

  const renamePlaylist = (playlistId: string, newName: string) => {
    if (!newName || newName.trim() === "") return;
    
    if (isAdmin) {
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId ? { ...playlist, name: newName.trim() } : playlist
        )
      );
    } else {
      const oldName = playlists.find(p => p.id === playlistId)?.name || "";
      submitChangeRequest("rename_playlist", { playlistId, newName: newName.trim(), oldName });
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId ? { ...playlist, name: newName.trim() } : playlist
        )
      );
    }
    dispatchPlaylistChange();
  };

  const deletePlaylist = (playlistId: string) => {
    if (isAdmin) {
      setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId));
    } else {
      const playlistName = playlists.find(p => p.id === playlistId)?.name || "";
      submitChangeRequest("delete_playlist", { playlistId, playlistName });
      setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId));
    }
    dispatchPlaylistChange();
  };

  // Function to reorder songs within a playlist
  const reorderPlaylistSongs = (playlistId: string, newOrder: string[]) => {
    setPlaylists((prev) =>
      prev.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        
        // Update the playlist with new song order
        const updatedPlaylist = { ...playlist, songs: newOrder };
        
        // Update cover to first song's cover if available
        if (newOrder.length > 0) {
          const firstSong = songs.find(s => s.title === newOrder[0]);
          if (firstSong) {
            updatedPlaylist.cover = firstSong.cover;
          }
        } else {
          updatedPlaylist.cover = "";
        }
        
        return updatedPlaylist;
      })
    );
    dispatchPlaylistChange();
  };

  return {
    playlists,
    setPlaylists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    renamePlaylist,
    deletePlaylist,
    reorderPlaylistSongs, // Add this new function
  };
}