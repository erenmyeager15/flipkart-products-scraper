import type { ProductRecord } from './types.js';
import { normalizeInput } from './input.js';
import { parseSearchResults } from './routes.js';
import { classifyPage, FetchFailure } from './http.js';

export interface Coverage { query: string; pages: number; saved: number; reason: string }
export async function collect(input: ReturnType<typeof normalizeInput>, deps: {
    fetch: (url: string, timeoutMs: number) => Promise<string>;
    push: (row: ProductRecord) => Promise<{ chargedCount: number; eventChargeLimitReached: boolean }>;
    canCharge: () => boolean;
    now?: () => number;
}) {
    const now = deps.now ?? Date.now;
    const deadline = now() + 210000;
    const coverage: Coverage[] = [];
    const seen = new Set<string>();
    let saved = 0, failedPages = 0, unpricedSkipped = 0, spendingLimitReached = false;
    for (const query of input.searchQueries) {
        if (saved >= input.maxResults || spendingLimitReached) break;
        const item: Coverage = { query, pages: 0, saved: 0, reason: 'page_cap' };
        let position = 1;
        coverage.push(item);
        for (let page = 1; page <= input.maxPagesPerQuery; page++) {
            if (!deps.canCharge()) { spendingLimitReached = true; item.reason = 'spending_limit'; break; }
            if (now() >= deadline) { item.reason = 'time_budget'; break; }
            const url = new URL('https://www.flipkart.com/search');
            url.searchParams.set('q', query);
            if (page > 1) url.searchParams.set('page', String(page));
            if (input.sortBy !== 'relevance') url.searchParams.set('sort', input.sortBy);
            let html: string;
            try { html = await deps.fetch(url.toString(), Math.min(20000, deadline - now())); }
            catch (error) {
                failedPages++;
                item.reason = error instanceof FetchFailure ? error.code : 'REQUEST_FAILED';
                break;
            }
            item.pages++;
            const products = parseSearchResults(html, query, position);
            position += products.length;
            if (!products.length) {
                item.reason = classifyPage(html) === 'empty' ? 'no_results' : 'unrecognized_page';
                if (item.reason === 'unrecognized_page') failedPages++;
                break;
            }
            let fresh = 0;
            for (const product of products) {
                if (seen.has(product.productId!)) continue;
                if (!product.price || product.price <= 0) { unpricedSkipped++; continue; }
                const charge = await deps.push(product);
                if (charge.chargedCount > 0 || !charge.eventChargeLimitReached) {
                    seen.add(product.productId!); saved++; fresh++; item.saved++;
                }
                if (charge.eventChargeLimitReached) { spendingLimitReached = true; item.reason = 'spending_limit'; break; }
                if (saved >= input.maxResults) { item.reason = 'max_results'; break; }
            }
            if (spendingLimitReached || saved >= input.maxResults) break;
            if (!fresh) { item.reason = 'no_new_priced_products'; break; }
        }
        if (now() >= deadline || item.reason === 'PROXY_AUTH_OR_COUNTRY_UNAVAILABLE') break;
    }
    const incomplete = coverage.some(c => !['max_results', 'no_results'].includes(c.reason));
    return { status: spendingLimitReached ? 'limited' : failedPages && !saved ? 'failed' : incomplete ? 'partial' : 'succeeded',
        results: saved, failedPages, unpricedSkipped, spendingLimitReached, coverage,
        note: 'Search listings only. Missing products are not inferred to be sold out. Unknown stock remains null.' };
}
