import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/api/getApi';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import {
    downloadTorrent,
    getCatalogueMedia,
    getDownloadStatus,
    searchCatalogue,
    type CatalogueDownloadStatus,
    type CatalogueMediaDetail,
    type CatalogueSearchResponse,
} from '@/api/catalogue';

const STATUS_POLL_INTERVAL_MS = 10_000;

export function useCatalogueSearch(query: string) {
    const trimmed = query.trim();

    return useQuery<CatalogueSearchResponse>({
        queryKey: ['catalogue', 'search', trimmed],
        queryFn: () => searchCatalogue(trimmed),
        enabled: trimmed.length > 0,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
}

export function useCatalogueMedia(id: string | undefined) {
    return useQuery<CatalogueMediaDetail>({
        queryKey: ['catalogue', 'media', id],
        queryFn: () => getCatalogueMedia(id!),
        enabled: Boolean(id),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
}

export function useCatalogueStatus(mediaId: string | undefined) {
    return useQuery<CatalogueDownloadStatus>({
        queryKey: ['catalogue', 'status', mediaId],
        queryFn: () => getDownloadStatus(mediaId!),
        enabled: Boolean(mediaId),
        refetchInterval: STATUS_POLL_INTERVAL_MS,
        retry: false,
    });
}

export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const LIBRARY_TITLES_LIMIT = 5000;

/**
 * Fetches the set of normalized Movie/Series titles present in the Jellyfin
 * library once, so catalogue cards can display an "in library" badge without
 * issuing one Jellyfin request per card.
 */
export function useJellyfinLibraryTitles() {
    return useQuery<Set<string>>({
        queryKey: ['catalogue', 'libraryTitles'],
        queryFn: async () => {
            const itemsApi = getItemsApi(getApi());
            const response = await itemsApi.getItems({
                recursive: true,
                includeItemTypes: ['Movie', 'Series'],
                enableImages: false,
                enableUserData: false,
                limit: LIBRARY_TITLES_LIMIT,
            });

            const titles = new Set<string>();
            for (const item of response.data.Items ?? []) {
                if (item.Name) titles.add(normalizeTitle(item.Name));
                if (item.OriginalTitle) titles.add(normalizeTitle(item.OriginalTitle));
            }
            return titles;
        },
        staleTime: 10 * 60 * 1000,
        retry: false,
    });
}

export function useDownloadTorrent(mediaId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (torrentId: string) => downloadTorrent(torrentId),
        onSuccess: () => {
            if (mediaId) {
                queryClient.invalidateQueries({ queryKey: ['catalogue', 'status', mediaId] });
            }
        },
    });
}
