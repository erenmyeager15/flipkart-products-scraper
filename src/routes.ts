import * as cheerio from 'cheerio';
import type { ProductRecord } from './types.js';

const FLIPKART_ORIGIN = 'https://www.flipkart.com';

const text = ($: cheerio.CheerioAPI, el: any, selector: string): string | null => {
    const value = $(el).find(selector).first().text().replace(/\s+/g, ' ').trim();
    return value || null;
};

const cleanString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned || null;
};

const textOrNA = (value: unknown): string => cleanString(value) ?? 'N/A';

const moneyToNumber = (value: string | null): number | null => {
    if (!value) return null;
    // Do not concatenate an EMI, exchange price or second amount into a fake price.
    if (/\b(?:emi|month|exchange|bank offer)\b/i.test(value)) return null;
    const amounts = value.match(/\d[\d,]*(?:\.\d{1,2})?/g);
    if (amounts?.length !== 1) return null;
    const normalized = value
        .replace(/\bRs\.?/gi, '')
        .replace(/[^\d.]/g, '');
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
    const cleaned = cleanString(href);
    if (!cleaned || cleaned.toLowerCase() === 'proxied content') return null;
    const decoded = cleaned.replace(/&amp;/g, '&');
    try {
        const url = new URL(decoded, FLIPKART_ORIGIN);
        if (!['https:', 'http:'].includes(url.protocol) || !['flipkart.com', 'www.flipkart.com'].includes(url.hostname)
            || url.username || url.password || !url.pathname.includes('/p/')) return null;
        url.protocol = 'https:';
        url.hostname = 'www.flipkart.com';
        url.hash = '';
        for (const key of [...url.searchParams.keys()]) {
            if (!['pid', 'lid', 'marketplace'].includes(key)) url.searchParams.delete(key);
        }
        return url.toString();
    } catch {
        return null;
    }
};

const cleanImageUrl = (value: string | undefined): string | null => {
    const cleaned = cleanString(value);
    if (!cleaned || cleaned.toLowerCase() === 'proxied content') return null;
    if (cleaned.startsWith('//')) return `https:${cleaned}`;
    if (cleaned.startsWith('http://')) return `https://${cleaned.slice('http://'.length)}`;
    if (cleaned.startsWith('https://')) return cleaned;
    return null;
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

const brandFromTitle = (title: string): string => {
    const first = title.split(/\s+/).find(Boolean);
    return first ?? 'N/A';
};

const packSizeFromTitleAndSpecs = (title: string, specifications: string[]): string => {
    const joined = [title, ...specifications].join(' ');
    const matches = joined.match(/\b\d+(?:\.\d+)?\s*(?:GB|TB|MB|kg|g|ml|L|litre|ltr|inch|cm)\b/gi) ?? [];
    const unique = Array.from(new Set(matches.map((item) => item.replace(/\s+/g, ' ').trim())));
    return unique.length > 0 ? unique.join(', ') : 'N/A';
};

const categoryFromSpecs = (specifications: string[]): string => {
    const joined = specifications.join(' ');
    if (/\b(?:phone|smartphone|rom)\b/i.test(joined)) return 'Mobile Phones';
    if (/\b(?:laptop|ssd|hdd)\b/i.test(joined)) return 'Laptops';
    return 'N/A';
};

const parseProductCard = ($: cheerio.CheerioAPI, el: any, searchQuery: string, position: number): ProductRecord | null => {
    const card = $(el);
    const link = card.find('a[href*="/p/"]').first();
    const productUrl = cleanUrl(link.attr('href'));
    const image = card.find('img[src*="rukminim"], img[data-src*="rukminim"]').first();
    const imageUrl = cleanImageUrl(image.attr('src') ?? image.attr('data-src'));
    const title = cleanString(image.attr('alt'))
        || text($, el, '.RG5Slk')
        || text($, el, '.syl9yP')
        || text($, el, '.KzDlHZ, ._4rR01T, .s1Q9rs, .wjcEIp')
        || cleanString(link.attr('title'))
        || cleanString(link.text())
        || null;

    const urlId = productIdFromUrl(productUrl);
    const cardId = cleanString(card.attr('data-id'));
    if (!title || !productUrl || !urlId || (cardId && cardId !== urlId)) return null;

    const priceDisplay = text($, el, '.hZ3P6w, .Nx9bqj, ._30jeq3');
    const rawOriginalPriceDisplay = text($, el, '.kRYCnD, .yRaY8j, ._3I9_wc');
    const price = moneyToNumber(priceDisplay);
    const rawOriginalPrice = moneyToNumber(rawOriginalPriceDisplay);
    const originalPrice = rawOriginalPrice !== null && price !== null && rawOriginalPrice > price
        ? rawOriginalPrice
        : null;
    const discountText = text($, el, '.HQe8jr')
        ?? card.find('*')
            .map((_, node) => $(node).text().replace(/\s+/g, ' ').trim())
            .get()
            .find((value) => /^\d+\s*%\s*off$/i.test(value))
        ?? null;
    const discountMatch = discountText?.match(/^(\d+)\s*%\s*off/i);
    const ratingText = text($, el, '.MKiFS6, .XQDdHH, ._3LWZlK');
    const countsText = text($, el, '.PvbNMB, .Wphh3N, ._2_R_DZ');
    const counts = parseRatingCounts(countsText);
    const specifications = card.find('li.DTBslk, li[class~="J+igdf"], li._21Ahn-')
        .map((_, li) => $(li).text().replace(/\s+/g, ' ').trim())
        .get()
        .filter(Boolean);
    const cardText = card.text().replace(/\s+/g, ' ').trim();
    const discount = discountMatch ? Number(discountMatch[1]) : null;
    const warnings: string[] = [];
    if (price === null || price <= 0) warnings.push('usable_price_missing');
    if (rawOriginalPrice !== null && price !== null && rawOriginalPrice < price) warnings.push('mrp_below_price');
    if (discount !== null && originalPrice && price && Math.abs(discount - (1 - price / originalPrice) * 100) > 2) warnings.push('discount_mismatch');
    const rating = ratingText ? Number.parseFloat(ratingText) : NaN;

    return {
        source: 'flipkart',
        searchQuery: textOrNA(searchQuery),
        position,
        productId: urlId,
        listingId: new URL(productUrl).searchParams.get('lid'),
        title,
        brand: brandFromTitle(title),
        price,
        mrp: originalPrice,
        discountPercent: discountMatch ? Number(discountMatch[1]) : null,
        currency: 'INR',
        packSize: packSizeFromTitleAndSpecs(title, specifications),
        category: categoryFromSpecs(specifications),
        rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null,
        ratingCount: counts.ratingCount,
        reviewCount: counts.reviewCount,
        specifications: [...new Set(specifications)].slice(0, 30),
        priceEvidence: { displayedPrice: priceDisplay, displayedMrp: rawOriginalPriceDisplay, warnings },
        inStock: /out of stock|currently unavailable|sold out/i.test(cardText) ? false : null,
        productUrl,
        imageUrl,
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
