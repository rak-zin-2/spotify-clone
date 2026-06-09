"use client";

import { useState, useEffect, useRef } from "react";
import { Playlist } from "@/types/playlist";
import { Plus, X, Check } from "lucide-react";

type Props = {
  songTitle: string;
  playlists: Playlist[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onAdd: (playlistId: string, songTitle: string) => void;
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleCreatePlaylist = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setIsCreating(false);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    onAdd(playlistId, songTitle);
    setAddedTo([...addedTo, playlistId]);
    // Show success then close after delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
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

        {/* Playlists list */}
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
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group border-b border-white/5"
            >
              {/* Playlist cover */}
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
              
              {/* Playlist info */}
              <div className="flex-1 text-left">
                <h3 className="font-semibold">{playlist.name}</h3>
                <p className="text-xs text-gray-400">
                  {playlist.songs.length} {playlist.songs.length === 1 ? "song" : "songs"}
                </p>
              </div>

              {/* Checkmark if added */}
              {addedTo.includes(playlist.id) ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-blue-400 transition-colors" />
              )}
            </button>
          ))}

          {/* Create new playlist section */}
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
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">✨</span>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My awesome playlist"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:border-blue-400 transition-colors text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePlaylist();
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreatePlaylist}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 transition text-sm font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
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

        {/* Footer */}
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