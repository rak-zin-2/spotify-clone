// hooks/useSupabaseSongs.ts
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export type Song = {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  audio_url: string;
  is_default: boolean;
  uploaded_by: string | null;
  created_at: string;
};

export function useSupabaseSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchSongs = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching songs:", error);
      setError(error.message);
    } else if (data && isMounted.current) {
      setSongs(data);
    }
    if (isMounted.current) setLoading(false);
  }, []);

  // Function to log user actions to admin_actions table
  const logUserAction = useCallback(async (actionType: string, details: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        console.log("Logging action:", actionType, details);
        const { error: logError } = await supabase.from('admin_actions').insert({
          user_id: userData.user.id,
          user_email: userData.user.email,
          user_name: userData.user.user_metadata?.username || userData.user.email?.split('@')[0],
          action_type: actionType,
          action_details: details,
          is_read: false,
          created_at: new Date().toISOString()
        });
        if (logError) {
          console.error("Error logging action:", logError);
        } else {
          console.log("Action logged successfully");
        }
      }
    } catch (error) {
      console.error("Error logging action:", error);
    }
  }, []);

  const addSong = useCallback(async (song: {
    title: string;
    artist: string;
    cover_url: string;
    audio_url: string;
  }) => {
    const { data, error } = await supabase
      .from('songs')
      .insert([{ 
        ...song, 
        is_default: false 
      }])
      .select();
    
    if (error) throw error;
    
    // Log the action
    if (data && data[0]) {
      console.log("Song added, logging action...");
      await logUserAction('add_song', {
        song_title: song.title,
        artist: song.artist,
        song_id: data[0].id
      });
    }
    
    await fetchSongs();
    return data;
  }, [fetchSongs, logUserAction]);

  const deleteSong = useCallback(async (songId: string, songTitle?: string, songArtist?: string) => {
    // Get song info before deleting if not provided
    let title = songTitle;
    let artist = songArtist;
    if (!title) {
      const song = songs.find(s => s.id === songId);
      title = song?.title;
      artist = song?.artist;
    }
    
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', songId);
    
    if (error) throw error;
    
    // Log the action
    await logUserAction('delete_song', {
      song_title: title || 'Unknown',
      artist: artist || 'Unknown',
      song_id: songId
    });
    
    await fetchSongs();
  }, [songs, fetchSongs, logUserAction]);

  const updateSong = useCallback(async (songId: string, updates: { 
    title?: string; 
    artist?: string; 
    cover_url?: string;
    audio_url?: string;
  }) => {
    // Get original song info before update
    const originalSong = songs.find(s => s.id === songId);
    
    const { error } = await supabase
      .from('songs')
      .update(updates)
      .eq('id', songId);
    
    if (error) throw error;
    
    // Log the action if title or artist changed
    if (updates.title || updates.artist) {
      await logUserAction('edit_song', {
        song_title: updates.title || originalSong?.title || 'Unknown',
        artist: updates.artist || originalSong?.artist || 'Unknown',
        song_id: songId,
        old_title: originalSong?.title,
        old_artist: originalSong?.artist
      });
    }
    
    await fetchSongs();
  }, [songs, fetchSongs, logUserAction]);

  const uploadAudioFile = useCallback(async (file: File, songId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `songs/${songId}/audio.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('song-audio')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('song-audio')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }, []);

  const uploadCoverImage = useCallback(async (file: File, songId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `songs/${songId}/cover.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('song-covers')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('song-covers')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchSongs();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchSongs]);

  return { 
    songs, 
    loading, 
    error, 
    addSong, 
    deleteSong,
    updateSong,
    uploadAudioFile,
    uploadCoverImage,
    refreshSongs: fetchSongs 
  };
}