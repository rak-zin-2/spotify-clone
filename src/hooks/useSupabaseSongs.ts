// hooks/useSupabaseSongs.ts
"use client";

import { useEffect, useState } from 'react';
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

  const fetchSongs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching songs:", error);
      setError(error.message);
    } else if (data) {
      setSongs(data);
    }
    setLoading(false);
  };

  const addSong = async (song: {
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
    await fetchSongs();
    return data;
  };

  const deleteSong = async (songId: string) => {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', songId);
    
    if (error) throw error;
    await fetchSongs();
  };

  const updateSong = async (songId: string, updates: { 
    title?: string; 
    artist?: string; 
    cover_url?: string;
    audio_url?: string;
  }) => {
    const { error } = await supabase
      .from('songs')
      .update(updates)
      .eq('id', songId);
    
    if (error) throw error;
    await fetchSongs();
  };

  const uploadAudioFile = async (file: File, songId: string): Promise<string> => {
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
  };

  const uploadCoverImage = async (file: File, songId: string): Promise<string> => {
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
  };

  useEffect(() => {
    fetchSongs();
  }, []);

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