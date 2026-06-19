import { invoke } from '@tauri-apps/api/core';
import type {
  SpotifyUserProfile,
  SpotifyPlaylists,
  PlaylistDetail,
  PlaylistTracks,
  LikedTracks,
  SpotifyAlbum,
  SpotifyArtist,
  ArtistTopTracks,
  ArtistAlbums,
  ArtistRelatedArtists,
  SearchResult,
  NewReleases,
  FeaturedPlaylists,
  Recommendations,
  CategoriesList,
  CurrentlyPlaying,
  Device,
  SearchType,
} from './types';
import { getStoredClientId } from '../features/auth/authStore';

function clientId(): string {
  const id = getStoredClientId();
  if (!id) throw new Error('Client ID not configured');
  return id;
}

export async function apiGetMe(): Promise<SpotifyUserProfile> {
  return invoke<SpotifyUserProfile>('api_get_me', { clientId: clientId() });
}

export async function apiGetPlaylists(
  limit?: number,
  offset?: number,
): Promise<SpotifyPlaylists> {
  return invoke<SpotifyPlaylists>('api_get_playlists', {
    clientId: clientId(),
    limit,
    offset,
  });
}

export async function apiGetPlaylist(
  playlistId: string,
  fields?: string,
): Promise<PlaylistDetail> {
  return invoke<PlaylistDetail>('api_get_playlist', {
    clientId: clientId(),
    playlistId,
    fields,
  });
}

export async function apiGetPlaylistTracks(
  playlistId: string,
  limit?: number,
  offset?: number,
): Promise<PlaylistTracks> {
  return invoke<PlaylistTracks>('api_get_playlist_tracks', {
    clientId: clientId(),
    playlistId,
    limit,
    offset,
  });
}

export async function apiGetLikedTracks(
  limit?: number,
  offset?: number,
): Promise<LikedTracks> {
  return invoke<LikedTracks>('api_get_liked_tracks', {
    clientId: clientId(),
    limit,
    offset,
  });
}

export async function apiGetAlbum(albumId: string): Promise<SpotifyAlbum> {
  return invoke<SpotifyAlbum>('api_get_album', {
    clientId: clientId(),
    albumId,
  });
}

export async function apiGetArtist(artistId: string): Promise<SpotifyArtist> {
  return invoke<SpotifyArtist>('api_get_artist', {
    clientId: clientId(),
    artistId,
  });
}

export async function apiGetArtistTopTracks(
  artistId: string,
  market?: string,
): Promise<ArtistTopTracks> {
  return invoke<ArtistTopTracks>('api_get_artist_top_tracks', {
    clientId: clientId(),
    artistId,
    market,
  });
}

export async function apiGetArtistAlbums(
  artistId: string,
  limit?: number,
  offset?: number,
): Promise<ArtistAlbums> {
  return invoke<ArtistAlbums>('api_get_artist_albums', {
    clientId: clientId(),
    artistId,
    limit,
    offset,
  });
}

export async function apiGetRelatedArtists(
  artistId: string,
): Promise<ArtistRelatedArtists> {
  return invoke<ArtistRelatedArtists>('api_get_related_artists', {
    clientId: clientId(),
    artistId,
  });
}

export async function apiSearch(
  query: string,
  types: SearchType[],
  limit?: number,
  offset?: number,
): Promise<SearchResult> {
  return invoke<SearchResult>('api_search', {
    clientId: clientId(),
    query,
    types: types.join(','),
    limit,
    offset,
  });
}

export async function apiGetNewReleases(
  limit?: number,
  offset?: number,
): Promise<NewReleases> {
  return invoke<NewReleases>('api_get_new_releases', {
    clientId: clientId(),
    limit,
    offset,
  });
}

export async function apiGetFeaturedPlaylists(
  limit?: number,
  offset?: number,
): Promise<FeaturedPlaylists> {
  return invoke<FeaturedPlaylists>('api_get_featured_playlists', {
    clientId: clientId(),
    limit,
    offset,
  });
}

export async function apiGetRecommendations(
  seedArtists?: string,
  seedTracks?: string,
  seedGenres?: string,
  limit?: number,
): Promise<Recommendations> {
  return invoke<Recommendations>('api_get_recommendations', {
    clientId: clientId(),
    seedArtists,
    seedTracks,
    seedGenres,
    limit,
  });
}

export async function apiGetCategories(): Promise<CategoriesList> {
  return invoke<CategoriesList>('api_get_categories', {
    clientId: clientId(),
  });
}

export async function apiGetCurrentlyPlaying(): Promise<CurrentlyPlaying> {
  return invoke<CurrentlyPlaying>('api_get_currently_playing', {
    clientId: clientId(),
  });
}

export async function apiTransferPlayback(
  deviceIds: string[],
  play?: boolean,
): Promise<void> {
  return invoke('api_transfer_playback', {
    clientId: clientId(),
    deviceIds,
    play,
  });
}

export async function apiGetAvailableDevices(): Promise<Device[]> {
  return invoke<Device[]>('api_get_available_devices', {
    clientId: clientId(),
  });
}

export async function apiPlay(
  deviceId: string,
  uri?: string,
  uris?: string[],
  contextUri?: string,
): Promise<void> {
  return invoke('api_play', {
    clientId: clientId(),
    deviceId,
    uri,
    uris,
    contextUri,
  });
}

export async function apiPause(deviceId: string): Promise<void> {
  return invoke('api_pause', {
    clientId: clientId(),
    deviceId,
  });
}
