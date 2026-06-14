"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Sidebar from "@/components/Sidebar";
import MusicPlayer from "@/components/MusicPlayer";
import DraggableMiniPlayer from "@/components/DraggableMiniPlayer";
import PlaylistModal from "@/components/PlaylistModal";
import PlaylistView from "@/components/PlaylistView";
import AdminNotificationCenter from "@/components/AdminNotificationCenter";
import DownloadSongModal from "@/components/DownloadSongModal";
import AuthModal from "@/components/AuthModal";

import { useSupabasePlaylist } from "@/hooks/useSupabasePlaylist";
import { useSupabaseLikedSongs } from "@/hooks/useSupabaseLikedSongs";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseSongs } from "@/hooks/useSupabaseSongs";
import { useSupabaseArtists } from "@/hooks/useSupabaseArtists";

import { Plus, Play, Disc3, ArrowLeft, Heart, Search as SearchIcon, X, ArrowUp, Upload, Trash2, Edit2, Save, ImageIcon, Mic, Check, Music } from "lucide-react";
import { audioService } from "@/components/AudioService";

// Type for song
type Song = {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  audio_url: string;
  is_default: boolean;
  uploaded_by: string | null;
  created_at: string;
};

// Fuzzy search function
const fuzzySearch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (textLower.includes(queryLower)) return true;
  
  const queryWords = queryLower.split(/\s+/);
  const allWordsPresent = queryWords.every(word => textLower.includes(word));
  if (allWordsPresent) return true;
  
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
  
  const maxDistance = Math.min(3, Math.floor(queryLower.length * 0.3));
  const distance = getLevenshteinDistance(textLower.slice(0, queryLower.length + 3), queryLower);
  if (distance <= maxDistance) return true;
  
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
const getSuggestions = (query: string, songsList: Song[], limit: number = 5): { title: string; artist: string; cover: string }[] => {
  if (!query.trim()) return [];
  
  const queryLower = query.toLowerCase();
  const matches: { song: Song; score: number }[] = [];
  
  for (const song of songsList) {
    let score = 0;
    const titleLower = song.title.toLowerCase();
    const artistLower = song.artist.toLowerCase();
    
    if (titleLower === queryLower || artistLower === queryLower) {
      score = 100;
    }
    else if (titleLower.startsWith(queryLower) || artistLower.startsWith(queryLower)) {
      score = 80;
    }
    else if (titleLower.includes(queryLower) || artistLower.includes(queryLower)) {
      score = 60;
    }
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
    
    if (fuzzySearch(song.title, query) || fuzzySearch(song.artist, query)) {
      score = Math.max(score, 30);
    }
    
    if (score > 0) {
      matches.push({ song, score });
    }
  }
  
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit).map(m => ({
    title: m.song.title,
    artist: m.song.artist,
    cover: m.song.cover_url
  }));
};

// Component for rotating playlist cover
const RotatingPlaylistCover = ({ playlist, allSongs }: { playlist: any; allSongs: Song[] }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const playlistSongs = playlist.songs.map((title: string) => 
      allSongs.find(song => song.title === title)
    ).filter(Boolean);
    
    const covers = playlistSongs.map((song: any) => song.cover_url).filter((cover: string) => cover);
    
    if (playlist.cover_url && playlist.cover_url !== "") {
      setImages([playlist.cover_url, ...covers]);
    } else {
      setImages(covers.length > 0 ? covers : []);
    }
  }, [playlist.songs, playlist.cover_url, allSongs]);

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

