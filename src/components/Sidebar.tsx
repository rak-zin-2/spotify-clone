// components/Sidebar.tsx
"use client";

import { House, Search, Library, Disc3, Heart, PlusCircle, ChevronLeft, ChevronRight, LogOut, ChevronDown, Mic, Edit2, Trash2, X, ImageIcon, Plus } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabasePlaylist } from "@/hooks/useSupabasePlaylist";
import { useSupabaseArtists } from "@/hooks/useSupabaseArtists";
import { useSupabaseSongs } from "@/hooks/useSupabaseSongs";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalSongs: number;
  onNavigateToLibrary?: () => void;
  onNavigateToLikedSongs?: () => void;
  onSelectArtist?: (artistName: string, songs: any[]) => void;
  user?: { name: string; email: string; picture?: string; role?: string } | null;
  onSignOut?: () => void;
  onSignIn?: () => void;
  isAdmin?: boolean;
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  totalSongs,
  onNavigateToLibrary,
  onNavigateToLikedSongs,
  onSelectArtist,
  user,
  onSignOut,
  onSignIn,
  isAdmin = false,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPlaylistsDropdown, setShowPlaylistsDropdown] = useState(false);
  const [showArtistsDropdown, setShowArtistsDropdown] = useState(false);
  const [showCreateArtistModal, setShowCreateArtistModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [artistName, setArtistName] = useState("");
  const [artistBio, setArtistBio] = useState("");
  const [artistCoverFile, setArtistCoverFile] = useState<File | null>(null);
  const [artistCoverPreview, setArtistCoverPreview] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for scrollable containers
  const artistsScrollRef = useRef<HTMLDivElement>(null);
  const playlistsScrollRef = useRef<HTMLDivElement>(null);
  
  const { playlists, refreshPlaylists } = useSupabasePlaylist();
  const { artists, createArtist, updateArtist, deleteArtist, uploadArtistCover, refreshArtists, songBelongsToArtist } = useSupabaseArtists();
  const { songs, refreshSongs } = useSupabaseSongs();
  const { isAdmin: isUserAdmin } = useSupabaseAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const [artistSongCounts, setArtistSongCounts] = useState<Map<string, number>>(new Map());

  // Update artist song counts
  useEffect(() => {
    const counts = new Map<string, number>();
    artists.forEach(artist => {
      const count = songs.filter(song => songBelongsToArtist(song.artist, artist.name)).length;
      counts.set(artist.id, count);
    });
    setArtistSongCounts(counts);
  }, [artists, songs]);

  // Listen for song changes
  useEffect(() => {
    const handleSongsUpdate = () => {
      refreshSongs();
    };

    const handlePlaylistUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('songsChanged', handleSongsUpdate);
    window.addEventListener('playlistChanged', handlePlaylistUpdate);
    
    return () => {
      window.removeEventListener('songsChanged', handleSongsUpdate);
      window.removeEventListener('playlistChanged', handlePlaylistUpdate);
    };
  }, [refreshSongs]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.artists-dropdown-trigger') && !target.closest('.artists-dropdown-content')) {
        setShowArtistsDropdown(false);
      }
      if (!target.closest('.playlists-dropdown-trigger') && !target.closest('.playlists-dropdown-content')) {
        setShowPlaylistsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollWindowToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleNavigation = (tabId: string) => {
    if (tabId === "home" && activeTab === "home") {
      scrollWindowToTop();
    } else if (tabId === "search" && activeTab === "search") {
      scrollWindowToTop();
    } else if (tabId === "artists" && activeTab === "artists") {
      scrollWindowToTop();
    } else {
      setActiveTab(tabId);
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: House },
    { id: "search", label: "Search", icon: Search },
    { id: "library", label: "Library", icon: Library },
    { id: "artists", label: "Artists", icon: Mic },
  ];

  const handleLibraryClick = () => {
    setActiveTab("library");
    onNavigateToLibrary?.();
  };

  const handleLikedSongsClick = () => {
    setActiveTab("library");
    onNavigateToLikedSongs?.();
  };

  const handlePlaylistClick = (playlistId: string) => {
    setActiveTab("library");
    onNavigateToLibrary?.();
    window.dispatchEvent(new CustomEvent('selectPlaylist', { detail: playlistId }));
  };

  const handleArtistClick = (artistName: string) => {
    const songsForArtist = songs.filter(song => songBelongsToArtist(song.artist, artistName));
    onSelectArtist?.(artistName, songsForArtist);
    setActiveTab("artists");
  };

  const handleCreateArtist = async () => {
    if (!artistName.trim()) return;
    await createArtist(artistName.trim(), artistCoverFile, artistBio || null);
    setArtistName("");
    setArtistBio("");
    setArtistCoverFile(null);
    setArtistCoverPreview("");
    setShowCreateArtistModal(false);
    await refreshArtists();
    await refreshSongs();
  };

  const handleUpdateArtist = async () => {
    if (!editingArtist || !artistName.trim()) return;
    
    let coverUrl: string | null = editingArtist.cover_url;
    if (artistCoverFile) {
      const uploadedUrl = await uploadArtistCover(artistCoverFile, editingArtist.id);
      if (uploadedUrl) coverUrl = uploadedUrl;
    }
    
    await updateArtist(editingArtist.id, {
      name: artistName.trim(),
      bio: artistBio || null,
      cover_url: coverUrl,
    });
    
    setEditingArtist(null);
    setArtistName("");
    setArtistBio("");
    setArtistCoverFile(null);
    setArtistCoverPreview("");
    await refreshArtists();
    await refreshSongs();
  };

  const handleEditArtist = (artist: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingArtist(artist);
    setArtistName(artist.name);
    setArtistBio(artist.bio || "");
    setArtistCoverPreview(artist.cover_url || "");
  };

  const handleDeleteArtist = async (artistId: string, artistName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete artist "${artistName}"? This action cannot be undone.`)) {
      await deleteArtist(artistId);
      await refreshArtists();
      await refreshSongs();
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setArtistCoverFile(file);
      setArtistCoverPreview(URL.createObjectURL(file));
    }
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:block fixed left-0 top-0 h-screen z-40"
      >
        <div className="h-full bg-gradient-to-b from-black/95 to-black/98 backdrop-blur-xl border-r border-white/10 flex flex-col">
          {/* Logo Section */}
          <div className={`p-6 flex ${isCollapsed ? 'justify-center flex-col items-center gap-3' : 'items-center justify-between'} flex-shrink-0`}>
            <div className={`flex ${isCollapsed ? 'flex-col items-center' : 'items-center gap-3'}`}>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Disc3 className="text-white" size={22} />
                </div>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black"
                  />
                )}
              </div>
              
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    PavPav
                  </h1>
                  <p className="text-gray-500 text-xs">Music Player</p>
                </motion.div>
              )}
            </div>

            {!isCollapsed && (
              <div className="ml-auto">
                {user ? (
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-2 py-1.5">
                    <img
                      src={user.picture || `https://ui-avatars.com/api/?name=${user.name}&background=4f7cff&color=fff`}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <button
                      onClick={onSignOut}
                      className="p-1 rounded-full hover:bg-white/10 transition"
                      title="Sign Out"
                    >
                      <LogOut size={14} className="text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSignIn}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition text-sm font-medium shadow-lg shadow-blue-500/30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign In
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center hover:bg-gray-700 transition-colors z-50"
          >
            {isCollapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronLeft size={12} className="text-gray-400" />}
          </button>

          {/* Collapsed User Profile */}
          {isCollapsed && (
            <div className="mt-4 flex flex-col items-center gap-3 flex-shrink-0">
              {user ? (
                <div className="relative group">
                  <img
                    src={user.picture || `https://ui-avatars.com/api/?name=${user.name}&background=4f7cff&color=fff`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover cursor-pointer"
                  />
                  <button
                    onClick={onSignOut}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSignIn}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 relative group"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Sign In
                  </span>
                </motion.button>
              )}
            </div>
          )}

          {/* Main Navigation - SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="space-y-1">
              {navItems.slice(0, 3).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <Icon size={22} className={isActive ? 'text-blue-400' : ''} />
                    {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                    {isActive && !isCollapsed && <motion.div layoutId="activeIndicator" className="ml-auto w-1 h-6 rounded-full bg-blue-500" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Artists Section in Desktop Sidebar */}
            {!isCollapsed && (
              <>
                <div className="my-6 h-px bg-white/10" />
                <div className="mt-4">
                  <div className="flex items-center justify-between px-3 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Artists</span>
                    {isAdmin && (
                      <button onClick={() => setShowCreateArtistModal(true)} className="p-1 rounded-md hover:bg-white/10 transition" title="Add Artist">
                        <PlusCircle size={14} className="text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div>
                    <motion.div 
                      whileHover={{ x: 4 }}
                      onClick={() => setShowArtistsDropdown(!showArtistsDropdown)}
                      className="artists-dropdown-trigger px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Mic size={14} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-300 group-hover:text-white transition">All Artists</p>
                          <p className="text-xs text-gray-500">{artists.length} artists</p>
                        </div>
                      </div>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showArtistsDropdown ? 'rotate-180' : ''}`} />
                    </motion.div>

                    <AnimatePresence>
                      {showArtistsDropdown && (
                        <motion.div
                          key={`artists-${refreshKey}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="artists-dropdown-content ml-9 mt-1 space-y-1 overflow-hidden"
                        >
                          <div 
                            ref={artistsScrollRef}
                            className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                          >
                            {artists.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500 italic">No artists yet</div>
                            ) : (
                              artists.map((artist) => {
                                const songCount = artistSongCounts.get(artist.id) || 0;
                                
                                return (
                                  <motion.div
                                    key={artist.id}
                                    whileHover={{ x: 4 }}
                                    className={`w-full rounded-lg transition-all duration-200 group/artist hover:bg-white/5`}
                                  >
                                    <div
                                      onClick={() => handleArtistClick(artist.name)}
                                      className="w-full text-left px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3"
                                    >
                                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30">
                                        {artist.cover_url ? (
                                          <img src={artist.cover_url} alt={artist.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Mic size={14} className="text-purple-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-300 truncate">{artist.name}</p>
                                        <p className="text-xs text-gray-500">{songCount} songs</p>
                                      </div>
                                      {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover/artist:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            onClick={(e) => handleEditArtist(artist, e)}
                                            className="p-1 rounded hover:bg-white/10"
                                            aria-label="Edit artist"
                                          >
                                            <Edit2 size={10} className="text-yellow-400" />
                                          </button>
                                          <button
                                            onClick={(e) => handleDeleteArtist(artist.id, artist.name, e)}
                                            className="p-1 rounded hover:bg-white/10"
                                            aria-label="Delete artist"
                                          >
                                            <Trash2 size={10} className="text-red-400" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            {!isCollapsed && <div className="my-6 h-px bg-white/10" />}

            {/* Playlists Section */}
            {!isCollapsed && (
              <div className="mt-4">
                <div className="flex items-center justify-between px-3 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Library</span>
                  <button onClick={handleLibraryClick} className="p-1 rounded-md hover:bg-white/10 transition" title="View all playlists">
                    <PlusCircle size={14} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <motion.div whileHover={{ x: 4 }} onClick={handleLikedSongsClick} className="px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Heart size={14} className="text-white fill-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-300 group-hover:text-white transition">Liked Songs</p>
                        <p className="text-xs text-gray-500">{totalSongs} songs</p>
                      </div>
                    </div>
                  </motion.div>

                  <div>
                    <motion.div 
                      whileHover={{ x: 4 }} 
                      onClick={() => setShowPlaylistsDropdown(!showPlaylistsDropdown)} 
                      className="playlists-dropdown-trigger px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <Library size={14} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-300 group-hover:text-white transition">All Playlists</p>
                          <p className="text-xs text-gray-500">{playlists.length} playlists</p>
                        </div>
                      </div>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showPlaylistsDropdown ? 'rotate-180' : ''}`} />
                    </motion.div>

                    <AnimatePresence>
                      {showPlaylistsDropdown && (
                        <motion.div 
                          key={`playlists-${refreshKey}`} 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: "auto" }} 
                          exit={{ opacity: 0, height: 0 }} 
                          transition={{ duration: 0.2 }} 
                          className="playlists-dropdown-content ml-9 mt-1 space-y-1 overflow-hidden"
                        >
                          <div 
                            ref={playlistsScrollRef}
                            className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                          >
                            {playlists.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500 italic">No playlists yet</div>
                            ) : (
                              playlists.map((playlist) => (
                                <motion.div
                                  key={playlist.id}
                                  whileHover={{ x: 4 }}
                                  className="w-full rounded-lg transition-all duration-200 hover:bg-white/5"
                                >
                                  <div
                                    onClick={() => handlePlaylistClick(playlist.id)}
                                    className="w-full text-left px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                                      {playlist.cover_url && playlist.cover_url !== "" ? (
                                        <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex items-center justify-center">
                                          <Disc3 size={14} className="text-blue-400/60" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-300 truncate">{playlist.name}</p>
                                      <p className="text-xs text-gray-500">{playlist.songs.length} songs</p>
                                    </div>
                                  </div>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed Icons */}
            {isCollapsed && (
              <div className="mt-4 space-y-2">
                <button onClick={handleLikedSongsClick} className="w-full flex justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition relative group">
                  <Heart size={22} />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">Liked Songs</span>
                </button>
                <button onClick={handleLibraryClick} className="w-full flex justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition relative group">
                  <Library size={22} />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">Your Library</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* MOBILE TOPBAR - FIXED WITH SAFE AREA PADDING */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 pt-safe">
        <div className="bg-black/90 backdrop-blur-xl border-b border-white/10 px-3 pb-2">
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Disc3 className="text-white" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-blue-400 text-lg">PavPav</h1>
                <p className="text-gray-500 text-[10px]">Music Player</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handleLikedSongsClick} className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center" aria-label="Liked Songs">
                <Heart size={12} className="text-white fill-white" />
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => setShowCreateArtistModal(true)}
                  className="w-7 h-7 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30"
                  aria-label="Add Artist"
                >
                  <Plus size={14} className="text-white" />
                </button>
              )}
              
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {user.picture ? <img src={user.picture} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-white text-xs font-medium">{user.name?.charAt(0).toUpperCase() || "U"}</span>}
                  </div>
                  <button onClick={onSignOut} className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 transition-all duration-200 flex items-center justify-center" aria-label="Sign Out">
                    <LogOut size={14} className="text-red-400" />
                  </button>
                </div>
              ) : (
                <button onClick={onSignIn} className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30" aria-label="Sign In">
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-around mt-2 pt-1 border-t border-white/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "artists") {
                      setActiveTab("artists");
                    } else {
                      handleNavigation(item.id);
                    }
                  }}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${isActive ? 'text-blue-400' : 'text-gray-500'}`}
                  aria-label={item.label}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{item.label}</span>
                  {isActive && <motion.div layoutId="mobileIndicator" className="w-4 h-0.5 rounded-full bg-blue-500 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create/Edit Artist Modal */}
      <AnimatePresence>
        {(showCreateArtistModal || editingArtist) && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-purple-500/30 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{editingArtist ? 'Edit Artist' : 'Create Artist'}</h2>
                  <p className="text-xs text-gray-500 mt-1">Admin only - Manage artists</p>
                </div>
                <button onClick={() => { setShowCreateArtistModal(false); setEditingArtist(null); setArtistName(""); setArtistBio(""); setArtistCoverFile(null); setArtistCoverPreview(""); }} className="p-1 rounded-full hover:bg-white/10 transition">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Artist Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                      {artistCoverPreview ? <img src={artistCoverPreview} alt="Preview" className="w-full h-full object-cover" /> : <Mic size={32} className="text-purple-400" />}
                    </div>
                    <div className="flex-1">
                      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
                      <button type="button" onClick={() => coverInputRef.current?.click()} className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm flex items-center justify-center gap-2">
                        <ImageIcon size={16} />
                        {artistCoverFile ? "Change Image" : "Upload Image"}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Artist Name *</label>
                  <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="e.g., Taylor Swift" className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Bio (optional)</label>
                  <textarea value={artistBio} onChange={(e) => setArtistBio(e.target.value)} placeholder="Tell us about the artist..." rows={3} className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={editingArtist ? handleUpdateArtist : handleCreateArtist} disabled={!artistName.trim()} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 transition font-medium disabled:opacity-50">
                    {editingArtist ? 'Save Changes' : 'Create Artist'}
                  </button>
                  <button onClick={() => { setShowCreateArtistModal(false); setEditingArtist(null); setArtistName(""); setArtistBio(""); setArtistCoverFile(null); setArtistCoverPreview(""); }} className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}