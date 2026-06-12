import * as cheerio from 'cheerio';
import type { ProductRecord } from './types.js';

const FLIPKART_ORIGIN = 'https://www.flipkart.com';

const text = ($: cheerio.CheerioAPI, el: any, selector: string): string | null => {
    const value = $(el).find(selector).first().text().replace(/\s+/g, ' ').trim();
    return value || null;
};

const moneyToNumber = (value: string | null): number | null => {
    if (!value) return null;
    const normalized = value.replace(/[^\d.]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseCount = (value: string | null): number | null => {
    if (!value) return null;
    const normalized = value.replace(/[^\d]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const cleanUrl = (href: string | undefined): string | null => {
    if (!href) return null;
    const decoded = href.replace(/&amp;/g, '&');
    const absolute = decoded.startsWith('http') ? decoded : `${FLIPKART_ORIGIN}${decoded}`;
    try {
        const url = new URL(absolute);
        for (const key of [...url.searchParams.keys()]) {
            if (!['pid', 'lid', 'marketplace'].includes(key)) url.searchParams.delete(key);
        }
        return url.toString();
    } catch {
        return absolute;
    }
};

const productIdFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
        return new URL(url).searchParams.get('pid');
    } catch {
        return null;
    }
};

const parseRatingCounts = (value: string | null): { ratingCount: number | null; reviewCount: number | null } => {
    if (!value) return { ratingCount: null, reviewCount: null };
    const ratingMatch = value.match(/([\d,]+)\s+Ratings?/i);
    const reviewMatch = value.match(/([\d,]+)\s+Reviews?/i);
    return {
        ratingCount: parseCount(ratingMatch?.[1] ?? null),
        reviewCount: parseCount(reviewMatch?.[1] ?? null),
    };
};

const parseProductCard = ($: cheerio.CheerioAPI, el: any, searchQuery: string, position: number): ProductRecord | null => {
    const card = $(el);
    const link = card.find('a[href*="/p/"]').first();
    const productUrl = cleanUrl(link.attr('href'));
    const image = card.find('img[src*="rukminim"]').first();
    const imageUrl = image.attr('src') ?? image.attr('data-src') ?? null;
    const title = image.attr('alt')?.trim()
        || text($, el, '.RG5Slk')
        || text($, el, '.syl9yP')
        || link.text().replace(/\s+/g, ' ').trim()
        || null;

    if (!title || !productUrl) return null;

    const cardText = card.text().replace(/\s+/g, ' ').trim();
    const exactPriceTexts = card.find('*')
        .map((_, node) => $(node).text().replace(/\s+/g, ' ').trim())
        .get()
        .filter((value) => /^\u20b9\s?[\d,]+(?:\.\d+)?$/.test(value));
    const priceDisplay = text($, el, '.hZ3P6w') ?? exactPriceTexts[0] ?? null;
    const originalPriceDisplay = text($, el, '.kRYCnD')
        ?? exactPriceTexts.find((p) => p !== priceDisplay)
        ?? null;
    const discountText = text($, el, '.HQe8jr')
        ?? card.find('*')
            .map((_, node) => $(node).text().replace(/\s+/g, ' ').trim())
            .get()
            .find((value) => /^\d+\s*%\s*off$/i.test(value))
        ?? null;
    const discountMatch = discountText?.match(/^(\d+)\s*%\s*off/i);
    const ratingText = text($, el, '.MKiFS6');
    const countsText = text($, el, '.PvbNMB');
    const counts = parseRatingCounts(countsText);
    const specifications = card.find('li.DTBslk')
        .map((_, li) => $(li).text().replace(/\s+/g, ' ').trim())
        .get()
        .filter(Boolean);

    return {
        source: 'flipkart',
        searchQuery,
        position,
        productId: card.attr('data-id') ?? productIdFromUrl(productUrl),
        title,
        price: moneyToNumber(priceDisplay),
        priceDisplay,
        originalPrice: moneyToNumber(originalPriceDisplay),
        originalPriceDisplay,
        discountPercent: discountMatch ? Number(discountMatch[1]) : null,
        rating: ratingText ? Number(ratingText) : null,
        ratingCount: counts.ratingCount,
        reviewCount: counts.reviewCount,
        specifications,
        imageUrl,
        productUrl,
        scrapedAt: new Date().toISOString(),
    };
};

export function parseSearchResults(html: string, searchQuery: string, startPosition: number): ProductRecord[] {
    const $ = cheerio.load(html);
    const records: ProductRecord[] = [];
    const seen = new Set<string>();

    $('[data-id]').each((_, el) => {
        const parsed = parseProductCard($, el, searchQuery, startPosition + records.length);
        if (!parsed) return;
        const key = parsed.productId ?? parsed.productUrl ?? parsed.title ?? '';
        if (seen.has(key)) return;
        seen.add(key);
        records.push(parsed);
    });

    return records;
}
