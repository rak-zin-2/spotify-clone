// components/ArtistsSidebar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Plus, Edit2, Trash2, X, ImageIcon, ChevronRight } from "lucide-react";
import { useSupabaseArtists } from "@/hooks/useSupabaseArtists";
import { useSupabaseSongs } from "@/hooks/useSupabaseSongs";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type Props = {
  onSelectArtist: (artistName: string, songs: any[]) => void;
  selectedArtist: string | null;
};

export default function ArtistsSidebar({ onSelectArtist, selectedArtist }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [artistName, setArtistName] = useState("");
  const [artistBio, setArtistBio] = useState("");
  const [artistCoverFile, setArtistCoverFile] = useState<File | null>(null);
  const [artistCoverPreview, setArtistCoverPreview] = useState("");
  const [artistSongs, setArtistSongs] = useState<Map<string, any[]>>(new Map());
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { artists, createArtist, updateArtist, deleteArtist, uploadArtistCover, refreshArtists } = useSupabaseArtists();
  const { songs } = useSupabaseSongs();
  const { isAdmin } = useSupabaseAuth();

  // Group songs by artist
  useEffect(() => {
    const songsByArtist = new Map<string, any[]>();
    songs.forEach(song => {
      const artistKey = song.artist.toLowerCase();
      if (!songsByArtist.has(artistKey)) {
        songsByArtist.set(artistKey, []);
      }
      songsByArtist.get(artistKey)!.push(song);
    });
    setArtistSongs(songsByArtist);
  }, [songs]);

  const handleCreateArtist = async () => {
    if (!artistName.trim()) return;
    
    await createArtist(artistName.trim(), artistCoverFile, artistBio || null);
    setArtistName("");
    setArtistBio("");
    setArtistCoverFile(null);
    setArtistCoverPreview("");
    setShowCreateModal(false);
  };

  const handleUpdateArtist = async () => {
    if (!editingArtist || !artistName.trim()) return;
    
    let coverUrl: string | null = editingArtist.cover_url;
    if (artistCoverFile) {
      const uploadedUrl = await uploadArtistCover(artistCoverFile, editingArtist.id);
      if (uploadedUrl) {
        coverUrl = uploadedUrl;
      }
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
  };

  const handleEditClick = (artist: any) => {
    setEditingArtist(artist);
    setArtistName(artist.name);
    setArtistBio(artist.bio || "");
    setArtistCoverPreview(artist.cover_url || "");
  };

  const handleDeleteArtist = async (artistId: string, artistName: string) => {
    if (confirm(`Delete artist "${artistName}"? This action cannot be undone.`)) {
      await deleteArtist(artistId);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setArtistCoverFile(file);
      setArtistCoverPreview(URL.createObjectURL(file));
    }
  };

  const getArtistSongCount = (artistName: string) => {
    const key = artistName.toLowerCase();
    return artistSongs.get(key)?.length || 0;
  };

  return (
    <>
      {/* Toggle Button for Artists Sidebar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-r-xl shadow-lg hover:scale-105 transition-transform"
        style={{ left: isOpen ? 280 : 0 }}
      >
        <Mic size={20} />
      </button>

      {/* Artists Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen z-20"
        style={{ width: isCollapsed ? 80 : 280 }}
      >
        <div className="h-full bg-gradient-to-b from-black/95 to-black/98 backdrop-blur-xl border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className={`p-4 border-b border-white/10 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Artists
                </h2>
                <p className="text-xs text-gray-500">Browse by artist</p>
              </div>
            )}
            <div className="flex gap-1">
              {isAdmin && !isCollapsed && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition"
                  title="Add Artist"
                >
                  <Plus size={16} className="text-blue-400" />
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Artists List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {artists.length === 0 && !isCollapsed && (
              <div className="text-center text-gray-500 text-sm py-8">
                <Mic size={32} className="mx-auto mb-2 opacity-50" />
                <p>No artists yet</p>
                {isAdmin && <p className="text-xs mt-1">Click + to add artists</p>}
              </div>
            )}

            {artists.map((artist) => {
              const songCount = getArtistSongCount(artist.name);
              const isSelected = selectedArtist === artist.name;
              
              return (
                <motion.button
                  key={artist.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const songsForArtist = artistSongs.get(artist.name.toLowerCase()) || [];
                    onSelectArtist(artist.name, songsForArtist);
                  }}
                  className={`w-full p-2 rounded-xl transition-all duration-200 group ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Artist Cover */}
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30">
                      {artist.cover_url ? (
                        <img
                          src={artist.cover_url}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mic size={20} className="text-purple-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Artist Info */}
                    {!isCollapsed && (
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="font-medium text-sm truncate text-white">{artist.name}</h3>
                        <p className="text-xs text-gray-500">{songCount} songs</p>
                      </div>
                    )}
                    
                    {/* Admin Actions */}
                    {isAdmin && !isCollapsed && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(artist);
                          }}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Edit2 size={12} className="text-yellow-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteArtist(artist.id, artist.name);
                          }}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Create/Edit Artist Modal */}
      <AnimatePresence>
        {(showCreateModal || editingArtist) && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl border border-purple-500/30 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {editingArtist ? 'Edit Artist' : 'Create Artist'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {isAdmin ? 'Admin only - Manage artists' : 'Only admins can create artists'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingArtist(null);
                    setArtistName("");
                    setArtistBio("");
                    setArtistCoverFile(null);
                    setArtistCoverPreview("");
                  }}
                  className="p-1 rounded-full hover:bg-white/10 transition"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Artist Cover */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Artist Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                      {artistCoverPreview ? (
                        <img src={artistCoverPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Mic size={32} className="text-purple-400" />
                      )}
                    </div>
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
                        className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm flex items-center justify-center gap-2"
                      >
                        <ImageIcon size={16} />
                        {artistCoverFile ? "Change Image" : "Upload Image"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Artist Name */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Artist Name *</label>
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="e.g., Taylor Swift"
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Artist Bio */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Bio (optional)</label>
                  <textarea
                    value={artistBio}
                    onChange={(e) => setArtistBio(e.target.value)}
                    placeholder="Tell us about the artist..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={editingArtist ? handleUpdateArtist : handleCreateArtist}
                    disabled={!artistName.trim() || (!isAdmin && !editingArtist)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 transition font-medium disabled:opacity-50"
                  >
                    {editingArtist ? 'Save Changes' : 'Create Artist'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingArtist(null);
                      setArtistName("");
                      setArtistBio("");
                      setArtistCoverFile(null);
                      setArtistCoverPreview("");
                    }}
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
    </>
  );
}