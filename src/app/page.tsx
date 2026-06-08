"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { songs } from "@/data/songs";

import Sidebar from "@/components/Sidebar";
import MusicPlayer from "@/components/MusicPlayer";
import PlaylistModal from "@/components/PlaylistModal";
import PlaylistView from "@/components/PlaylistView";

import { usePlaylist } from "@/hooks/usePlaylist";

import { Plus } from "lucide-react";

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [recentlyPlayed, setRecentlyPlayed] =
  useState<string[]>([]);
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");

  const [selectedSong, setSelectedSong] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [selectedPlaylist, setSelectedPlaylist] =
    useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] =
  useState<string | null>(null);

  const [newPlaylistName, setNewPlaylistName] =
  useState("");

  const {
  playlists,
  createPlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  renamePlaylist,
  deletePlaylist,
} = usePlaylist();

  const currentSong = songs[currentIndex];
  useEffect(() => {
  const song = songs[currentIndex];

  if (!song) return;

  setRecentlyPlayed((prev) => {
    if (prev[0] === song.title) {
      return prev;
    }

    return [
      song.title,
      ...prev.filter(
        (title) => title !== song.title
      ),
    ].slice(0, 3);
  });
}, [currentIndex]);
  const recentlyPlayedSongs = recentlyPlayed
  .map((title) =>
    songs.find((song) => song.title === title)
  )
  .filter(Boolean);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const term = search.toLowerCase();

      return (
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term)
      );
    });
  }, [search]);

  const playSong = (title: string) => {
  const index = songs.findIndex(
    (song) => song.title === title
  );

  if (index !== -1) {
    setCurrentIndex(index);
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
          totalSongs={songs.length}
        />

        <section
  className="relative z-[100] flex-1 overflow-y-auto p-4 md:p-6 pb-44 pt-32 md:pt-6 md:ml-72"
>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              {activeTab === "home" && "Home"}
              {activeTab === "search" && "Search"}
              {activeTab === "library" && "Library"}
            </h2>

            {activeTab === "search" && (
              <div className="w-full md:w-96">
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search song or artist..."
                  className="glass w-full px-5 py-4 rounded-2xl outline-none"
                />
              </div>
            )}
          </div>

          {activeTab === "home" && (
            <>
              <h3 className="text-2xl font-bold mb-4">
                Recently Played
              </h3>

              <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-10">
  {recentlyPlayedSongs.slice(0, 3).map((song) => (
    <div
      key={song!.title}
      onClick={() => playSong(song!.title)}
      className="glass rounded-3xl p-4 cursor-pointer"
    >
      <img
        src={song!.cover}
        alt={song!.title}
        className="w-full aspect-square object-cover rounded-2xl"
      />

      <h3 className="mt-3">
        {song!.title}
      </h3>

      <p className="text-gray-400 text-sm">
        {song!.artist}
      </p>
    </div>
  ))}
</div>

              <h3 className="text-2xl font-bold mb-4">
                Recommended
              </h3>
            </>
          )}

{activeTab === "library" ? (
  selectedPlaylist &&
  playlists.find(
    (p) => p.id === selectedPlaylist
  ) ? (
    <PlaylistView
      playlist={
        playlists.find(
          (p) => p.id === selectedPlaylist
        )!
      }
      songs={songs}
      onBack={() =>
        setSelectedPlaylist(null)
      }
      onPlaySong={playSong}
    />
  ) : (
    <div>
      <h3 className="text-2xl font-bold mb-5">
        Your Playlists
      </h3>

      <div className="grid gap-4">
        {playlists.length === 0 && (
          <div className="glass rounded-2xl p-5">
            No playlists yet.
          </div>
        )}

        {playlists.map((playlist) => (
  <div
    key={playlist.id}
    className="playlist-card"
  >
    <div className="flex gap-4">
      <img
        src={
          playlist.cover ||
          "/images/default_playlist.jpg"
        }
        alt={playlist.name}
        className="w-24 h-24 rounded-2xl object-cover"
      />

      <div className="flex-1">
        <h3 className="text-xl font-bold">
          {playlist.name}
        </h3>

        <p className="text-gray-400 text-sm">
          {playlist.songs.length} songs
        </p>

        <p className="text-gray-500 text-xs mt-1">
          Created{" "}
          {new Date(
            playlist.createdAt
          ).toLocaleDateString()}
        </p>
      </div>
    </div>

    {/* ACTION BUTTONS */}

    <div className="flex flex-wrap gap-2 mt-4">
      <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedPlaylist(playlist.id);
  }}
  className="playlist-btn"
>
  Open
</button>

      <button
  type="button"
  onClick={() => {
    setEditingPlaylist(playlist.id);
    setNewPlaylistName(playlist.name);
  }}
  className="playlist-btn"
>
  Rename
</button>

      <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      window.confirm(
        `Delete "${playlist.name}"?`
      )
    ) {
      deletePlaylist(playlist.id);
    }
  }}
  className="playlist-btn-delete"
>
  Delete
</button>
    </div>
{editingPlaylist === playlist.id && (
  <div className="mt-4 flex gap-2">
    <input
      type="text"
      value={newPlaylistName}
      onChange={(e) =>
        setNewPlaylistName(e.target.value)
      }
      placeholder="New playlist name"
      className="glass flex-1 px-4 py-2 rounded-xl outline-none"
    />

    <button
      type="button"
      onClick={() => {
        if (!newPlaylistName.trim()) return;

        renamePlaylist(
          playlist.id,
          newPlaylistName.trim()
        );

        setEditingPlaylist(null);
      }}
      className="playlist-btn"
    >
      Save
    </button>

    <button
      type="button"
      onClick={() => {
        setEditingPlaylist(null);
      }}
      className="playlist-btn-delete"
    >
      Cancel
    </button>
  </div>
)}
    {/* SONGS */}

    <div className="mt-4 space-y-2">
      {playlist.songs.map(
        (songTitle) => (
          <div
            key={songTitle}
            className="playlist-song"
          >
            <span>
              {songTitle}
            </span>

            <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    removeSongFromPlaylist(
      playlist.id,
      songTitle
    );
  }}
  className="playlist-remove-btn"
>
  Remove
</button>
          </div>
        )
      )}
    </div>
  </div>
))}
      </div>
    </div>
  )
) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredSongs.map((song) => (
                <motion.div
                  key={song.title}
                  whileHover={{
                    scale: 1.03,
                    y: -6,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={() =>
                    playSong(song.title)
                  }
                  className="glass rounded-2xl p-2 md:p-3 cursor-pointer relative"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      setSelectedSong(
                        song.title
                      );

                      setShowModal(true);
                    }}
                    className="song-add-btn"
                  >
                    <Plus size={18} />
                  </button>

                  <img
                    src={song.cover}
                    alt={song.title}
                    className="w-full aspect-square object-cover rounded-2xl"
                  />

                  <h3 className="mt-2 text-sm md:text-base font-semibold truncate">
                    {song.title}
                  </h3>

                  <p className="text-gray-400 text-sm mt-1">
                    {song.artist}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <PlaylistModal
          songTitle={selectedSong}
          playlists={playlists}
          onClose={() =>
            setShowModal(false)
          }
          onCreate={createPlaylist}
          onAdd={addSongToPlaylist}
        />
      )}

      <MusicPlayer
        songs={songs}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        currentSong={currentSong}
      />
    </>
  );
}
