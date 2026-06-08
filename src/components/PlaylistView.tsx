"use client";

import { ArrowLeft, Play } from "lucide-react";
import { Playlist } from "@/types/playlist";

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
};

export default function PlaylistView({
  playlist,
  songs,
  onBack,
  onPlaySong,
}: Props) {
  const playlistSongs = songs.filter((song) =>
    playlist.songs.includes(song.title)
  );

  const playAll = () => {
    if (playlistSongs.length > 0) {
      onPlaySong(playlistSongs[0].title);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
      >
        <ArrowLeft size={18} />
        Back to Library
      </button>

      <div className="glass rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
          <img
            src={
              playlist.cover ||
              "/images/default_playlist.jpg"
            }
            alt={playlist.name}
            className="w-48 h-48 rounded-3xl object-cover shadow-2xl"
          />

          <div className="flex-1">
            <p className="text-gray-400 uppercase text-sm tracking-widest">
              Playlist
            </p>

            <h1 className="text-4xl md:text-6xl font-black mt-2">
              {playlist.name}
            </h1>

            <p className="text-gray-400 mt-3">
              {playlistSongs.length} songs
            </p>

            <p className="text-gray-500 text-sm mt-1">
              Created{" "}
              {new Date(
                playlist.createdAt
              ).toLocaleDateString()}
            </p>

            <button
              onClick={playAll}
              className="mt-6 flex items-center gap-2 px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-400 transition font-semibold"
            >
              <Play size={18} />
              Play Playlist
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {playlistSongs.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-gray-400">
            No songs in this playlist yet.
          </div>
        )}

        {playlistSongs.map((song, index) => (
          <div
            key={song.title}
            onClick={() =>
              onPlaySong(song.title)
            }
            className="glass rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition flex items-center gap-4"
          >
            <div className="w-8 text-center text-gray-500 font-semibold">
              {index + 1}
            </div>

            <img
              src={song.cover}
              alt={song.title}
              className="w-16 h-16 rounded-2xl object-cover"
            />

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">
                {song.title}
              </h3>

              <p className="text-gray-400 text-sm truncate">
                {song.artist}
              </p>
            </div>

            <button className="playlist-play-btn">
              <Play size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}