import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Download, Film, Loader2, PackageOpen, Star } from 'lucide-react';
import { toast } from 'sonner';
import Page from '../Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    useCatalogueMedia,
    useCatalogueStatus,
    useDownloadTorrent,
} from '@/hooks/api/useCatalogue';
import type { CatalogueDownloadState, CatalogueTorrentVariant } from '@/api/catalogue';

const statusVariant = (
    state: CatalogueDownloadState | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (state) {
        case 'completed':
            return 'default';
        case 'downloading':
        case 'pending':
            return 'secondary';
        case 'failed':
            return 'destructive';
        default:
            return 'outline';
    }
};

const variantGroupKey = (variant: CatalogueTorrentVariant) =>
    [variant.quality || 'Unknown quality', variant.language || 'Unknown language']
        .filter(Boolean)
        .join(' · ');

const CatalogueDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { data: media, isLoading, isError } = useCatalogueMedia(id);
    const { data: status } = useCatalogueStatus(id);
    const download = useDownloadTorrent(id);

    const groupedVariants = useMemo(() => {
        const groups = new Map<string, CatalogueTorrentVariant[]>();
        for (const variant of media?.variants ?? []) {
            const key = variantGroupKey(variant);
            const existing = groups.get(key);
            if (existing) existing.push(variant);
            else groups.set(key, [variant]);
        }
        return Array.from(groups.entries());
    }, [media?.variants]);

    const handleDownload = (torrentId: string) => {
        download.mutate(torrentId, {
            onSuccess: () => toast.success('Download started'),
            onError: () => toast.error('Failed to start download'),
        });
    };

    if (isLoading) {
        return (
            <Page title="Catalogue" pagePadding requiresAuth>
                <div className="flex flex-col sm:flex-row gap-6">
                    <Skeleton className="w-40 sm:w-56 aspect-2/3 rounded-md shrink-0" />
                    <div className="flex flex-col gap-3 flex-1">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </Page>
        );
    }

    if (isError || !media) {
        return (
            <Page title="Catalogue" pagePadding requiresAuth>
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <PackageOpen />
                        </EmptyMedia>
                        <EmptyTitle>Media not found</EmptyTitle>
                        <EmptyDescription>
                            This catalogue entry could not be loaded.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Page>
        );
    }

    return (
        <Page
            title={`${media.title} · Catalogue`}
            pagePadding
            requiresAuth
            bgItem={
                media.backdropUrl ? (
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <img
                            src={media.backdropUrl}
                            alt=""
                            className="h-full w-full object-cover opacity-20"
                        />
                        <div className="absolute inset-0 bg-linear-to-b from-background/40 to-background" />
                    </div>
                ) : undefined
            }
        >
            <div className="flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-40 sm:w-56 aspect-2/3 shrink-0 overflow-hidden rounded-md bg-muted">
                        {media.posterUrl ? (
                            <img
                                src={media.posterUrl}
                                alt={media.title}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Film className="h-10 w-10" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <h1 className="text-3xl font-bold">{media.title}</h1>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {media.year ? <span>{media.year}</span> : null}
                            {media.type ? <Badge variant="outline">{media.type}</Badge> : null}
                            {media.rating ? (
                                <span className="inline-flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5" />
                                    {media.rating.toFixed(1)}
                                </span>
                            ) : null}
                            {status?.state ? (
                                <Badge variant={statusVariant(status.state)}>
                                    {status.state}
                                    {typeof status.progress === 'number'
                                        ? ` · ${Math.round(status.progress)}%`
                                        : ''}
                                </Badge>
                            ) : null}
                        </div>
                        {media.overview ? (
                            <p className="text-sm leading-relaxed max-w-3xl">{media.overview}</p>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold">Available releases</h2>

                    {groupedVariants.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <PackageOpen />
                                </EmptyMedia>
                                <EmptyTitle>No releases</EmptyTitle>
                                <EmptyDescription>
                                    No torrent variant is available for this title yet.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        groupedVariants.map(([group, variants]) => (
                            <div key={group} className="flex flex-col gap-2">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    {group}
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {variants.map((variant) => (
                                        <div
                                            key={variant.id}
                                            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border p-3"
                                        >
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="truncate text-sm font-medium">
                                                    {variant.name || variant.id}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {[
                                                        variant.source,
                                                        variant.size,
                                                        typeof variant.seeders === 'number'
                                                            ? `${variant.seeders} seeders`
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                            </div>
                                            <Button
                                                size="sm"
                                                disabled={download.isPending}
                                                onClick={() => handleDownload(variant.id)}
                                            >
                                                {download.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                                Download
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Page>
    );
};

export default CatalogueDetail;
