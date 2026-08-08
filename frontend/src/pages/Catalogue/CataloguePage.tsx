import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, Film, PackageOpen, Search } from 'lucide-react';
import Page from '../Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    normalizeTitle,
    useCatalogueSearch,
    useJellyfinLibraryTitles,
} from '@/hooks/api/useCatalogue';
import type { CatalogueMediaSummary } from '@/api/catalogue';

const GRID_COLS = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 400;

const CatalogueCard = ({
    item,
    inLibrary,
}: {
    item: CatalogueMediaSummary;
    inLibrary: boolean;
}) => (
    <Link
        to={`/catalogue/${encodeURIComponent(item.id)}`}
        className="group flex flex-col gap-2"
        title={item.title}
    >
        <div className="relative w-full aspect-2/3 overflow-hidden rounded-md bg-muted">
            {item.posterUrl ? (
                <img
                    src={item.posterUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Film className="h-8 w-8" />
                </div>
            )}
            {inLibrary && (
                <Badge className="absolute left-2 top-2 bg-emerald-600 text-white border-transparent">
                    <Check className="h-3 w-3" />
                    In library
                </Badge>
            )}
        </div>
        <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{item.title}</span>
            {item.year ? <span className="text-xs text-muted-foreground">{item.year}</span> : null}
        </div>
    </Link>
);

const CataloguePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';
    const [search, setSearch] = useState(initialQuery);
    const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        if (search === debouncedSearch) return;

        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setVisibleCount(PAGE_SIZE);
            const next = new URLSearchParams();
            if (search) next.set('q', search);
            setSearchParams(next, { replace: true });
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(handler);
    }, [search, debouncedSearch, setSearchParams]);

    const { data, isLoading, isError } = useCatalogueSearch(debouncedSearch);
    const { data: libraryTitles } = useJellyfinLibraryTitles();

    const items = data?.items ?? [];
    const visibleItems = items.slice(0, visibleCount);
    const hasMore = items.length > visibleCount;

    return (
        <Page title="Catalogue" pagePadding requiresAuth>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h1 className="text-2xl font-bold">Catalogue</h1>
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search movies and series..."
                        className="sm:w-72"
                    />
                </div>

                {!debouncedSearch ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Search />
                            </EmptyMedia>
                            <EmptyTitle>Search the catalogue</EmptyTitle>
                            <EmptyDescription>
                                Type a movie or series name to browse available releases.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : isLoading ? (
                    <div className={`w-full gap-4 grid ${GRID_COLS}`}>
                        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                            <Skeleton key={i} className="w-full aspect-2/3 rounded-md" />
                        ))}
                    </div>
                ) : isError ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <PackageOpen />
                            </EmptyMedia>
                            <EmptyTitle>Catalogue unavailable</EmptyTitle>
                            <EmptyDescription>
                                The catalogue service could not be reached. Try again later.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : visibleItems.length > 0 ? (
                    <>
                        <div className={`w-full gap-4 grid ${GRID_COLS}`}>
                            {visibleItems.map((item) => (
                                <CatalogueCard
                                    key={item.id}
                                    item={item}
                                    inLibrary={
                                        libraryTitles?.has(normalizeTitle(item.title)) ?? false
                                    }
                                />
                            ))}
                        </div>
                        {hasMore && (
                            <div className="flex justify-center">
                                <Button
                                    variant="secondary"
                                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                >
                                    Load more
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <PackageOpen />
                            </EmptyMedia>
                            <EmptyTitle>No results</EmptyTitle>
                            <EmptyDescription>
                                Nothing found for &quot;{debouncedSearch}&quot;.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </Page>
    );
};

export default CataloguePage;
