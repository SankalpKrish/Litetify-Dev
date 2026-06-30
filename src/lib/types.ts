export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface Followers {
  total: number;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  product: string | null;
  country: string | null;
  images: SpotifyImage[];
  followers: Followers | null;
}

export interface SpotifyOwner {
  id: string;
  display_name: string | null;
}

export interface PlaylistTracksRef {
  total: number;
  href: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  owner: SpotifyOwner;
  images: SpotifyImage[];
  tracks: PlaylistTracksRef;
  type_: string;
}

export interface SpotifyPlaylists {
  items: SpotifyPlaylist[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface SpotifyArtistBrief {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbumBrief {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
  release_date: string | null;
}

export interface SpotifyTrack {
  id: string | null;
  name: string;
  uri: string;
  duration_ms: number;
  artists: SpotifyArtistBrief[];
  album: SpotifyAlbumBrief | null;
  disc_number: number | null;
  track_number: number | null;
  explicit: boolean | null;
  type_: string;
}

export interface PlaylistTrackItem {
  added_at: string | null;
  track: SpotifyTrack | null;
}

export interface PlaylistTracks {
  items: PlaylistTrackItem[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface PlaylistDetailTracks {
  items: PlaylistTrackItem[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface PlaylistDetail {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: SpotifyOwner;
  public: boolean | null;
  followers: Followers | null;
  tracks: PlaylistDetailTracks;
  type_: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtistBrief[];
  images: SpotifyImage[];
  tracks: AlbumTracks;
  uri: string;
  release_date: string | null;
  total_tracks: number;
  label: string | null;
  popularity: number | null;
  genres: string[];
  type_: string;
}

export interface AlbumTracks {
  items: SpotifyTrack[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  popularity: number | null;
  followers: Followers | null;
  uri: string;
  type_: string;
}

export interface ArtistAlbums {
  items: SpotifyAlbumBrief[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface LikedTrackItem {
  added_at: string;
  track: SpotifyTrack;
}

export interface LikedTracks {
  items: LikedTrackItem[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface SearchTracks {
  items: SpotifyTrack[];
  total: number;
}

export interface SearchArtists {
  items: SpotifyArtist[];
  total: number;
}

export interface SearchAlbums {
  items: SpotifyAlbum[];
  total: number;
}

export interface SearchPlaylists {
  items: SpotifyPlaylist[];
  total: number;
}

export interface SearchResult {
  tracks: SearchTracks | null;
  artists: SearchArtists | null;
  albums: SearchAlbums | null;
  playlists: SearchPlaylists | null;
}

export interface PaginatedAlbums {
  items: SpotifyAlbum[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface NewReleases {
  albums: PaginatedAlbums;
}

export interface Recommendations {
  tracks: SpotifyTrack[];
}

export interface FeaturedPlaylists {
  playlists: SpotifyPlaylists;
}

export interface Category {
  id: string;
  name: string;
}

export interface CategoriesList {
  categories: { items: Category[] };
}

export interface ArtistTopTracks {
  tracks: SpotifyTrack[];
}

export interface ArtistRelatedArtists {
  artists: SpotifyArtist[];
}

export interface Device {
  id: string;
  name: string;
  is_active: boolean;
  volume_percent: number | null;
}

export interface CurrentlyPlaying {
  item: SpotifyTrack | null;
  is_playing: boolean;
  progress_ms: number | null;
  device: Device | null;
}

export type SearchType = 'track' | 'artist' | 'album' | 'playlist';

export interface TopArtists {
  items: SpotifyArtist[];
  total: number;
}

export interface TopTracks {
  items: SpotifyTrack[];
  total: number;
}

export interface PlayHistory {
  track: SpotifyTrack;
  played_at: string;
}

export interface RecentlyPlayed {
  items: PlayHistory[];
}

export interface SpotifyShowPage {
  items: SpotifyShow[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}

export interface SpotifyShow {
  id: string;
  name: string;
  description: string;
  publisher: string;
  images: SpotifyImage[];
  total_episodes: number;
  explicit: boolean;
  type_: string;
}

export interface ShowEpisode {
  id: string;
  name: string;
  description: string | null;
  duration_ms: number;
  explicit: boolean;
  release_date: string;
  images: SpotifyImage[];
  uri: string;
  type_: string;
}

export interface ShowEpisodesPage {
  items: ShowEpisode[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
}
