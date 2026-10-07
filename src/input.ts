import type { ActorInput } from './types.js';

const DEFAULT_SEARCH_QUERIES = ['iphone'];
const DEFAULT_PROXY_CONFIGURATION = {
    useApifyProxy: false,
};

const SORT_OPTIONS = ['relevance', 'popularity', 'price_asc', 'price_desc', 'recency_desc'] as const;

type SortBy = typeof SORT_OPTIONS[number];

const fail = (message: string, field?: string): never => {
    throw new Error(field ? `Field "${field}": ${message}` : message);
};

const asStringArray = (value: unknown, fieldName: string, defaultValue: string[]): string[] => {
    if (value === undefined || value === null) return [...defaultValue];
    if (!Array.isArray(value)) fail('must be an array of strings.', fieldName);

    const rawItems = value as unknown[];
    const items = rawItems.map((item) => {
        if (typeof item !== 'string') {
            fail('all items must be strings.', fieldName);
        }
        const trimmed = (item as string).trim();
        if (!trimmed) fail('items must not be empty.', fieldName);
        return trimmed;
    });

    if (items.length < 1) fail('must contain at least 1 item.', fieldName);
    if (items.length > 5) fail('must contain at most 5 items.', fieldName);
    return [...new Set(items)];
};

const asIntInRange = (value: unknown, fieldName: string, defaultValue: number, min: number, max: number): number => {
    if (value === undefined || value === null || value === '') return defaultValue;
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (!Number.isInteger(parsed)) fail('must be an integer.', fieldName);
    const numberValue = parsed as number;
    if (numberValue < min || numberValue > max) fail(`must be between ${min} and ${max}.`, fieldName);
    return numberValue;
};

const asSortBy = (value: unknown): SortBy => {
    if (value === undefined || value === null || value === '') return 'relevance';
    if (typeof value !== 'string') fail('must be a string.', 'sortBy');
    if (!SORT_OPTIONS.includes(value as SortBy)) {
        fail(`must be one of: ${SORT_OPTIONS.join(', ')}.`, 'sortBy');
    }
    return value as SortBy;
};

const asProxyConfiguration = (value: unknown): ActorInput['proxyConfiguration'] => {
    if (value === undefined || value === null || value === '') return { ...DEFAULT_PROXY_CONFIGURATION };
    if (typeof value !== 'object' || Array.isArray(value)) fail('must be a proxy configuration object.', 'proxyConfiguration');
    return value as ActorInput['proxyConfiguration'];
};

export function normalizeInput(raw: ActorInput = {}): Required<Pick<ActorInput, 'searchQueries' | 'maxResults' | 'maxPagesPerQuery' | 'sortBy'>> & {
    proxyConfiguration?: ActorInput['proxyConfiguration'];
} {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Input must be a JSON object.');

    return {
        searchQueries: asStringArray(raw.searchQueries, 'searchQueries', DEFAULT_SEARCH_QUERIES),
        maxResults: asIntInRange(raw.maxResults, 'maxResults', 1, 1, 500),
        maxPagesPerQuery: asIntInRange(raw.maxPagesPerQuery, 'maxPagesPerQuery', 4, 1, 25),
        sortBy: asSortBy(raw.sortBy),
        proxyConfiguration: asProxyConfiguration(raw.proxyConfiguration),
    };
}
