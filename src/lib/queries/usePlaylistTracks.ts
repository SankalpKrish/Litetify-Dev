import { useQuery } from '@tanstack/react-query';
import { apiGetPlaylistTracks } from '../api';
import { playlistKeys } from './usePlaylists';

export function usePlaylistTracks(
  playlistId: string,
  limit?: number,
  offset?: number,
) {
  return useQuery({
    queryKey: [...playlistKeys.tracks(playlistId), limit, offset],
    queryFn: () => apiGetPlaylistTracks(playlistId, limit, offset),
    staleTime: 30 * 1000,
    retry: 2,
    enabled: !!playlistId,
  });
}
