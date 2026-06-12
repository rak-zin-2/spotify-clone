// hooks/useSupabasePlaylist.ts
"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';

export type Playlist = {
  id: string;
  name: string;
  user_id: string;
  cover_url: string | null;
  created_at: string;
  songs: string[];
};

export function useSupabasePlaylist() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUserId } = useSupabaseAuth();

  // Function to log user actions
  const logUserAction = useCallback(async (actionType: string, details: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('admin_actions').insert({
          user_id: userData.user.id,
          user_email: userData.user.email,
          user_name: userData.user.user_metadata?.username || userData.user.email?.split('@')[0],
          action_type: actionType,
          action_details: details,
        });
      }
    } catch (error) {
      console.error("Error logging action:", error);
    }
  }, []);

  const fetchPlaylists = useCallback(async () => {
    if (!currentUserId) {
      setPlaylists([]);
      setLoading(false);
      return;
    }

    try {
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (playlistError) throw playlistError;

      if (!playlistData) {
        setPlaylists([]);
        setLoading(false);
        return;
      }

      const playlistsWithSongs = await Promise.all(
        playlistData.map(async (playlist) => {
          const { data: songData } = await supabase
            .from('playlist_songs')
            .select('song_id')
            .eq('playlist_id', playlist.id);

          let songTitles: string[] = [];
          if (songData && songData.length > 0) {
            const songIds = songData.map(ps => ps.song_id);
            const { data: songs } = await supabase
              .from('songs')
              .select('title')
              .in('id', songIds);
            if (songs) {
              songTitles = songs.map(s => s.title);
            }
          }

          return {
            ...playlist,
            songs: songTitles,
          };
        })
      );

      setPlaylists(playlistsWithSongs);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const uploadPlaylistCover = useCallback(async (file: File, playlistId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `playlists/${playlistId}/cover.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('playlist-covers')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('playlist-covers')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error("Error uploading cover:", error);
      return null;
    }
  }, []);

  const createPlaylist = useCallback(async (name: string, coverFile?: File | null) => {
    if (!currentUserId) return null;
    
    const { data, error } = await supabase
      .from('playlists')
      .insert({ name, user_id: currentUserId })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the action
    await logUserAction('create_playlist', {
      playlist_name: name,
      playlist_id: data.id
    });
    
    if (coverFile && data) {
      const coverUrl = await uploadPlaylistCover(coverFile, data.id);
      if (coverUrl) {
        await supabase
          .from('playlists')
          .update({ cover_url: coverUrl })
          .eq('id', data.id);
        data.cover_url = coverUrl;
      }
    }
    
    await fetchPlaylists();
    return data;
  }, [currentUserId, logUserAction, uploadPlaylistCover, fetchPlaylists]);

  const updatePlaylist = useCallback(async (playlistId: string, updates: { name?: string; cover_url?: string }) => {
    const { error } = await supabase
      .from('playlists')
      .update(updates)
      .eq('id', playlistId);
    
    if (error) throw error;
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const addSongToPlaylist = useCallback(async (playlistId: string, songTitle: string) => {
    const { data: songData } = await supabase
      .from('songs')
      .select('id, cover_url')
      .eq('title', songTitle)
      .single();
    
    if (!songData) return;

    const { data: existing } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', playlistId)
      .eq('song_id', songData.id);
    
    if (existing && existing.length > 0) return;

    const { error } = await supabase
      .from('playlist_songs')
      .insert({ playlist_id: playlistId, song_id: songData.id });
    
    if (error) throw error;
    
    const { data: playlist } = await supabase
      .from('playlists')
      .select('cover_url')
      .eq('id', playlistId)
      .single();
    
    if (!playlist?.cover_url && songData.cover_url) {
      await supabase
        .from('playlists')
        .update({ cover_url: songData.cover_url })
        .eq('id', playlistId);
    }
    
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const removeSongFromPlaylist = useCallback(async (playlistId: string, songTitle: string) => {
    const { data: songData } = await supabase
      .from('songs')
      .select('id')
      .eq('title', songTitle)
      .single();
    
    if (!songData) return;

    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', songData.id);
    
    if (error) throw error;
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const renamePlaylist = useCallback(async (playlistId: string, newName: string) => {
    const { error } = await supabase
      .from('playlists')
      .update({ name: newName })
      .eq('id', playlistId);
    
    if (error) throw error;
    await fetchPlaylists();
  }, [fetchPlaylists]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);
    
    if (error) throw error;
    await fetchPlaylists();
  }, [fetchPlaylists]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    playlists,
    loading,
    createPlaylist,
    updatePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    renamePlaylist,
    deletePlaylist,
    uploadPlaylistCover,
    refreshPlaylists: fetchPlaylists,
  };
}