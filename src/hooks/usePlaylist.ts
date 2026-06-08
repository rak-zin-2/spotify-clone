"use client";

import { useEffect, useState } from "react";
import { Playlist } from "@/types/playlist";
import { songs } from "@/data/songs";

export function usePlaylist() {
  const [playlists, setPlaylists] =
    useState<Playlist[]>([]);

  useEffect(() => {
    const saved =
      localStorage.getItem("playlists");

    if (saved) {
      setPlaylists(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "playlists",
      JSON.stringify(playlists)
    );
  }, [playlists]);

  const createPlaylist = (
    name: string
  ) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      songs: [],
      cover: "",
      createdAt:
        new Date().toISOString(),
    };

    setPlaylists((prev) => [
      ...prev,
      newPlaylist,
    ]);
  };

  const addSongToPlaylist = (
    playlistId: string,
    songTitle: string
  ) => {
    setPlaylists((prev) =>
      prev.map((playlist) => {
        if (
          playlist.id !== playlistId
        )
          return playlist;

        if (
          playlist.songs.includes(
            songTitle
          )
        ) {
          return playlist;
        }

        const song =
          songs.find(
            (s) =>
              s.title === songTitle
          );

        return {
          ...playlist,
          songs: [
            ...playlist.songs,
            songTitle,
          ],
          cover:
            playlist.cover ||
            song?.cover ||
            "",
        };
      })
    );
  };

  const removeSongFromPlaylist = (
    playlistId: string,
    songTitle: string
  ) => {
    setPlaylists((prev) =>
      prev.map((playlist) => {
        if (
          playlist.id !== playlistId
        )
          return playlist;

        const updatedSongs =
          playlist.songs.filter(
            (song) =>
              song !== songTitle
          );

        let cover =
          playlist.cover;

        if (
          updatedSongs.length === 0
        ) {
          cover = "";
        }

        return {
          ...playlist,
          songs: updatedSongs,
          cover,
        };
      })
    );
  };

  const renamePlaylist = (
    playlistId: string,
    newName: string
  ) => {
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              name: newName,
            }
          : playlist
      )
    );
  };

  const deletePlaylist = (
    playlistId: string
  ) => {
    setPlaylists((prev) =>
      prev.filter(
        (playlist) =>
          playlist.id !== playlistId
      )
    );
  };

  return {
    playlists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    renamePlaylist,
    deletePlaylist,
  };
}