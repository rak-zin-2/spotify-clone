// hooks/useSupabaseLikedSongs.ts
"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';

export function useSupabaseLikedSongs() {
  const [likedSongTitles, setLikedSongTitles] = useState<string[]>([]);
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

  const fetchLikedSongs = useCallback(async () => {
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
  }, [currentUserId]);

  const toggleLike = useCallback(async (songTitle: string) => {
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
        // Log the like action
        await logUserAction('like_song', {
          song_title: songTitle,
          song_id: songData.id
        });
      }
    }
  }, [currentUserId, likedSongTitles, logUserAction]);

  const isLiked = useCallback((songTitle: string) => likedSongTitles.includes(songTitle), [likedSongTitles]);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  return { 
    likedSongs: likedSongTitles, 
    toggleLike, 
    isLiked, 
    refreshLikedSongs: fetchLikedSongs,
    loading 
  };
}