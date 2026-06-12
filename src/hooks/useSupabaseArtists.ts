// hooks/useSupabaseArtists.ts
"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';

export type Artist = {
  id: string;
  name: string;
  cover_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export function useSupabaseArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useSupabaseAuth();

  const fetchArtists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to check if a song belongs to an artist - NO MODIFICATION, JUST CHECKING
  // This is what makes songs automatically appear in artist folders!
  const songBelongsToArtist = useCallback((songArtist: string, artistName: string): boolean => {
    // Exact match (case insensitive)
    if (songArtist.toLowerCase() === artistName.toLowerCase()) {
      return true;
    }
    
    // Check if artist name appears in the comma-separated list
    // This handles "Ariana Grande, Altare" -> matches "Ariana Grande" AND "Altare"
    const artistsList = songArtist.split(',').map(a => a.trim().toLowerCase());
    
    // Check if the artist name matches any in the list
    if (artistsList.includes(artistName.toLowerCase())) {
      return true;
    }
    
    return false;
  }, []);

  // Get songs that belong to a specific artist - READ ONLY
  const getSongsForArtist = useCallback(async (artistName: string): Promise<any[]> => {
    try {
      const { data: allSongs, error } = await supabase
        .from('songs')
        .select('*');
      
      if (error) throw error;
      
      // Filter songs where the artist name matches (handling comma-separated values)
      const matchedSongs = allSongs.filter(song => 
        songBelongsToArtist(song.artist, artistName)
      );
      
      return matchedSongs;
    } catch (error) {
      console.error("Error fetching songs for artist:", error);
      return [];
    }
  }, [songBelongsToArtist]);

  const createArtist = useCallback(async (name: string, coverFile?: File | null, bio?: string | null) => {
    if (!isAdmin) {
      console.error("Only admins can create artists");
      alert("Only admins can create artists");
      return null;
    }

    try {
      console.log("Creating artist with data:", { name, bio });
      
      // Check if artist already exists
      const { data: existing } = await supabase
        .from('artists')
        .select('id')
        .eq('name', name.trim())
        .single();
      
      if (existing) {
        alert(`Artist "${name}" already exists!`);
        return null;
      }
      
      const { data, error } = await supabase
        .from('artists')
        .insert({ name: name.trim(), bio: bio || null })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        if (error.code === '23505') {
          alert(`Artist "${name}" already exists!`);
        } else {
          alert(`Error creating artist: ${error.message}`);
        }
        throw error;
      }

      console.log("Artist created:", data);

      if (coverFile && data) {
        const coverUrl = await uploadArtistCover(coverFile, data.id);
        if (coverUrl) {
          await supabase
            .from('artists')
            .update({ cover_url: coverUrl })
            .eq('id', data.id);
          data.cover_url = coverUrl;
        }
      }

      await fetchArtists();
      
      alert(`✅ Artist "${name}" created successfully!`);
      return data;
    } catch (error) {
      console.error("Error creating artist:", error);
      return null;
    }
  }, [isAdmin, fetchArtists]);

  const updateArtist = useCallback(async (artistId: string, updates: { name?: string; bio?: string | null; cover_url?: string | null }) => {
    if (!isAdmin) return;

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.cover_url !== undefined) updateData.cover_url = updates.cover_url;
      
      const { error } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id', artistId);

      if (error) throw error;
      
      await fetchArtists();
    } catch (error) {
      console.error("Error updating artist:", error);
    }
  }, [isAdmin, fetchArtists]);

  const deleteArtist = useCallback(async (artistId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', artistId);

      if (error) throw error;
      await fetchArtists();
    } catch (error) {
      console.error("Error deleting artist:", error);
    }
  }, [isAdmin, fetchArtists]);

  const uploadArtistCover = useCallback(async (file: File, artistId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `artists/${artistId}/cover.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('artist-covers')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('artist-covers')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error("Error uploading artist cover:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  return {
    artists,
    loading,
    createArtist,
    updateArtist,
    deleteArtist,
    uploadArtistCover,
    refreshArtists: fetchArtists,
    getSongsForArtist,
    songBelongsToArtist,
  };
}