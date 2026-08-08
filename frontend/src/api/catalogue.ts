import { getAccessToken } from '@/utils/localstorageCredentials';

export interface CatalogueTorrentVariant {
    id: string;
    quality?: string | null;
    language?: string | null;
    source?: string | null;
    size?: string | null;
    seeders?: number | null;
    leechers?: number | null;
    name?: string | null;
}

export interface CatalogueMediaSummary {
    id: string;
    title: string;
    year?: number | null;
    type?: 'movie' | 'series' | string | null;
    posterUrl?: string | null;
    rating?: number | null;
}

export interface CatalogueMediaDetail extends CatalogueMediaSummary {
    backdropUrl?: string | null;
    overview?: string | null;
    variants?: CatalogueTorrentVariant[];
}

export interface CatalogueSearchResponse {
    items: CatalogueMediaSummary[];
    totalCount?: number;
}

export type CatalogueDownloadState = 'pending' | 'downloading' | 'completed' | 'failed' | string;

export interface CatalogueDownloadStatus {
    mediaId: string;
    state: CatalogueDownloadState;
    progress?: number | null;
    torrentId?: string | null;
}

function authHeaders(): HeadersInit {
    const token = getAccessToken();
    return token ? { Authorization: token } : {};
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        ...init,
        headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    });

    if (!response.ok) {
        throw new Error(`Catalogue request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
}

export async function searchCatalogue(query: string): Promise<CatalogueSearchResponse> {
    return request<CatalogueSearchResponse>(`/api/catalogue/search?q=${encodeURIComponent(query)}`);
}

export async function getCatalogueMedia(id: string): Promise<CatalogueMediaDetail> {
    return request<CatalogueMediaDetail>(`/api/catalogue/media/${encodeURIComponent(id)}`);
}

export async function getDownloadStatus(mediaId: string): Promise<CatalogueDownloadStatus> {
    return request<CatalogueDownloadStatus>(`/api/catalogue/status/${encodeURIComponent(mediaId)}`);
}

export async function downloadTorrent(torrentId: string): Promise<void> {
    await request<unknown>(`/api/catalogue/download/${encodeURIComponent(torrentId)}`, {
        method: 'POST',
    });
}
