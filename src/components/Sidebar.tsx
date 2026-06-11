// components/Sidebar.tsx
"use client";

import { House, Search, Library, Disc3, Heart, PlusCircle, ChevronLeft, ChevronRight, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabasePlaylist } from "@/hooks/useSupabasePlaylist";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalSongs: number;
  onNavigateToLibrary?: () => void;
  onNavigateToLikedSongs?: () => void;
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
  user,
  onSignOut,
  onSignIn,
  isAdmin = false,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPlaylistsDropdown, setShowPlaylistsDropdown] = useState(false);
  const { playlists } = useSupabasePlaylist();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handlePlaylistChange = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('playlistChanged', handlePlaylistChange);
    return () => window.removeEventListener('playlistChanged', handlePlaylistChange);
  }, []);

  // Simple function to scroll window to top
  const scrollWindowToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle navigation - ONLY scroll when clicking Home while already on Home
  const handleNavigation = (tabId: string) => {
    if (tabId === "home" && activeTab === "home") {
      scrollWindowToTop();
    } else if (tabId === "search" && activeTab === "search") {
      scrollWindowToTop();
    } else {
      setActiveTab(tabId);
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: House },
    { id: "search", label: "Search", icon: Search },
    { id: "library", label: "Your Library", icon: Library },
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
          <div className={`p-6 flex ${isCollapsed ? 'justify-center flex-col items-center gap-3' : 'items-center justify-between'}`}>
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

            {/* User Profile/Sign In Button */}
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
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
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
            {isCollapsed ? (
              <ChevronRight size={12} className="text-gray-400" />
            ) : (
              <ChevronLeft size={12} className="text-gray-400" />
            )}
          </button>

          {/* Collapsed User Profile for Sidebar */}
          {isCollapsed && (
            <div className="mt-4 flex flex-col items-center gap-3">
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
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Sign In
                  </span>
                </motion.button>
              )}
            </div>
          )}

          {/* Main Navigation */}
          <div className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigation(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isCollapsed ? 'justify-center' : ''}
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon size={22} className={isActive ? 'text-blue-400' : ''} />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">{item.label}</span>
                    )}
                    {isActive && !isCollapsed && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="ml-auto w-1 h-6 rounded-full bg-blue-500"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Divider */}
            {!isCollapsed && (
              <div className="my-6 h-px bg-white/10" />
            )}

            {/* Your Playlists Section */}
            {!isCollapsed && (
              <div className="mt-4">
                <div className="flex items-center justify-between px-3 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Your Library
                  </span>
                  <button 
                    onClick={handleLibraryClick}
                    className="p-1 rounded-md hover:bg-white/10 transition"
                    title="View all playlists"
                  >
                    <PlusCircle size={14} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {/* Liked Songs */}
                  <motion.div 
                    whileHover={{ x: 4 }}
                    onClick={handleLikedSongsClick}
                    className="px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer group"
                  >
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

                  {/* All Playlists Dropdown */}
                  <div>
                    <motion.div 
                      whileHover={{ x: 4 }}
                      onClick={() => setShowPlaylistsDropdown(!showPlaylistsDropdown)}
                      className="px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer group flex items-center justify-between"
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
                      <ChevronDown 
                        size={14} 
                        className={`text-gray-400 transition-transform duration-200 ${showPlaylistsDropdown ? 'rotate-180' : ''}`}
                      />
                    </motion.div>

                    <AnimatePresence>
                      {showPlaylistsDropdown && (
                        <motion.div
                          key={refreshKey}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-9 mt-1 space-y-1 overflow-hidden"
                        >
                          {playlists.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-500 italic">
                              No playlists yet
                            </div>
                          ) : (
                            playlists.map((playlist) => (
                              <motion.button
                                key={playlist.id}
                                whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                                onClick={() => handlePlaylistClick(playlist.id)}
                                className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                                  {playlist.cover_url && playlist.cover_url !== "" ? (
                                    <img
                                      src={playlist.cover_url}
                                      alt={playlist.name}
                                      className="w-full h-full object-cover"
                                    />
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
                              </motion.button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed Library Button */}
            {isCollapsed && (
              <div className="mt-4 space-y-2">
                <button 
                  onClick={handleLikedSongsClick}
                  className="w-full flex justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition relative group"
                >
                  <Heart size={22} />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Liked Songs
                  </span>
                </button>
                <button 
                  onClick={handleLibraryClick}
                  className="w-full flex justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition relative group"
                >
                  <Library size={22} />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    Your Library
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* MOBILE TOPBAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40">
        <div className="bg-black/90 backdrop-blur-xl border-b border-white/10 px-3 py-2">
          <div className="flex items-center justify-between">
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
              <button 
                onClick={handleLikedSongsClick}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                aria-label="Liked Songs"
              >
                <Heart size={12} className="text-white fill-white" />
              </button>
              
              {/* Mobile User Section */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-medium">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onSignOut}
                    className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 transition-all duration-200 flex items-center justify-center"
                    aria-label="Sign Out"
                  >
                    <LogOut size={14} className="text-red-400" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/30"
                  aria-label="Sign In"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
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
                  onClick={() => handleNavigation(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
                    isActive ? 'text-blue-400' : 'text-gray-500'
                  }`}
                  aria-label={item.label}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{item.label === "library" ? "Library" : item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="mobileIndicator"
                      className="w-4 h-0.5 rounded-full bg-blue-500 mt-0.5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}