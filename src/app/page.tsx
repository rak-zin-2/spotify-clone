"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { songs } from "@/data/songs";

import Sidebar from "@/components/Sidebar";
import MusicPlayer from "@/components/MusicPlayer";
import PlaylistModal from "@/components/PlaylistModal";
import PlaylistView from "@/components/PlaylistView";
import AdminNotificationCenter from "@/components/AdminNotificationCenter";

import { usePlaylist } from "@/hooks/usePlaylist";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

import { Plus, Play, Disc3, ArrowLeft, Heart, Search as SearchIcon, X } from "lucide-react";

// Fuzzy search function - finds matches even with typos
const fuzzySearch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) return true;
  
  // Split query into words
  const queryWords = queryLower.split(/\s+/);
  
  // Check if all query words are present (in any order)
  const allWordsPresent = queryWords.every(word => textLower.includes(word));
  if (allWordsPresent) return true;
  
  // Levenshtein distance for close matches (typo tolerance)
  const getLevenshteinDistance = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    return matrix[b.length][a.length];
  };
  
  // Check for close matches (typos) - allow up to 3 character difference or 30% of length
  const maxDistance = Math.min(3, Math.floor(queryLower.length * 0.3));
  const distance = getLevenshteinDistance(textLower.slice(0, queryLower.length + 3), queryLower);
  if (distance <= maxDistance) return true;
  
  // Check each word separately for typos
  const textWords = textLower.split(/\s+/);
  for (const queryWord of queryWords) {
    for (const textWord of textWords) {
      const wordDistance = getLevenshteinDistance(textWord.slice(0, queryWord.length + 2), queryWord);
      if (wordDistance <= Math.min(2, Math.floor(queryWord.length * 0.3))) {
        return true;
      }
    }
  }
  
  return false;
};

// Get unique suggestions from songs
const getSuggestions = (query: string, limit: number = 5): { title: string; artist: string; cover: string }[] => {
  if (!query.trim()) return [];
  
  const queryLower = query.toLowerCase();
  const matches: { song: typeof songs[0]; score: number }[] = [];
  
  for (const song of songs) {
    let score = 0;
    const titleLower = song.title.toLowerCase();
    const artistLower = song.artist.toLowerCase();
    
    // Exact match gets highest score
    if (titleLower === queryLower || artistLower === queryLower) {
      score = 100;
    }
    // Starts with query
    else if (titleLower.startsWith(queryLower) || artistLower.startsWith(queryLower)) {
      score = 80;
    }
    // Contains query
    else if (titleLower.includes(queryLower) || artistLower.includes(queryLower)) {
      score = 60;
    }
    // Word match
    else {
      const queryWords = queryLower.split(/\s+/);
      let wordMatches = 0;
      for (const word of queryWords) {
        if (titleLower.includes(word) || artistLower.includes(word)) {
          wordMatches++;
        }
      }
      if (wordMatches > 0) {
        score = 40 * (wordMatches / queryWords.length);
      }
    }
    
    // Fuzzy match bonus
    if (fuzzySearch(song.title, query) || fuzzySearch(song.artist, query)) {
      score = Math.max(score, 30);
    }
    
    if (score > 0) {
      matches.push({ song, score });
    }
  }
  
  // Sort by score and return unique suggestions
  matches.sort((a, b) => b.score - a.score);
  const unique = matches.slice(0, limit).map(m => ({
    title: m.song.title,
    artist: m.song.artist,
    cover: m.song.cover
  }));
  
  return unique;
};

