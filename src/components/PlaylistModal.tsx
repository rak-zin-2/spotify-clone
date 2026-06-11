// components/PlaylistModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Check, Image, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type Playlist = {
  id: string;
  name: string;
  songs: string[];
  cover?: string;
  createdAt: string;
};

type Props = {
  songTitle: string;
  playlists: Playlist[];
  onClose: () => void;
  onCreate: (name: string, coverFile?: File | null) => Promise<void>;
  onAdd: (playlistId: string, songTitle: string) => Promise<void>;
};

export default function PlaylistModal({
  songTitle,
  playlists,
  onClose,
  onCreate,
  onAdd,
}: Props) {
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [addedTo, setAddedTo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { user } = useSupabaseAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newName.trim()) return;
    setIsLoading(true);
    try {
      await onCreate(newName.trim(), coverFile);
      setNewName("");
      setCoverFile(null);
      setCoverPreview("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    try {
      await onAdd(playlistId, songTitle);
      setAddedTo([...addedTo, playlistId]);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Failed to add to playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold">Add to playlist</h2>
            <p className="text-sm text-gray-400 mt-1">{songTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {playlists.length === 0 && !isCreating && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">📀</div>
              <p className="text-gray-400 mb-2">No playlists yet</p>
              <p className="text-sm text-gray-500">Create your first playlist below</p>
            </div>
          )}

          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => handleAddToPlaylist(playlist.id)}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group border-b border-white/5 disabled:opacity-50"
            >
              {playlist.cover && playlist.cover !== "" ? (
                <img
                  src={playlist.cover}
                  alt={playlist.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
              )}
              
              <div className="flex-1 text-left">
                <h3 className="font-semibold">{playlist.name}</h3>
                <p className="text-xs text-gray-400">
                  {playlist.songs.length} {playlist.songs.length === 1 ? "song" : "songs"}
                </p>
              </div>

              {addedTo.includes(playlist.id) ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-blue-400 transition-colors" />
              )}
            </button>
          ))}

          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-t border-white/10"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <Plus size={20} className="text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-blue-400">Create new playlist</h3>
                <p className="text-xs text-gray-400">Start a fresh collection</p>
              </div>
            </button>
          ) : (
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex gap-3">
                {/* Playlist Cover Preview */}
                <div className="flex-shrink-0">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Playlist cover"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                  )}
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="mt-1 text-[10px] text-blue-400 hover:text-blue-300 w-full text-center"
                  >
                    Add cover
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My awesome playlist"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:border-blue-400 transition-colors text-sm"
                    autoFocus
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePlaylist();
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={isLoading}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {isLoading ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setCoverFile(null);
                        setCoverPreview("");
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}