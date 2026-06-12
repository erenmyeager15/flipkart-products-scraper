export interface ActorInput {
    searchQueries?: string[];
    maxResults?: number;
    sortBy?: 'relevance' | 'popularity' | 'price_asc' | 'price_desc' | 'recency_desc';
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        apifyProxyGroups?: string[];
        apifyProxyCountry?: string;
        proxyUrls?: string[];
    };
}

export interface ProductRecord {
    source: 'flipkart';
    searchQuery: string;
    position: number;
    productId: string | null;
    title: string | null;
    price: number | null;
    priceDisplay: string | null;
    originalPrice: number | null;
    originalPriceDisplay: string | null;
    discountPercent: number | null;
    rating: number | null;
    ratingCount: number | null;
    reviewCount: number | null;
    specifications: string[];
    imageUrl: string | null;
    productUrl: string | null;
    scrapedAt: string;
}
