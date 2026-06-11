// hooks/useSupabaseAuth.ts
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type UserType = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: 'admin' | 'user';
};

export function useSupabaseAuth() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: any) => {
    // Check if user is admin by email
    const isAdmin = authUser.email === 'virak@gmail.com';
    
    setUser({
      id: authUser.id,
      name: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
      email: authUser.email,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.email?.[0] || 'U')}&background=4f7cff&color=fff`,
      role: isAdmin ? 'admin' : 'user',
    });
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { error, data } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { username } }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return { 
    user, 
    loading, 
    signIn, 
    signUp, 
    signOut, 
    isAdmin,
    currentUserId: user?.id || null
  };
}