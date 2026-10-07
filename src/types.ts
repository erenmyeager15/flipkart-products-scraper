export interface ActorInput {
    searchQueries?: string[];
    maxResults?: number;
    maxPagesPerQuery?: number;
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
    title: string;
    brand: string;
    price: number | null;
    mrp: number | null;
    discountPercent: number | null;
    currency: string;
    packSize: string;
    category: string;
    rating: number | null;
    ratingCount: number | null;
    reviewCount: number | null;
    listingId: string | null;
    specifications: string[];
    priceEvidence: { displayedPrice: string | null; displayedMrp: string | null; warnings: string[] };
    inStock: boolean | null;
    productUrl: string | null;
    imageUrl: string | null;
    scrapedAt: string;
}
