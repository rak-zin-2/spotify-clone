// hooks/useSupabaseLikedSongs.ts
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';

export function useSupabaseLikedSongs() {
  const [likedSongTitles, setLikedSongTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUserId } = useSupabaseAuth();

  const fetchLikedSongs = async () => {
    if (!currentUserId) {
      setLikedSongTitles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('song_id')
        .eq('user_id', currentUserId);

      if (error) throw error;

      if (data && data.length > 0) {
        const songIds = data.map(ls => ls.song_id);
        const { data: songs } = await supabase
          .from('songs')
          .select('title')
          .in('id', songIds);
        
        if (songs) {
          setLikedSongTitles(songs.map(s => s.title));
        } else {
          setLikedSongTitles([]);
        }
      } else {
        setLikedSongTitles([]);
      }
    } catch (error) {
      console.error("Error fetching liked songs:", error);
      setLikedSongTitles([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (songTitle: string) => {
    if (!currentUserId) return;

    // Find song ID
    const { data: songData } = await supabase
      .from('songs')
      .select('id')
      .eq('title', songTitle)
      .single();
    
    if (!songData) return;

    const isCurrentlyLiked = likedSongTitles.includes(songTitle);

    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from('liked_songs')
        .delete()
        .eq('user_id', currentUserId)
        .eq('song_id', songData.id);
      
      if (!error) {
        setLikedSongTitles(prev => prev.filter(t => t !== songTitle));
      }
    } else {
      const { error } = await supabase
        .from('liked_songs')
        .insert({ user_id: currentUserId, song_id: songData.id });
      
      if (!error) {
        setLikedSongTitles(prev => [...prev, songTitle]);
      }
    }
  };

  const isLiked = (songTitle: string) => likedSongTitles.includes(songTitle);

  useEffect(() => {
    fetchLikedSongs();
  }, [currentUserId]);

  return { 
    likedSongs: likedSongTitles, 
    toggleLike, 
    isLiked, 
    refreshLikedSongs: fetchLikedSongs,
    loading 
  };
}