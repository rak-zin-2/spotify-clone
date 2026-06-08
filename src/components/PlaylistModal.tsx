"use client";

import { useState } from "react";
import { Playlist } from "@/types/playlist";

type Props = {
  songTitle: string;
  playlists: Playlist[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onAdd: (
    playlistId: string,
    songTitle: string
  ) => void;
};

export default function PlaylistModal({
  songTitle,
  playlists,
  onClose,
  onCreate,
  onAdd,
}: Props) {
  const [newName, setNewName] =
    useState("");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="glass rounded-3xl p-6 w-[90%] max-w-md">
        <h2 className="text-2xl font-bold mb-5">
          Save "{songTitle}"
        </h2>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => {
                onAdd(
                  playlist.id,
                  songTitle
                );
                onClose();
              }}
              className="w-full glass p-3 rounded-xl text-left"
            >
              {playlist.name}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <input
            value={newName}
            onChange={(e) =>
              setNewName(
                e.target.value
              )
            }
            placeholder="New Playlist"
            className="glass w-full rounded-xl p-3 outline-none"
          />

          <button
            onClick={() => {
              if (!newName.trim()) return;

              onCreate(newName);
              setNewName("");
            }}
            className="mt-3 w-full bg-blue-500 rounded-xl py-3"
          >
            Create Playlist
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full border border-white/10 rounded-xl py-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}