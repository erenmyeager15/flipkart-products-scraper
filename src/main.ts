import { Actor, log } from 'apify';
import { ProxyAgent } from 'undici';
import type { ActorInput, ProductRecord } from './types.js';
import { parseSearchResults } from './routes.js';

await Actor.init();

const input = ((await Actor.getInput<ActorInput>()) ?? {}) as ActorInput;
const {
    searchQueries = ['iphone'],
    maxResults = 10,
    sortBy = 'relevance',
    proxyConfiguration: proxyInput,
} = input;

const queries = searchQueries.map((q) => q.trim()).filter(Boolean);
if (queries.length === 0) {
    throw new Error('At least one search query is required.');
}

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
                if (!proxyConfiguration) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
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
const globalSeen = new Set<string>();

async function pushProducts(products: ProductRecord[]): Promise<void> {
    for (const product of products) {
        if (saved >= maxResults) return;
        const key = product.productId ?? product.productUrl ?? product.title ?? '';
        if (globalSeen.has(key)) continue;
        globalSeen.add(key);
        await Actor.pushData(product);
        await Actor.charge({ eventName: 'product-scraped' }).catch(() => null);
        saved++;
    }
}

for (const query of queries) {
    let page = 1;
    let position = 1;
    while (saved < maxResults && page <= 25) {
        const url = buildSearchUrl(query, page);
        log.info(`Fetching Flipkart search: ${query}, page ${page}`);
        const html = await fetchHtml(url);
        if (!html) break;
        const products = parseSearchResults(html, query, position);
        if (products.length === 0) {
            log.warning(`No products parsed for ${query} page ${page}. Flipkart layout may have changed or blocked this request.`);
            break;
        }
        await pushProducts(products);
        log.info(`Parsed ${products.length} product(s) from ${query} page ${page}; saved ${saved}/${maxResults}.`);
        position += products.length;
        page++;
        await new Promise((r) => setTimeout(r, 600 + Math.floor(Math.random() * 900)));
    }
}

log.info(`Flipkart scrape finished. ${saved} products saved.`);
await Actor.exit();