// Component for rotating playlist cover in library grid
const RotatingPlaylistCover = ({ playlist }: { playlist: any }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Get all song covers from the playlist in order
    const playlistSongs = playlist.songs.map((title: string) => 
      songs.find(song => song.title === title)
    ).filter(Boolean);
    
    const covers = playlistSongs.map((song: any) => song.cover).filter((cover: string) => cover);
    
    // If playlist has custom cover, use it as first image
    if (playlist.cover && playlist.cover !== "") {
      setImages([playlist.cover, ...covers]);
    } else {
      setImages(covers.length > 0 ? covers : []);
    }
  }, [playlist.songs, playlist.cover]);

  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
        <Disc3 size={48} className="text-blue-400/60" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentImageIndex}
          src={images[currentImageIndex]}
          alt="Playlist cover"
          className="w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
            key={currentImageIndex}
          />
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlaylistSongs, setCurrentPlaylistSongs] = useState<string[] | null>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [isPlayingFromLiked, setIsPlayingFromLiked] = useState(false);
  
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]);
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedSong, setSelectedSong] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showLikedSongs, setShowLikedSongs] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tempPlaylistName, setTempPlaylistName] = useState("");
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);

  const {
    playlists,
    setPlaylists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    renamePlaylist,
    deletePlaylist,
    reorderPlaylistSongs,
  } = usePlaylist();

  const {
    likedSongs,
    toggleLike,
    isLiked,
  } = useLikedSongs();
  
  const { user, signOut, signIn, isAdmin } = useAuth();

  const likedSongsList = songs.filter(song => likedSongs.includes(song.title));
  const likedSongTitles = likedSongsList.map(song => song.title);

  // Get suggestions based on current search
  const suggestions = useMemo(() => getSuggestions(search, 5), [search]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle playlist selection from sidebar dropdown
  useEffect(() => {
    const handleSelectPlaylist = (e: CustomEvent) => {
      setSelectedPlaylist(e.detail);
      setShowLikedSongs(false);
      setActiveTab("library");
    };
    
    window.addEventListener('selectPlaylist', handleSelectPlaylist as EventListener);
    return () => window.removeEventListener('selectPlaylist', handleSelectPlaylist as EventListener);
  }, []);

  // Determine current queue based on what's playing
  let currentQueue: string[] = [];
  
  // Priority: current playlist songs > liked songs (if playing from liked) > all songs
  if (currentPlaylistSongs && !isPlayingFromLiked) {
    currentQueue = currentPlaylistSongs;
  } else if (isPlayingFromLiked) {
    currentQueue = likedSongTitles;
  } else {
    currentQueue = songs.map(s => s.title);
  }
  
  const currentSongTitle = currentQueue[currentIndex];
  const currentSong = songs.find(s => s.title === currentSongTitle) || songs[0];

  // Update recently played
  useEffect(() => {
    if (!currentSongTitle) return;

    setRecentlyPlayed((prev) => {
      if (prev[0] === currentSongTitle) return prev;
      return [
        currentSongTitle,
        ...prev.filter((title) => title !== currentSongTitle),
      ].slice(0, 5);
    });
  }, [currentSongTitle]);

  const recentlyPlayedSongs = recentlyPlayed
    .map((title) => songs.find((song) => song.title === title))
    .filter(Boolean);

  // Fuzzy search filtering
  const filteredSongs = useMemo(() => {
    if (!search.trim()) return songs;
    
    return songs.filter((song) => {
      return fuzzySearch(song.title, search) || fuzzySearch(song.artist, search);
    });
  }, [search]);

  // Play a song from regular all songs
  const playSong = (title: string) => {
    const index = songs.findIndex(s => s.title === title);
    if (index !== -1) {
      setCurrentPlaylistSongs(null);
      setCurrentPlaylistId(null);
      setIsPlayingFromLiked(false);
      setShowLikedSongs(false);
      setCurrentIndex(index);
    }
  };

  // Play a song from a specific playlist
  const playSongFromPlaylist = (title: string, playlistSongTitles: string[], playlistId: string) => {
    const index = playlistSongTitles.findIndex(t => t === title);
    if (index !== -1) {
      setCurrentPlaylistSongs(playlistSongTitles);
      setCurrentPlaylistId(playlistId);
      setIsPlayingFromLiked(false);
      setShowLikedSongs(false);
      setCurrentIndex(index);
    }
  };

  // Play a song from Liked Songs
  const playSongFromLiked = (title: string) => {
    const index = likedSongTitles.findIndex(t => t === title);
    if (index !== -1) {
      setCurrentPlaylistSongs(null);
      setCurrentPlaylistId(null);
      setIsPlayingFromLiked(true);
      setShowLikedSongs(true);
      setCurrentIndex(index);
    }
  };

  // Play next with infinite loop
  const playNext = () => {
    if (currentIndex < currentQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // Play previous with infinite loop
  const playPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(currentQueue.length - 1);
    }
  };

  const handleCreatePlaylist = () => {
    if (tempPlaylistName.trim()) {
      createPlaylist(tempPlaylistName.trim());
      setTempPlaylistName("");
      setShowCreateModal(false);
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setDeletingPlaylistId(playlistId);
    setTimeout(() => {
      deletePlaylist(playlistId);
      setDeletingPlaylistId(null);
    }, 300);
  };

  const handleLikedSongs = () => {
    setSelectedPlaylist(null);
    setShowLikedSongs(true);
    setActiveTab("library");
  };

  const handleLibraryView = () => {
    setSelectedPlaylist(null);
    setShowLikedSongs(false);
    setActiveTab("library");
  };

  const handleLike = (e: React.MouseEvent, songTitle: string) => {
    e.stopPropagation();
    toggleLike(songTitle);
  };

  const handleSelectSuggestion = (songTitle: string) => {
    playSong(songTitle);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearch("");
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowSuggestions(true);
    }
  };

  const handleSearchFocus = () => {
    if (search.trim()) {
      setShowSuggestions(true);
    }
  };

  return (
    <>
      <div className="bg-glow" />
      <div className="bg-glow" />

      <main className="flex h-screen overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalSongs={likedSongs.length}
          onNavigateToLibrary={handleLibraryView}
          onNavigateToLikedSongs={handleLikedSongs}
          user={user}
          onSignOut={signOut}
          onSignIn={() => setShowAuthModal(true)}
          isAdmin={isAdmin}
        />

        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-[100] flex-1 overflow-y-auto md:ml-72 pt-35 md:pt-[70px] pb-[140px] px-4 md:px-5"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
            <div className="flex items-center justify-between w-full md:w-auto">
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                {activeTab === "home" && "Home"}
                {activeTab === "search" && "Search"}
                {activeTab === "library" && (showLikedSongs ? "Liked Songs" : "Library")}
              </h2>
              {isAdmin && (
                <div className="md:hidden">
                  <AdminNotificationCenter />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isAdmin && (
                <div className="hidden md:block">
                  <AdminNotificationCenter />
                </div>
              )}

              {activeTab === "search" && (
                <div className="w-full md:w-96 relative" ref={searchRef}>
                  <div className="relative">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={inputRef}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={handleSearchFocus}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search song or artist... (typos are okay!)"
                      className="glass w-full px-10 py-3 rounded-full outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      enterKeyHint="search"
                    />
                    {search && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition"
                      >
                        <X size={14} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-xl z-50 max-h-80 overflow-y-auto"
                      >
                        <div className="py-2">
                          <div className="px-4 py-2 text-xs text-gray-400 border-b border-white/10 sticky top-0 bg-gray-800/95">
                            Suggestions - Tap to play
                          </div>
                          {suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSuggestion(suggestion.title)}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition text-left active:bg-white/20"
                            >
                              <img
                                src={suggestion.cover}
                                alt={suggestion.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{suggestion.title}</p>
                                <p className="text-xs text-gray-400 truncate">{suggestion.artist}</p>
                              </div>
                              <Play size={14} className="text-gray-400 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {search && (
                    <p className="text-xs text-blue-400/60 mt-2 text-center">
                      Found {filteredSongs.length} result{filteredSongs.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {activeTab === "home" && (
            <>
              {recentlyPlayedSongs.length > 0 && (
                <>
                  <h3 className="text-lg md:text-2xl font-bold mb-4">Recently Played</h3>
                  <div className="grid gap-4 md:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-10">
                    {recentlyPlayedSongs.slice(0, 6).map((song, i) => (
                      <motion.div
                        key={song!.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => playSong(song!.title)}
                        className="group cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden">
                          <img
                            src={song!.cover}
                            alt={song!.title}
                            className="w-full aspect-square object-cover transition-transform group-hover:scale-105 duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              playSong(song!.title);
                            }}
                            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg"
                          >
                            <Play size={18} className="ml-0.5" />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => handleLike(e, song!.title)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-purple-500"
                          >
                            <Heart 
                              size={14} 
                              className={isLiked(song!.title) ? "text-purple-400 fill-purple-400" : "text-white"}
                            />
                          </motion.button>
                        </div>
                        <h3 className="mt-2 font-semibold text-sm truncate">{song!.title}</h3>
                        <p className="text-gray-400 text-xs truncate">{song!.artist}</p>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              <h3 className="text-lg md:text-2xl font-bold mb-4">All Songs</h3>
              <div className="grid gap-4 md:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {songs.map((song, i) => (
                  <motion.div
                    key={song.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group cursor-pointer"
                    onClick={() => playSong(song.title)}
                  >
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={song.cover}
                        alt={song.title}
                        className="w-full aspect-square object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          playSong(song.title);
                        }}
                        className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg"
                      >
                        <Play size={18} className="ml-0.5" />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSong(song.title);
                          setShowModal(true);
                        }}
                        className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-blue-500"
                      >
                        <Plus size={14} />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleLike(e, song.title)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-purple-500"
                      >
                        <Heart 
                          size={14} 
                          className={isLiked(song.title) ? "text-purple-400 fill-purple-400" : "text-white"}
                        />
                      </motion.button>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold truncate">{song.title}</h3>
                    <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {activeTab === "search" && (
            <div className="grid gap-4 md:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredSongs.length === 0 && search.trim() !== "" && (
                <div className="glass rounded-2xl p-8 text-center text-gray-400 col-span-full">
                  <div className="flex flex-col items-center gap-3">
                    <SearchIcon size={48} strokeWidth={1.5} />
                    <div>
                      <p className="text-lg">No results found for "{search}"</p>
                      <p className="text-sm text-gray-500 mt-1">Try checking for typos or use a different term</p>
                    </div>
                  </div>
                </div>
              )}
              {filteredSongs.length === 0 && search.trim() === "" && (
                <div className="glass rounded-2xl p-8 text-center text-gray-400 col-span-full">
                  <div className="flex flex-col items-center gap-3">
                    <SearchIcon size={48} strokeWidth={1.5} />
                    <div>
                      <p className="text-lg">Start typing to search</p>
                      <p className="text-sm text-gray-500 mt-1">Search for songs, artists, or albums</p>
                    </div>
                  </div>
                </div>
              )}
              {filteredSongs.map((song, i) => (
                <motion.div
                  key={song.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="group cursor-pointer"
                  onClick={() => playSong(song.title)}
                >
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={song.cover}
                      alt={song.title}
                      className="w-full aspect-square object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(song.title);
                      }}
                      className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg"
                    >
                      <Play size={18} className="ml-0.5" />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSong(song.title);
                        setShowModal(true);
                      }}
                      className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-blue-500"
                    >
                      <Plus size={14} />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleLike(e, song.title)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-purple-500"
                    >
                      <Heart 
                        size={14} 
                        className={isLiked(song.title) ? "text-purple-400 fill-purple-400" : "text-white"}
                      />
                    </motion.button>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold truncate">{song.title}</h3>
                  <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "library" && (
            showLikedSongs ? (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={handleLibraryView}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
                  >
                    <ArrowLeft size={18} />
                    Back to Library
                  </button>
                </div>

                <div className="glass rounded-3xl p-6 md:p-8 mb-8">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                    <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                      <Heart size={80} className="text-white fill-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 uppercase text-sm tracking-widest">Playlist</p>
                      <h1 className="text-4xl md:text-6xl font-black mt-2">Liked Songs</h1>
                      <p className="text-gray-400 mt-3">{likedSongsList.length} liked songs</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (likedSongsList.length > 0) {
                            playSongFromLiked(likedSongsList[0].title);
                          }
                        }}
                        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 transition font-semibold shadow-lg shadow-purple-500/30"
                      >
                        <Play size={18} />
                        Play All
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {likedSongsList.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-2xl p-12 text-center text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <Heart size={48} className="text-gray-500" />
                        <div>
                          <p className="text-lg">No liked songs yet</p>
                          <p className="text-sm text-gray-500 mt-1">Click the heart icon on any song to like it</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {likedSongsList.map((song, index) => (
                    <motion.div
                      key={song.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="glass rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition flex items-center gap-4 group"
                    >
                      <div
                        onClick={() => playSongFromLiked(song.title)}
                        className="flex items-center gap-4 flex-1"
                      >
                        <div className="w-8 text-center text-gray-500 font-semibold">
                          {index + 1}
                        </div>
                        <img src={song.cover} alt={song.title} className="w-16 h-16 rounded-2xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{song.title}</h3>
                          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSongFromLiked(song.title);
                          }}
                          className="playlist-play-btn opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(song.title);
                          }}
                          className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/40 transition flex items-center justify-center"
                        >
                          <Heart size={14} className="text-purple-400 fill-purple-400" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              selectedPlaylist && playlists.find(p => p.id === selectedPlaylist) ? (
                <PlaylistView
                  playlist={playlists.find(p => p.id === selectedPlaylist)!}
                  songs={songs}
                  onBack={() => {
                    setSelectedPlaylist(null);
                  }}
                  onPlaySong={(title) => {
                    const playlist = playlists.find(p => p.id === selectedPlaylist);
                    if (playlist) {
                      playSongFromPlaylist(title, playlist.songs, playlist.id);
                    }
                  }}
                  onRenamePlaylist={renamePlaylist}
                  onDeletePlaylist={handleDeletePlaylist}
                  onRemoveSong={removeSongFromPlaylist}
                  likedSongs={likedSongs}
                  onToggleLike={toggleLike}
                  isLiked={isLiked}
                  onReorderSongs={reorderPlaylistSongs}
                />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Your Playlists</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowCreateModal(true)}
                      className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition text-sm font-semibold shadow-lg shadow-blue-500/30"
                    >
                      + Create
                    </motion.button>
                  </div>

                  {playlists.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-3xl p-16 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-white/10">
                            <Disc3 size={56} className="text-blue-400" />
                          </div>
                          <motion.div 
                            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Plus size={16} className="text-white" />
                          </motion.div>
                        </div>
                        
                        <div>
                          <h4 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            No Playlists Yet
                          </h4>
                          <p className="text-gray-400 mt-2 max-w-sm">
                            Create your first playlist and start organizing your favorite tracks
                          </p>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowCreateModal(true)}
                          className="mt-4 px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Create Playlist
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {playlists.map((playlist, i) => (
                      <motion.div
                        key={playlist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedPlaylist(playlist.id)}
                        className="group cursor-pointer"
                      >
                        <div className="relative rounded-xl overflow-hidden aspect-square">
                          <RotatingPlaylistCover playlist={playlist} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playlist.songs.length > 0) {
                                playSongFromPlaylist(playlist.songs[0], playlist.songs, playlist.id);
                              }
                            }}
                            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg"
                          >
                            <Play size={18} className="ml-0.5" />
                          </motion.button>
                        </div>
                        <h4 className="mt-2 font-semibold text-sm truncate">{playlist.name}</h4>
                        <p className="text-gray-400 text-xs">{playlist.songs.length} songs</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </motion.section>
      </main>

      {showModal && (
        <PlaylistModal
          songTitle={selectedSong}
          playlists={playlists}
          onClose={() => setShowModal(false)}
          onCreate={createPlaylist}
          onAdd={addSongToPlaylist}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-blue-500/30 overflow-hidden"
          >
            <div className="p-5 border-b border-white/10">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Create Playlist</h2>
            </div>
            <div className="p-5">
              <input
                type="text"
                value={tempPlaylistName}
                onChange={(e) => setTempPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              />
              <div className="flex gap-2 mt-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreatePlaylist} 
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 font-medium"
                >
                  Create
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <MusicPlayer
        songs={songs}
        currentSong={currentSong}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        currentQueue={currentQueue}
        onNext={playNext}
        onPrev={playPrevious}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}