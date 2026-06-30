import { Actor, log } from 'apify';
import { ProxyAgent } from 'undici';
import type { ActorInput, ProductRecord } from './types.js';
import { normalizeInput } from './input.js';
import { parseSearchResults } from './routes.js';

await Actor.init();

const input = ((await Actor.getInput<ActorInput>()) ?? {}) as ActorInput;
const {
    searchQueries: queries,
    maxResults,
    sortBy,
    proxyConfiguration: proxyInput,
} = normalizeInput(input);

const proxyConfiguration = (proxyInput?.useApifyProxy || proxyInput?.proxyUrls?.length)
    ? await Actor.createProxyConfiguration(proxyInput)
    : undefined;

const headers: Record<string, string> = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

function buildSearchUrl(query: string, page: number): string {
    const url = new URL('https://www.flipkart.com/search');
    url.searchParams.set('q', query);
    if (page > 1) url.searchParams.set('page', String(page));
    if (sortBy !== 'relevance') url.searchParams.set('sort', sortBy);
    return url.toString();
}

async function fetchHtml(url: string): Promise<string | null> {
    for (let attempt = 0; attempt < 4; attempt++) {
        let dispatcher: ProxyAgent | undefined;
        if (proxyConfiguration) {
            const proxyUrl = await proxyConfiguration.newUrl();
            if (proxyUrl) dispatcher = new ProxyAgent(proxyUrl);
        }
        try {
            const res = await fetch(url, { headers, ...(dispatcher ? { dispatcher } : {}) } as any);
            if (res.status === 429 || res.status === 403 || res.status === 529) {
                log.warning(`Blocked/rate-limited with HTTP ${res.status}: ${url}`);
                await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
                continue;
            }
            if (!res.ok) {
                log.warning(`HTTP ${res.status}: ${url}`);
                return null;
            }
            return await res.text();
        } catch (error) {
            log.warning(`Request failed for ${url}: ${(error as Error).message}`);
        }
    }
    return null;
}

let saved = 0;
let spendingLimitReached = false;
let failedPages = 0;
let emptyPages = 0;
const globalSeen = new Set<string>();

async function pushProducts(products: ProductRecord[]): Promise<void> {
    for (const product of products) {
        if (saved >= maxResults || spendingLimitReached) return;
        const key = product.productId ?? product.productUrl ?? product.title ?? '';
        if (globalSeen.has(key)) continue;

        // Push and charge atomically so unpaid records are never written and
        // billing failures stop the run instead of being silently ignored.
        const chargeResult = await Actor.pushData(product, 'product-scraped');
        const recordWasSaved = chargeResult.chargedCount > 0 || !chargeResult.eventChargeLimitReached;
        if (recordWasSaved) {
            globalSeen.add(key);
            saved += 1;
        }

        if (chargeResult.eventChargeLimitReached) {
            spendingLimitReached = true;
            await Actor.setStatusMessage(`Stopped at the user's spending limit after ${saved} products`);
            log.warning('User spending limit reached; stopping before more Flipkart requests.');
            return;
        }
    }
}

for (const query of queries) {
    if (spendingLimitReached) break;

    let page = 1;
    let position = 1;
    while (saved < maxResults && page <= 25 && !spendingLimitReached) {
        const url = buildSearchUrl(query, page);
        log.info(`Fetching Flipkart search: ${query}, page ${page}`);
        const html = await fetchHtml(url);
        if (!html) {
            failedPages += 1;
            break;
        }
        const products = parseSearchResults(html, query, position);
        if (products.length === 0) {
            emptyPages += 1;
            log.warning(`No products parsed for ${query} page ${page}. Flipkart layout may have changed or blocked this request.`);
            break;
        }
        await pushProducts(products);

        if (spendingLimitReached) break;

        log.info(`Parsed ${products.length} product(s) from ${query} page ${page}; saved ${saved}/${maxResults}.`);
        position += products.length;
        page++;
        await new Promise((r) => setTimeout(r, 600 + Math.floor(Math.random() * 900)));
    }
}

if (!spendingLimitReached && saved === 0) {
    throw new Error(
        `No Flipkart products were saved (${failedPages} failed page(s), ${emptyPages} empty page(s)). `
        + 'The source may have blocked the request, changed layout, or returned no matching products.',
    );
}

if (!spendingLimitReached) {
    await Actor.setStatusMessage(`Finished with ${saved} unique Flipkart products`);
}
log.info(`Flipkart scrape finished. ${saved} products saved.`);
await Actor.exit();
