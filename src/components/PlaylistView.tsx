"use client";

import { ArrowLeft, Play, MoreVertical, Pencil, Trash2, Heart, Music, Disc3 } from "lucide-react";
import { Playlist } from "@/types/playlist";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Song = {
  title: string;
  artist: string;
  cover: string;
  src: string;
};

type Props = {
  playlist: Playlist;
  songs: Song[];
  onBack: () => void;
  onPlaySong: (title: string) => void;
  onRenamePlaylist?: (playlistId: string, newName: string) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onRemoveSong?: (playlistId: string, songTitle: string) => void;
  likedSongs?: string[];
  onToggleLike?: (songTitle: string) => void;
  isLiked?: (songTitle: string) => boolean;
  onReorderSongs?: (playlistId: string, newOrder: string[]) => void;
};

export default function PlaylistView({
  playlist,
  songs: allSongs,
  onBack,
  onPlaySong,
  onRenamePlaylist,
  onDeletePlaylist,
  onRemoveSong,
  likedSongs = [],
  onToggleLike,
  isLiked,
  onReorderSongs,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(playlist.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [removingSong, setRemovingSong] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const playlistSongs = allSongs.filter((song) =>
    playlist.songs.includes(song.title)
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isRenaming]);

  const playAll = () => {
    if (playlistSongs.length > 0) {
      onPlaySong(playlistSongs[0].title);
    }
  };

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== playlist.name) {
      onRenamePlaylist?.(playlist.id, newName.trim());
    }
    setIsRenaming(false);
    setShowMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewName(playlist.name);
    }
  };

  const handleDeletePlaylist = () => {
    onDeletePlaylist?.(playlist.id);
    onBack();
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  const handleRemoveSong = (songTitle: string) => {
    setRemovingSong(songTitle);
    setTimeout(() => {
      onRemoveSong?.(playlist.id, songTitle);
      setRemovingSong(null);
    }, 300);
  };

  const handleLike = (e: React.MouseEvent, songTitle: string) => {
    e.stopPropagation();
    onToggleLike?.(songTitle);
  };

  // Get cover images for rotating
  const getCoverImages = () => {
    const covers = playlistSongs.map(song => song.cover).filter(cover => cover);
    if (playlist.cover && playlist.cover !== "") {
      return [playlist.cover, ...covers];
    }
    return covers.length > 0 ? covers : [];
  };

  const coverImages = getCoverImages();
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);

  useEffect(() => {
    if (coverImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCoverIndex((prev) => (prev + 1) % coverImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [coverImages.length]);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Delete Playlist Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-red-500/30 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10">
                <h2 className="text-xl font-bold text-red-400">Delete Playlist?</h2>
              </div>
              <div className="p-5">
                <p className="text-gray-300">
                  Are you sure you want to delete "<span className="font-semibold text-white">{playlist.name}</span>"?
                </p>
                <p className="text-gray-400 text-sm mt-2">This action cannot be undone.</p>
                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeletePlaylist}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 font-medium"
                  >
                    Delete
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Back Button and Menu */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Library
        </button>

        {/* Three dots menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <MoreVertical size={20} className="text-gray-400" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 bg-gray-800/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-xl z-50"
              >
                <button
                  onClick={() => {
                    setIsRenaming(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10 transition"
                >
                  <Pencil size={16} />
                  Rename
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
                >
                  <Trash2 size={16} />
                  Delete Playlist
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Playlist Header - Horizontal Layout */}
      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left - Rotating Cover Art */}
          <div className="flex-shrink-0">
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-2xl">
              {coverImages.length === 0 ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                  <Disc3 size={48} className="text-blue-400/60" />
                </div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentCoverIndex}
                      src={coverImages[currentCoverIndex]}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.5 }}
                    />
                  </AnimatePresence>
                  {coverImages.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50">
                      <motion.div
                        className="h-full bg-blue-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        key={currentCoverIndex}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right - Playlist Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-gray-400 uppercase text-xs tracking-widest mb-2">
                Playlist
              </p>

              {isRenaming ? (
                <div className="mt-2">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={handleKeyDown}
                    className="text-3xl md:text-4xl font-black bg-transparent border-b-2 border-blue-500 outline-none px-2 py-1 w-full"
                  />
                </div>
              ) : (
                <motion.h1 
                  key={playlist.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl md:text-5xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
                >
                  {playlist.name}
                </motion.h1>
              )}

              <div className="flex items-center gap-3 mt-3">
                <motion.p 
                  key={playlistSongs.length}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.3 }}
                  className="text-gray-400 text-sm"
                >
                  {playlistSongs.length} {playlistSongs.length === 1 ? "song" : "songs"}
                </motion.p>
                <span className="text-gray-600">•</span>
                <p className="text-gray-500 text-sm">
                  Created {new Date(playlist.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={playAll}
              className="mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition font-semibold shadow-lg shadow-blue-500/30 w-full md:w-auto"
            >
              <Play size={18} fill="white" />
              Play Playlist
            </motion.button>
          </div>
        </div>
      </div>

      {/* Songs List - Simple list without drag and drop */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Music size={18} className="text-blue-400" />
          Songs
        </h3>
        
        <AnimatePresence mode="popLayout">
          {playlistSongs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-2xl p-12 text-center text-gray-400"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <Music size={32} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-lg">No songs in this playlist yet</p>
                  <p className="text-sm text-gray-500 mt-1">Add songs from the Home or Search tab</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {playlistSongs.map((song, index) => (
                <motion.div
                  key={song.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ 
                    opacity: 0, 
                    x: -100,
                    transition: { duration: 0.3 }
                  }}
                  transition={{ 
                    opacity: { duration: 0.2 }
                  }}
                  className="glass rounded-xl p-3 transition-all duration-200 group hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    {/* Song Number */}
                    <div className="w-8 text-center">
                      <span className="text-gray-500 text-sm font-medium">{index + 1}</span>
                    </div>

                    {/* Song Cover */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={song.cover}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Song Info */}
                    <div
                      onClick={() => onPlaySong(song.title)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h4 className="font-medium text-white truncate text-sm">
                        {song.title}
                      </h4>
                      <p className="text-gray-400 text-xs truncate">
                        {song.artist}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlaySong(song.title);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
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
                        className="w-8 h-8 rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                      >
                        <Heart 
                          size={14} 
                          className={isLiked?.(song.title) ? "text-purple-400 fill-purple-400" : "text-gray-400 hover:text-purple-400"}
                        />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSong(song.title);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                      >
                        <Trash2 size={14} className="text-gray-400 hover:text-red-400" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}