// Admin Edit Song Modal Component
const AdminEditSongModal = ({ 
  isOpen, 
  onClose, 
  song, 
  onSave,
  onUploadAudio,
  onUploadCover
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  song: Song | null; 
  onSave: (songId: string, title: string, artist: string, cover_url: string, audio_url?: string) => Promise<void>;
  onUploadAudio: (file: File, songId: string) => Promise<string>;
  onUploadCover: (file: File, songId: string) => Promise<string>;
}) => {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setCoverUrl(song.cover_url || "");
      setAudioUrl(song.audio_url || "");
      setCoverPreview(null);
      setCoverFile(null);
      setAudioFile(null);
      setAudioFileName("");
    }
  }, [song]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      setAudioFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim() || !song) return;
    
    setIsLoading(true);
    let finalCoverUrl = coverUrl;
    let finalAudioUrl = audioUrl;
    
    if (coverFile) {
      finalCoverUrl = await onUploadCover(coverFile, song.id);
    }
    
    if (audioFile) {
      finalAudioUrl = await onUploadAudio(audioFile, song.id);
    }
    
    await onSave(song.id, title.trim(), artist.trim(), finalCoverUrl || "", finalAudioUrl);
    setIsLoading(false);
    onClose();
  };

  if (!song) return null;

  const getImageSrc = () => {
    if (coverPreview) return coverPreview;
    if (coverUrl && coverUrl !== "") return coverUrl;
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-gray-900">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Edit Song
                </h2>
                <p className="text-xs text-gray-500 mt-1">Admin only - Edit song details</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 transition"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Song Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Artist Name</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Cover Image</label>
                <div className="flex gap-3 mb-2">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Current cover"
                      className="w-16 h-16 rounded-lg object-cover bg-gray-800"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm"
                    >
                      {coverFile ? "Change Cover" : "Upload New Cover"}
                    </button>
                    {coverFile && (
                      <p className="text-xs text-green-400 mt-1">{coverFile.name}</p>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Or enter image URL"
                  className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Audio File</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm flex items-center justify-center gap-2"
                    >
                      <Upload size={16} />
                      {audioFile ? "Change Audio File" : "Upload New Audio File"}
                    </button>
                    {audioFile && (
                      <p className="text-xs text-green-400 mt-1">{audioFileName}</p>
                    )}
                    {!audioFile && audioUrl && audioUrl !== "" && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        Current: {audioUrl.split('/').pop()}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: MP3, WAV, OGG (Max 50MB)
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <><Save size={16} /> Save Changes</>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// iOS audio activation handler
const activateIOSAudio = () => {
  // Create and play a silent audio to "activate" the audio session on iOS
  const silentAudio = new Audio();
  silentAudio.volume = 0;
  silentAudio.play().catch(() => {});
};

export default function Home() {
  // ========== PERSISTENT PLAYING STATE - NEVER RESET ON NAVIGATION ==========
  const [playingSongTitle, setPlayingSongTitle] = useState<string | null>(null);
  const [playingQueue, setPlayingQueue] = useState<string[]>([]);
  const [playingIndex, setPlayingIndex] = useState(0);
  const [playingContextType, setPlayingContextType] = useState<'playlist' | 'liked' | 'artist' | 'all'>('all');
  
  // ========== UI NAVIGATION STATE (DOES NOT AFFECT PLAYBACK) ==========
  const [activeTab, setActiveTab] = useState("home");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showLikedSongs, setShowLikedSongs] = useState(false);
  const [showArtistView, setShowArtistView] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistSongs, setArtistSongs] = useState<Song[]>([]);
  
  // UI display queues (just for showing, not controlling playback)
  const [displayPlaylistSongs, setDisplayPlaylistSongs] = useState<string[] | null>(null);
  const [displayArtistQueue, setDisplayArtistQueue] = useState<string[]>([]);
  const [displayIsPlayingFromLiked, setDisplayIsPlayingFromLiked] = useState(false);
  const [displayIsPlayingFromArtist, setDisplayIsPlayingFromArtist] = useState(false);
  
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([]);
  
  const [selectedSong, setSelectedSong] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tempPlaylistName, setTempPlaylistName] = useState("");
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  
  const [playlistCoverFile, setPlaylistCoverFile] = useState<File | null>(null);
  const [playlistCoverPreview, setPlaylistCoverPreview] = useState("");
  const playlistCoverInputRef = useRef<HTMLInputElement>(null);
  
  // Add to Playlist Modal states
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<Song | null>(null);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false);
  const [addedToPlaylist, setAddedToPlaylist] = useState<string[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ========== MINI MUSIC PLAYER STATE ==========
  const [miniPlayerProgress, setMiniPlayerProgress] = useState(0);
  const [isMiniPlayerPlaying, setIsMiniPlayerPlaying] = useState(false);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(true);

  // Hooks
  const { songs: supabaseSongs, loading: songsLoading, addSong: addSongToSupabase, deleteSong: deleteSongFromSupabase, refreshSongs, updateSong: updateSongInSupabase, uploadAudioFile, uploadCoverImage } = useSupabaseSongs();
  const { playlists, createPlaylist, addSongToPlaylist, removeSongFromPlaylist, renamePlaylist, deletePlaylist, refreshPlaylists } = useSupabasePlaylist();
  const { likedSongs, toggleLike, isLiked, refreshLikedSongs } = useSupabaseLikedSongs();
  const { user, signOut, signIn, isAdmin, currentUserId, loading: authLoading } = useSupabaseAuth();
  const { artists, refreshArtists, songBelongsToArtist } = useSupabaseArtists();

  const allSongs = supabaseSongs;

  // ========== TRACK PROGRESS FOR MINI PLAYER ==========
  useEffect(() => {
    const updateProgress = () => {
      const audio = audioService.getAudioElement();
      if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setMiniPlayerProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, []);

  // ========== TRACK PLAYING STATE FOR MINI PLAYER ==========
  useEffect(() => {
    const audio = audioService.getAudioElement();
    if (!audio) return;
    const handlePlay = () => setIsMiniPlayerPlaying(true);
    const handlePause = () => setIsMiniPlayerPlaying(false);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // ========== HANDLE SEEK FROM MINI PLAYER ==========
  const handleMiniPlayerSeek = useCallback((percent: number) => {
    const audio = audioService.getAudioElement();
    if (audio && audio.duration) {
      audio.currentTime = percent * audio.duration;
    }
  }, []);

  // ========== HANDLE TOGGLE PLAY FROM MINI PLAYER ==========
  const handleMiniPlayerTogglePlay = useCallback(() => {
    if (isMiniPlayerPlaying) {
      audioService.pause();
    } else {
      audioService.resetUserPauseState();
      audioService.play();
    }
  }, [isMiniPlayerPlaying]);

// iOS Audio Activation - User interaction required for background audio on iOS
useEffect(() => {
  const handleUserInteraction = () => {
    // Create and play silent audio to activate audio session
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    silentAudio.play().catch(() => {});
    
    // Also initialize AudioContext
    if (typeof window !== 'undefined') {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        ctx.resume().catch(() => {});
      }
    }
    
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
  };
  
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('touchstart', handleUserInteraction);
  
  return () => {
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
  };
}, []);

  // Helper functions
  const getSongsForArtistByName = useCallback((artistName: string): Song[] => {
    return allSongs.filter(song => songBelongsToArtist(song.artist, artistName));
  }, [allSongs, songBelongsToArtist]);

  const likedSongsList = useMemo(() => allSongs.filter(song => likedSongs.includes(song.title)), [allSongs, likedSongs]);
  const likedSongTitles = useMemo(() => likedSongsList.map(song => song.title), [likedSongsList]);

  // Get current song object from playing state - uses title as key to prevent unnecessary re-renders
  const currentSongObject = useMemo(() => {
    if (!playingSongTitle) return allSongs[0] || null;
    return allSongs.find(s => s.title === playingSongTitle) || allSongs[0] || null;
  }, [playingSongTitle, allSongs]);

  // Get the actual queue for playback
  const getActualPlayingQueue = useCallback((): string[] => {
    if (playingQueue.length > 0) return playingQueue;
    return allSongs.map(s => s.title);
  }, [playingQueue, allSongs]);

  // FAST: Play next function with preloading optimization
  // In page.tsx, make sure playNext is simple and correct:
const playNext = useCallback(() => {
  const currentQueue = getActualPlayingQueue();
  console.log('[Page] playNext - Current index:', playingIndex, 'Queue length:', currentQueue.length);
  
  if (!currentQueue.length) return;
  
  // Simple: increment index, loop to 0 if at end
  let newIndex = playingIndex + 1;
  if (newIndex >= currentQueue.length) {
    newIndex = 0;
  }
  
  const nextSong = currentQueue[newIndex];
  console.log('[Page] playNext - Next song:', nextSong, 'at index:', newIndex);
  
  setPlayingIndex(newIndex);
  setPlayingSongTitle(nextSong);
}, [playingIndex, getActualPlayingQueue]);

  // FIXED: Play previous function
  const playPrevious = useCallback(() => {
    const currentQueue = getActualPlayingQueue();
    console.log('[Page] playPrevious - Current index:', playingIndex, 'Queue length:', currentQueue.length);
    
    if (!currentQueue.length) return;
    
    if (playingIndex > 0) {
      const newIndex = playingIndex - 1;
      const prevSong = currentQueue[newIndex];
      console.log('[Page] Going to previous song:', prevSong, 'at index:', newIndex);
      setPlayingIndex(newIndex);
      setPlayingSongTitle(prevSong);
    } else {
      // Beginning of queue - go to last song
      const newIndex = currentQueue.length - 1;
      const lastSong = currentQueue[newIndex];
      console.log('[Page] Beginning of queue, going to last song:', lastSong);
      setPlayingIndex(newIndex);
      setPlayingSongTitle(lastSong);
    }
  }, [playingIndex, getActualPlayingQueue]);

  // Play song - THIS IS THE ONLY PLACE THAT CHANGES PLAYBACK
  const playSong = useCallback((title: string, contextType: 'playlist' | 'liked' | 'artist' | 'all' = 'all', contextId?: string, contextSongs?: string[]) => {
    // Clear any stuck state when explicitly playing a new song
    localStorage.removeItem('pavpav_playing_song_title');
    
    const songsToUse = contextSongs || (contextType === 'liked' ? likedSongTitles : allSongs.map(s => s.title));
    const index = songsToUse.findIndex(s => s === title);
    
    if (index !== -1) {
      console.log('playSong called - Playing:', title, 'at index:', index, 'Queue length:', songsToUse.length);
      
      // Update persistent playing state
      setPlayingContextType(contextType);
      setPlayingQueue(songsToUse);
      setPlayingIndex(index);
      setPlayingSongTitle(title);
      
      // Also update UI display state (for visual feedback only)
      if (contextType === 'playlist') {
        setDisplayPlaylistSongs(songsToUse);
        setDisplayIsPlayingFromLiked(false);
        setDisplayIsPlayingFromArtist(false);
        setDisplayArtistQueue([]);
        setSelectedPlaylist(contextId || null);
        setShowLikedSongs(false);
        setShowArtistView(false);
      } else if (contextType === 'liked') {
        setDisplayPlaylistSongs(null);
        setDisplayIsPlayingFromLiked(true);
        setDisplayIsPlayingFromArtist(false);
        setDisplayArtistQueue([]);
        setShowLikedSongs(true);
        setSelectedPlaylist(null);
        setShowArtistView(false);
      } else if (contextType === 'artist') {
        setDisplayPlaylistSongs(null);
        setDisplayIsPlayingFromLiked(false);
        setDisplayIsPlayingFromArtist(true);
        setDisplayArtistQueue(songsToUse);
        setShowArtistView(true);
        setSelectedPlaylist(null);
        setShowLikedSongs(false);
      } else {
        setDisplayPlaylistSongs(null);
        setDisplayIsPlayingFromLiked(false);
        setDisplayIsPlayingFromArtist(false);
        setDisplayArtistQueue([]);
      }
    }
  }, [allSongs, likedSongTitles]);

  // Play song from playlist
  const playSongFromPlaylist = useCallback((title: string, playlistSongTitles: string[], playlistId: string) => {
    const index = playlistSongTitles.findIndex(t => t === title);
    if (index !== -1) {
      console.log('playSongFromPlaylist - Playing:', title, 'from playlist');
      setPlayingContextType('playlist');
      setPlayingQueue(playlistSongTitles);
      setPlayingIndex(index);
      setPlayingSongTitle(title);
      
      setDisplayPlaylistSongs(playlistSongTitles);
      setDisplayIsPlayingFromLiked(false);
      setDisplayIsPlayingFromArtist(false);
      setSelectedPlaylist(playlistId);
      setShowLikedSongs(false);
      setShowArtistView(false);
    }
  }, []);

  // Play song from liked songs
  const playSongFromLiked = useCallback((title: string) => {
    const index = likedSongTitles.findIndex(t => t === title);
    if (index !== -1) {
      console.log('playSongFromLiked - Playing:', title, 'from liked songs');
      setPlayingContextType('liked');
      setPlayingQueue(likedSongTitles);
      setPlayingIndex(index);
      setPlayingSongTitle(title);
      
      setDisplayPlaylistSongs(null);
      setDisplayIsPlayingFromLiked(true);
      setDisplayIsPlayingFromArtist(false);
      setShowLikedSongs(true);
      setSelectedPlaylist(null);
      setShowArtistView(false);
    }
  }, [likedSongTitles]);

  // Play song from artist
  const playSongFromArtist = useCallback((title: string) => {
    const songsForArtist = getSongsForArtistByName(selectedArtist || '');
    const artistSongTitles = songsForArtist.map(s => s.title);
    const index = artistSongTitles.findIndex(t => t === title);
    if (index !== -1) {
      console.log('playSongFromArtist - Playing:', title, 'from artist');
      setPlayingContextType('artist');
      setPlayingQueue(artistSongTitles);
      setPlayingIndex(index);
      setPlayingSongTitle(title);
      
      setDisplayPlaylistSongs(null);
      setDisplayIsPlayingFromLiked(false);
      setDisplayIsPlayingFromArtist(true);
      setDisplayArtistQueue(artistSongTitles);
      setShowArtistView(true);
      setSelectedPlaylist(null);
      setShowLikedSongs(false);
    }
  }, [selectedArtist, getSongsForArtistByName]);

  // Navigation handlers - THESE DO NOT RESET PLAYBACK
  const handleSelectArtist = useCallback((artistName: string) => {
    const songsForArtist = getSongsForArtistByName(artistName);
    setSelectedArtist(artistName);
    setArtistSongs(songsForArtist);
    setShowArtistView(true);
    setSelectedPlaylist(null);
    setShowLikedSongs(false);
    setActiveTab("artists");
  }, [getSongsForArtistByName]);

  const handleBackFromArtist = useCallback(() => {
    setShowArtistView(false);
    setSelectedArtist(null);
    setArtistSongs([]);
    setActiveTab("artists");
  }, []);

  const handleLikedSongs = useCallback(() => {
    setSelectedPlaylist(null);
    setShowLikedSongs(true);
    setShowArtistView(false);
    setSelectedArtist(null);
    setActiveTab("library");
  }, []);

  const handleLibraryView = useCallback(() => {
    setSelectedPlaylist(null);
    setShowLikedSongs(false);
    setShowArtistView(false);
    setSelectedArtist(null);
    setActiveTab("library");
  }, []);

  const handleNavigation = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Other handlers
  const addUserSong = useCallback(async (newSong: { title: string; artist: string; cover: string; src: string }) => {
    try {
      await addSongToSupabase({
        title: newSong.title,
        artist: newSong.artist,
        cover_url: newSong.cover,
        audio_url: newSong.src,
      });
      alert("✅ Song added successfully!");
      await refreshSongs();
    } catch (error) {
      console.error("Failed to add song:", error);
      alert("Failed to add song. Please try again.");
    }
  }, [addSongToSupabase, refreshSongs]);

  const deleteUserSong = useCallback(async (songId: string, songTitle: string) => {
    if (!isAdmin) {
      alert("Only admins can delete songs");
      return;
    }
    
    if (confirm(`⚠️ ADMIN ACTION: Permanently delete "${songTitle}" for ALL users?\n\nThis action cannot be undone!`)) {
      try {
        await deleteSongFromSupabase(songId);
        alert(`✅ Song "${songTitle}" has been permanently deleted by admin`);
        await refreshSongs();
      } catch (error) {
        console.error("Failed to delete song:", error);
        alert("Failed to delete song. Please try again.");
      }
    }
  }, [isAdmin, deleteSongFromSupabase, refreshSongs]);

  const updateSong = useCallback(async (songId: string, title: string, artist: string, cover_url: string, audio_url?: string) => {
    if (!isAdmin) {
      alert("Only admins can edit songs");
      return;
    }
    
    try {
      const updates: any = { title, artist, cover_url };
      if (audio_url) {
        updates.audio_url = audio_url;
      }
      await updateSongInSupabase(songId, updates);
      alert(`✅ Song "${title}" has been updated successfully!`);
      await refreshSongs();
    } catch (error) {
      console.error("Failed to update song:", error);
      alert("Failed to update song. Please try again.");
    }
  }, [isAdmin, updateSongInSupabase, refreshSongs]);

  const handlePlaylistCoverSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPlaylistCoverFile(file);
      setPlaylistCoverPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleCreatePlaylist = useCallback(async (name: string, coverFile?: File | null) => {
    if (name.trim()) {
      await createPlaylist(name.trim(), coverFile);
      setTempPlaylistName("");
      setPlaylistCoverFile(null);
      setPlaylistCoverPreview("");
      setShowCreateModal(false);
      await refreshPlaylists();
    }
  }, [createPlaylist, refreshPlaylists]);

  const handleDeletePlaylist = useCallback(async (playlistId: string) => {
    setDeletingPlaylistId(playlistId);
    setTimeout(async () => {
      await deletePlaylist(playlistId);
      setDeletingPlaylistId(null);
    }, 300);
  }, [deletePlaylist]);

  const handleLike = useCallback(async (e: React.MouseEvent, songTitle: string) => {
    e.stopPropagation();
    await toggleLike(songTitle);
  }, [toggleLike]);

  const handleSelectSuggestion = useCallback((songTitle: string) => {
    playSong(songTitle, 'all', undefined, allSongs.map(s => s.title));
    setShowSuggestions(false);
  }, [playSong, allSongs]);

  const clearSearch = useCallback(() => {
    setSearch("");
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowSuggestions(true);
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (search.trim()) {
      setShowSuggestions(true);
    }
  }, [search]);

  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const scrollContentToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || (scrollContainerRef.current?.scrollTop || 0);
      setShowBackToTop(scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener("scroll", handleScroll);
    }
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const handleScrollToTop = (e: CustomEvent) => {
      if (e.detail === "home" || e.detail === "search") {
        setTimeout(() => scrollContentToTop(), 100);
      }
    };
    window.addEventListener('scrollToTop', handleScrollToTop as EventListener);
    return () => window.removeEventListener('scrollToTop', handleScrollToTop as EventListener);
  }, [scrollContentToTop]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleSelectPlaylist = (e: CustomEvent) => {
      setSelectedPlaylist(e.detail);
      setShowLikedSongs(false);
      setActiveTab("library");
      setShowArtistView(false);
      setSelectedArtist(null);
    };
    window.addEventListener('selectPlaylist', handleSelectPlaylist as EventListener);
    return () => window.removeEventListener('selectPlaylist', handleSelectPlaylist as EventListener);
  }, []);

  // ========== LISTEN FOR MINI PLAYER TOGGLE FROM MUSIC PLAYER ==========
  useEffect(() => {
    const handleToggleMiniPlayer = (e: CustomEvent) => {
      setIsMiniPlayerVisible(e.detail.visible);
    };
    
    window.addEventListener('toggleMiniPlayer', handleToggleMiniPlayer as EventListener);
    return () => window.removeEventListener('toggleMiniPlayer', handleToggleMiniPlayer as EventListener);
  }, []);

  // Update recently played when song changes
  useEffect(() => {
    if (!playingSongTitle) return;
    setRecentlyPlayed((prev) => {
      if (prev[0] === playingSongTitle) return prev;
      return [playingSongTitle, ...prev.filter((title) => title !== playingSongTitle)].slice(0, 5);
    });
  }, [playingSongTitle]);

  // ========== PWA PERSISTENCE - Save playing state to localStorage ==========
  useEffect(() => {
    if (playingSongTitle && playingQueue.length > 0) {
      try {
        const stateToSave = {
          songTitle: playingSongTitle,
          queue: playingQueue,
          index: playingIndex,
          context: playingContextType,
          timestamp: Date.now()
        };
        localStorage.setItem('pavpav_playing_state', JSON.stringify(stateToSave));
        console.log('Saved playing state:', { playingSongTitle, playingIndex, queueLength: playingQueue.length });
      } catch (error) {
        console.error('Failed to save playing state:', error);
      }
    }
  }, [playingSongTitle, playingQueue, playingIndex, playingContextType]);

  // Load playing state from localStorage on app start
  useEffect(() => {
    if (allSongs.length === 0) return;
    
    try {
      const savedStateStr = localStorage.getItem('pavpav_playing_state');
      
      if (savedStateStr) {
        const savedState = JSON.parse(savedStateStr);
        const { songTitle, queue, index, context } = savedState;
        
        const songExistsInAllSongs = allSongs.some(s => s.title === songTitle);
        const songExistsInQueue = queue && queue.includes(songTitle);
        
        if (songExistsInAllSongs && songExistsInQueue && queue[index] === songTitle) {
          setPlayingSongTitle(songTitle);
          setPlayingQueue(queue);
          setPlayingIndex(index);
          if (context) setPlayingContextType(context);
          console.log('Loaded saved playing state:', { songTitle, index, queueLength: queue.length });
        } else {
          console.log('Saved song not found, using first song');
          if (allSongs.length > 0 && !playingSongTitle) {
            const defaultQueue = allSongs.map(s => s.title);
            setPlayingSongTitle(allSongs[0].title);
            setPlayingQueue(defaultQueue);
            setPlayingIndex(0);
          }
        }
      } else if (allSongs.length > 0 && !playingSongTitle) {
        const defaultQueue = allSongs.map(s => s.title);
        setPlayingSongTitle(allSongs[0].title);
        setPlayingQueue(defaultQueue);
        setPlayingIndex(0);
      }
    } catch (error) {
      console.error('Failed to load playing state:', error);
      if (allSongs.length > 0 && !playingSongTitle) {
        const defaultQueue = allSongs.map(s => s.title);
        setPlayingSongTitle(allSongs[0].title);
        setPlayingQueue(defaultQueue);
        setPlayingIndex(0);
      }
    }
  }, [allSongs]);

  const suggestions = useMemo(() => getSuggestions(search, allSongs, 5), [search, allSongs]);

  const filteredSongs = useMemo(() => {
    if (!search.trim()) return allSongs;
    return allSongs.filter((song) => fuzzySearch(song.title, search) || fuzzySearch(song.artist, search));
  }, [search, allSongs]);

  const recentlyPlayedSongs = recentlyPlayed.map((title) => allSongs.find((song) => song.title === title)).filter(Boolean);

  // For MusicPlayer - get current queue from persistent state
  const playerQueue = playingQueue.length > 0 ? playingQueue : allSongs.map(s => s.title);
  const playerIndex = playingIndex;
  
  const handlePlayerSetIndex = useCallback((value: React.SetStateAction<number>) => {
    if (typeof value === 'function') {
      const newIndex = value(playingIndex);
      setPlayingIndex(newIndex);
      setPlayingSongTitle(playerQueue[newIndex]);
    } else {
      setPlayingIndex(value);
      setPlayingSongTitle(playerQueue[value]);
    }
  }, [playingIndex, playerQueue]);

  // Create stable current song object for MusicPlayer
  const musicPlayerCurrentSong = useMemo(() => {
    if (!currentSongObject) {
      return { title: "", artist: "", cover: "", src: "" };
    }
    return {
      title: currentSongObject.title,
      artist: currentSongObject.artist,
      cover: currentSongObject.cover_url || "",
      src: currentSongObject.audio_url || "",
    };
  }, [currentSongObject?.title, currentSongObject?.artist, currentSongObject?.cover_url, currentSongObject?.audio_url]);

  // Create stable songs array for MusicPlayer
  const musicPlayerSongs = useMemo(() => {
    return allSongs.map(s => ({ 
      title: s.title, 
      artist: s.artist, 
      cover: s.cover_url || "", 
      src: s.audio_url || "" 
    }));
  }, [allSongs]);

  // Loading state
  if (songsLoading || authLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your music...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-glow" />
      <div className="bg-glow" />

      <main className="flex h-screen overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigation}
          totalSongs={likedSongs.length}
          onNavigateToLibrary={handleLibraryView}
          onNavigateToLikedSongs={handleLikedSongs}
          onSelectArtist={handleSelectArtist}
          user={user}
          onSignOut={signOut}
          onSignIn={() => setShowAuthModal(true)}
          isAdmin={isAdmin}
        />

        <motion.section 
          ref={scrollContainerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-[100] flex-1 overflow-y-auto md:ml-72 pt-45 md:pt-[70px] pb-[140px] px-4 md:px-5"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
            <div className="flex items-center justify-between w-full md:w-auto">
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                {activeTab === "home" && "Home"}
                {activeTab === "search" && "Search"}
                {activeTab === "library" && (showLikedSongs ? "Liked Songs" : "Library")}
                {activeTab === "artists" && (showArtistView ? `Artist: ${selectedArtist}` : "Artists")}
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

              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 transition text-sm font-medium shadow-lg shadow-purple-500/30"
              >
                <Upload size={14} />
                <span className="hidden sm:inline">Add Song</span>
              </button>

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

          {/* ========== YOUR EXISTING HOME TAB CONTENT ========== */}
          {activeTab === "home" && (
            <>
              {recentlyPlayedSongs.length > 0 && (
                <>
                  <h3 className="text-lg md:text-2xl font-bold mb-4">Recently Played</h3>
                  <div className="grid gap-4 md:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-10">
                    {recentlyPlayedSongs.slice(0, 6).map((song, i) => (
                      <motion.div
                        key={song!.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => playSong(song!.title, 'all', undefined, allSongs.map(s => s.title))}
                        className="group cursor-pointer relative"
                      >
                        <div className="relative rounded-xl overflow-hidden">
                          <img
                            src={song!.cover_url}
                            alt={song!.title}
                            className="w-full aspect-square object-cover transition-transform group-hover:scale-105 duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(e, song!.title);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-all duration-200 hover:bg-purple-500 z-10"
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
                {allSongs.map((song, i) => {
                  const isUserSong = !song.is_default;
                  
                  return (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="group cursor-pointer relative"
                      onClick={() => playSong(song.title, 'all', undefined, allSongs.map(s => s.title))}
                    >
                      <div className="relative rounded-xl overflow-hidden">
                        <img
                          src={song.cover_url}
                          alt={song.title}
                          className="w-full aspect-square object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity" />
                        
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSong(song.title);
                            setShowModal(true);
                          }}
                          className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-500 z-10"
                        >
                          <Plus size={14} />
                        </motion.button>
                        
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => handleLike(e, song.title)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-purple-500 z-10"
                        >
                          <Heart 
                            size={14} 
                            className={isLiked(song.title) ? "text-purple-400 fill-purple-400" : "text-white"}
                          />
                        </motion.button>

                        {isAdmin && (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSong(song);
                              setShowEditModal(true);
                            }}
                            className="absolute bottom-2 right-12 w-8 h-8 rounded-full bg-yellow-500/90 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-yellow-600 shadow-lg shadow-yellow-500/30 z-10"
                            title="Edit song (Admin only)"
                          >
                            <Edit2 size={14} className="text-white" />
                          </motion.button>
                        )}

                        {isAdmin && (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`⚠️ ADMIN ACTION: Delete "${song.title}"?\n\nThis will remove this song for ALL users permanently!`)) {
                                deleteUserSong(song.id, song.title);
                              }
                            }}
                            className="absolute bottom-2 right-20 w-8 h-8 rounded-full bg-red-500/90 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg shadow-red-500/30 z-10"
                            title="Delete this song (Admin only)"
                          >
                            <Trash2 size={14} className="text-white" />
                          </motion.button>
                        )}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold truncate">{song.title}</h3>
                      <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                      
                      {isAdmin && isUserSong && (
                        <span className="absolute top-1 left-1 text-[8px] bg-purple-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white font-medium shadow-sm z-10">
                          User
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* ========== YOUR EXISTING SEARCH TAB CONTENT ========== */}
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
              {filteredSongs.map((song, i) => {
                const isUserSong = !song.is_default;
                
                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group cursor-pointer relative"
                    onClick={() => playSong(song.title, 'all', undefined, allSongs.map(s => s.title))}
                  >
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full aspect-square object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity" />
                      
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSong(song.title);
                          setShowModal(true);
                        }}
                        className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-500 z-10"
                      >
                        <Plus size={14} />
                      </motion.button>
                      
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleLike(e, song.title)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-purple-500 z-10"
                      >
                        <Heart 
                          size={14} 
                          className={isLiked(song.title) ? "text-purple-400 fill-purple-400" : "text-white"}
                        />
                      </motion.button>

                      {isAdmin && (
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSong(song);
                            setShowEditModal(true);
                          }}
                          className="absolute bottom-2 right-12 w-8 h-8 rounded-full bg-yellow-500/90 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-yellow-600 shadow-lg shadow-yellow-500/30 z-10"
                          title="Edit song (Admin only)"
                        >
                          <Edit2 size={14} className="text-white" />
                        </motion.button>
                      )}

                      {isAdmin && (
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`⚠️ ADMIN ACTION: Delete "${song.title}"?\n\nThis will remove this song for ALL users permanently!`)) {
                              deleteUserSong(song.id, song.title);
                            }
                          }}
                          className="absolute bottom-2 right-20 w-8 h-8 rounded-full bg-red-500/90 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg shadow-red-500/30 z-10"
                          title="Delete this song (Admin only)"
                        >
                          <Trash2 size={14} className="text-white" />
                        </motion.button>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold truncate">{song.title}</h3>
                    <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                    
                    {isAdmin && isUserSong && (
                      <span className="absolute top-1 left-1 text-[8px] bg-purple-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white font-medium shadow-sm z-10">
                        User
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ========== YOUR EXISTING ARTISTS TAB CONTENT ========== */}
          {activeTab === "artists" && (
            showArtistView ? (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={handleBackFromArtist}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group"
                  >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Artists
                  </button>
                </div>

                <div className="glass rounded-3xl p-6 md:p-8 mb-8">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                    <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                      <Mic size={80} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 uppercase text-sm tracking-widest">Artist</p>
                      <h1 className="text-4xl md:text-6xl font-black mt-2">{selectedArtist}</h1>
                      <p className="text-gray-400 mt-3">{artistSongs.length} songs</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (artistSongs.length > 0) {
                            playSongFromArtist(artistSongs[0].title);
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
                  {artistSongs.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-2xl p-12 text-center text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <Mic size={48} className="text-gray-500" />
                        <div>
                          <p className="text-lg">No songs by this artist yet</p>
                          <p className="text-sm text-gray-500 mt-1">Songs will appear here when added</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {artistSongs.map((song, index) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="glass rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition flex items-center gap-4 group"
                    >
                      <div
                        onClick={() => playSongFromArtist(song.title)}
                        className="flex items-center gap-4 flex-1"
                      >
                        <div className="w-8 text-center text-gray-500 font-semibold">
                          {index + 1}
                        </div>
                        <img src={song.cover_url} alt={song.title} className="w-16 h-16 rounded-2xl object-cover" />
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
                            setSelectedSongForPlaylist(song);
                            setShowAddToPlaylistModal(true);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition md:opacity-0 md:group-hover:opacity-100 hover:bg-green-500/20"
                          title="Add to Playlist"
                        >
                          <Plus size={14} className="text-gray-400 hover:text-green-400" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSongFromArtist(song.title);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Play size={14} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(e, song.title);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Heart size={14} className={isLiked(song.title) ? "text-purple-400 fill-purple-400" : "text-gray-400 hover:text-purple-400"} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold mb-6">All Artists</h3>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {artists.length === 0 ? (
                    <div className="glass rounded-3xl p-16 text-center col-span-full">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Mic size={64} className="text-gray-500" />
                        <div>
                          <p className="text-gray-400 text-lg">No artists yet</p>
                          <p className="text-sm text-gray-500 mt-1">Artists will appear here when added</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    artists.map((artist) => {
                      const songCount = getSongsForArtistByName(artist.name).length;
                      return (
                        <motion.div
                          key={artist.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleSelectArtist(artist.name)}
                          className="group cursor-pointer"
                        >
                          <div className="relative rounded-xl overflow-hidden aspect-square">
                            {artist.cover_url ? (
                              <img
                                src={artist.cover_url}
                                alt={artist.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                                <Mic size={48} className="text-purple-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <h4 className="mt-2 font-semibold text-sm truncate">{artist.name}</h4>
                          <p className="text-gray-400 text-xs">{songCount} songs</p>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            )
          )}

          {/* ========== YOUR EXISTING LIBRARY TAB CONTENT ========== */}
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
                      key={song.id}
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
                        <img src={song.cover_url} alt={song.title} className="w-16 h-16 rounded-2xl object-cover" />
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
                          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-all"
                        >
                          <Play size={14} />
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
              (() => {
                const currentPlaylist = playlists.find(p => p.id === selectedPlaylist);
                if (selectedPlaylist && currentPlaylist) {
                  return (
                    <PlaylistView
                      playlist={currentPlaylist}
                      songs={allSongs.map(s => ({ title: s.title, artist: s.artist, cover: s.cover_url, src: s.audio_url }))}
                      onBack={() => setSelectedPlaylist(null)}
                      onPlaySong={(title) => {
                        const playlist = playlists.find(p => p.id === selectedPlaylist);
                        if (playlist) {
                          playSongFromPlaylist(title, playlist.songs, playlist.id);
                        }
                      }}
                      onRenamePlaylist={renamePlaylist}
                      onDeletePlaylist={handleDeletePlaylist}
                      onRemoveSong={removeSongFromPlaylist}
                      onAddToPlaylist={addSongToPlaylist}
                      likedSongs={likedSongs}
                      onToggleLike={toggleLike}
                      isLiked={isLiked}
                      onReorderSongs={async (playlistId, newOrder) => {
                        console.log("Reorder not implemented yet");
                      }}
                      allPlaylists={playlists.map(p => ({ id: p.id, name: p.name, songs: p.songs, cover_url: p.cover_url, created_at: p.created_at }))}
                    />
                  );
                } else {
                  return (
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
                        {playlists.map((playlistItem, i) => (
                          <motion.div
                            key={playlistItem.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedPlaylist(playlistItem.id)}
                            className="group cursor-pointer"
                          >
                            <div className="relative rounded-xl overflow-hidden aspect-square">
                              <RotatingPlaylistCover playlist={playlistItem} allSongs={allSongs} />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (playlistItem.songs.length > 0) {
                                    playSongFromPlaylist(playlistItem.songs[0], playlistItem.songs, playlistItem.id);
                                  }
                                }}
                                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg opacity-0 md:group-hover:opacity-100 transition-all duration-200"
                              >
                                <Play size={18} className="ml-0.5" />
                              </motion.button>
                            </div>
                            <h4 className="mt-2 font-semibold text-sm truncate">{playlistItem.name}</h4>
                            <p className="text-gray-400 text-xs">{playlistItem.songs.length} songs</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                }
              })()
            )
          )}
        </motion.section>
      </main>

      {/* Add to Playlist Modal */}
      <AnimatePresence>
        {showAddToPlaylistModal && selectedSongForPlaylist && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-blue-500/30 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    Add to Playlist
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Song: {selectedSongForPlaylist.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddToPlaylistModal(false);
                    setSelectedSongForPlaylist(null);
                  }}
                  className="p-1 rounded-full hover:bg-white/10 transition"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <div className="p-5 max-h-80 overflow-y-auto">
                {playlists.length === 0 ? (
                  <div className="text-center py-8">
                    <Plus size={48} className="mx-auto text-gray-500 mb-3" />
                    <p className="text-gray-400">No playlists available</p>
                    <p className="text-xs text-gray-500 mt-1">Create a playlist from the sidebar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlists.map((playlistItem) => (
                      <button
                        key={playlistItem.id}
                        onClick={async () => {
                          setIsAddingToPlaylist(true);
                          try {
                            await addSongToPlaylist(playlistItem.id, selectedSongForPlaylist.title);
                            setAddedToPlaylist([...addedToPlaylist, playlistItem.id]);
                            alert(`✅ Song added to playlist successfully!`);
                            setTimeout(() => {
                              setShowAddToPlaylistModal(false);
                              setSelectedSongForPlaylist(null);
                              setAddedToPlaylist([]);
                            }, 1000);
                          } catch (error) {
                            console.error("Error adding to playlist:", error);
                            alert("Failed to add song to playlist");
                          } finally {
                            setIsAddingToPlaylist(false);
                          }
                        }}
                        disabled={isAddingToPlaylist}
                        className="w-full text-left p-3 rounded-xl hover:bg-white/10 transition flex items-center gap-3 disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex-shrink-0">
                          {playlistItem.cover_url ? (
                            <img src={playlistItem.cover_url} alt={playlistItem.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music size={16} className="text-blue-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{playlistItem.name}</p>
                          <p className="text-xs text-gray-400">{playlistItem.songs.length} songs</p>
                        </div>
                        {addedToPlaylist.includes(playlistItem.id) && (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowAddToPlaylistModal(false);
                    setSelectedSongForPlaylist(null);
                  }}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showModal && (
        <PlaylistModal
          songTitle={selectedSong}
          playlists={playlists.map(p => ({ id: p.id, name: p.name, songs: p.songs, cover: p.cover_url || "", createdAt: p.created_at }))}
          onClose={() => setShowModal(false)}
          onCreate={handleCreatePlaylist}
          onAdd={async (playlistId, songTitle) => {
            await addSongToPlaylist(playlistId, songTitle);
          }}
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
              <p className="text-xs text-gray-500 mt-1">Add a custom cover image (optional)</p>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Playlist Cover</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                    {playlistCoverPreview ? (
                      <img src={playlistCoverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <Disc3 size={28} className="text-blue-400/60" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <input
                      ref={playlistCoverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePlaylistCoverSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => playlistCoverInputRef.current?.click()}
                      className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm flex items-center justify-center gap-2"
                    >
                      <ImageIcon size={16} />
                      {playlistCoverFile ? "Change Cover" : "Upload Cover"}
                    </button>
                    {playlistCoverFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlaylistCoverFile(null);
                          setPlaylistCoverPreview("");
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 w-full text-center"
                      >
                        Remove Cover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input
                type="text"
                value={tempPlaylistName}
                onChange={(e) => setTempPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist(tempPlaylistName, playlistCoverFile)}
              />
              
              <div className="flex gap-2 mt-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreatePlaylist(tempPlaylistName, playlistCoverFile)} 
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 font-medium"
                >
                  Create
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowCreateModal(false);
                    setPlaylistCoverFile(null);
                    setPlaylistCoverPreview("");
                    setTempPlaylistName("");
                  }} 
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Music Player */}
      <MusicPlayer
        songs={musicPlayerSongs}
        currentSong={musicPlayerCurrentSong}
        currentIndex={playerIndex}
        setCurrentIndex={handlePlayerSetIndex}
        currentQueue={playerQueue}
        onNext={playNext}
        onPrev={playPrevious}
      />

      {/* ========== DRAGGABLE MINI MUSIC PLAYER ========== */}
      {isMiniPlayerVisible && (
        <DraggableMiniPlayer
          currentSong={musicPlayerCurrentSong}
          isPlaying={isMiniPlayerPlaying}
          onTogglePlay={handleMiniPlayerTogglePlay}
          onNext={playNext}
          onPrev={playPrevious}
          progress={miniPlayerProgress}
          onSeek={handleMiniPlayerSeek}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <DownloadSongModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onAddSong={addUserSong}
      />

      <AdminEditSongModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSong(null);
        }}
        song={editingSong}
        onSave={updateSong}
        onUploadAudio={uploadAudioFile}
        onUploadCover={uploadCoverImage}
      />

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.3 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25 
            }}
            onClick={scrollToTop}
            className="fixed bottom-28 right-4 z-[9999] active:scale-95"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "28px",
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Back to top"
          >
            <div 
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: "28px",
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                opacity: 0.5,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div 
              style={{
                position: "absolute",
                inset: "4px",
                borderRadius: "24px",
                background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), rgba(255,255,255,0))",
              }}
            />
            <ArrowUp 
              size={28} 
              style={{ 
                color: "white",
                position: "relative",
                zIndex: 1,
                strokeWidth: 2.5,
              }} 
            />
            <style>{`
              @keyframes pulse {
                0%, 100% {
                  transform: scale(1);
                  opacity: 0.5;
                }
                50% {
                  transform: scale(1.2);
                  opacity: 0.8;
                }
              }
            `}</style>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}