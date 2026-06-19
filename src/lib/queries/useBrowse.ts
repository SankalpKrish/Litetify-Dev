import { useQuery } from '@tanstack/react-query';
import {
  apiGetNewReleases,
  apiGetFeaturedPlaylists,
  apiGetRecommendations,
  apiGetCategories,
} from '../api';

export const browseKeys = {
  newReleases: (limit?: number, offset?: number) =>
    ['browse', 'newReleases', limit, offset] as const,
  featured: (limit?: number, offset?: number) =>
    ['browse', 'featured', limit, offset] as const,
  recommendations: (seeds?: string) =>
    ['browse', 'recommendations', seeds] as const,
  categories: ['browse', 'categories'] as const,
};

export function useNewReleases(limit?: number, offset?: number) {
  return useQuery({
    queryKey: browseKeys.newReleases(limit, offset),
    queryFn: () => apiGetNewReleases(limit, offset),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useFeaturedPlaylists(limit?: number, offset?: number) {
  return useQuery({
    queryKey: browseKeys.featured(limit, offset),
    queryFn: () => apiGetFeaturedPlaylists(limit, offset),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useRecommendations(
  seedArtists?: string,
  seedTracks?: string,
  seedGenres?: string,
  limit?: number,
) {
  const seedKey = [seedArtists, seedTracks, seedGenres].filter(Boolean).join(',');
  return useQuery({
    queryKey: [...browseKeys.recommendations(seedKey), limit],
    queryFn: () =>
      apiGetRecommendations(seedArtists, seedTracks, seedGenres, limit),
    staleTime: 60 * 1000,
    retry: 2,
    enabled: seedKey.length > 0,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: browseKeys.categories,
    queryFn: apiGetCategories,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}
