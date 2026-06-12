// types/artist.ts
export type Artist = {
  id: string;
  name: string;
  cover_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtistWithSongs = Artist & {
  songs: any[];
};