import { useQuery } from '@tanstack/react-query';
import { apiGetArtist, apiGetArtistTopTracks, apiGetArtistAlbums, apiGetRelatedArtists } from '../api';

export const artistKeys = {
  detail: (id: string) => ['artist', id] as const,
  topTracks: (id: string) => ['artist', id, 'topTracks'] as const,
  albums: (id: string) => ['artist', id, 'albums'] as const,
  related: (id: string) => ['artist', id, 'related'] as const,
};

export function useArtist(id: string) {
  return useQuery({
    queryKey: artistKeys.detail(id),
    queryFn: () => apiGetArtist(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

export function useArtistTopTracks(id: string, market?: string) {
  return useQuery({
    queryKey: artistKeys.topTracks(id),
    queryFn: () => apiGetArtistTopTracks(id, market),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

export function useArtistAlbums(id: string, limit?: number, offset?: number) {
  return useQuery({
    queryKey: [...artistKeys.albums(id), limit, offset],
    queryFn: () => apiGetArtistAlbums(id, limit, offset),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

export function useRelatedArtists(id: string) {
  return useQuery({
    queryKey: artistKeys.related(id),
    queryFn: () => apiGetRelatedArtists(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}
