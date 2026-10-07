import assert from 'node:assert/strict';
import test from 'node:test';
import { Response } from 'undici';
import { fetchHtml, classifyPage, FetchFailure } from '../dist/http.js';
import { collect } from '../dist/runner.js';
import { normalizeInput } from '../dist/input.js';
import { parseSearchResults } from '../dist/routes.js';

const card = (id = 'MOB1', price = '₹1,000', extra = '') => `<div data-id="${id}"><a href="/phone/p/item?pid=${id}&lid=LST${id}"><img src="//rukminim2.flixcart.com/a.jpg" alt="Example Phone"></a><div class="Nx9bqj">${price}</div>${extra}</div>`;
function depsFor(pages, opts = {}) {
    let calls = 0; const rows = [];
    return { rows, calls: () => calls,
        fetch: async () => { const page = pages[Math.min(calls++, pages.length - 1)]; if (page instanceof Error) throw page; return page; },
        push: async row => { rows.push(row); return { chargedCount: 1, eventChargeLimitReached: false }; },
        canCharge: () => true, ...opts };
}

test('adds listing identity, reviews, specifications and price evidence without extra requests', () => {
    const [row] = parseSearchResults(card('MOB1', '₹1,000', '<div class="yRaY8j">₹2,000</div><div class="HQe8jr">10% off</div><span class="Wphh3N">1,234 Ratings &amp; 50 Reviews</span><ul><li class="J+igdf">128 GB ROM</li></ul>'), 'phone', 1);
    assert.equal(row.listingId, 'LSTMOB1'); assert.equal(row.reviewCount, 50);
    assert.deepEqual(row.specifications, ['128 GB ROM']);
    assert.deepEqual(row.priceEvidence.warnings, ['discount_mismatch']);
});
test('rejects external product URLs and conflicting product identity', () => {
    assert.equal(parseSearchResults(card().replace('/phone/p/', 'https://evil.example/phone/p/'), 'q', 1).length, 0);
    assert.equal(parseSearchResults(card().replace('pid=MOB1', 'pid=MOB2'), 'q', 1).length, 0);
});
test('does not parse instalments or combine multiple prices', () => {
    for (const price of ['₹1,000 per month', '₹1,000 ₹2,000', '₹500 with exchange']) {
        assert.equal(parseSearchResults(card('MOB1', price), 'q', 1)[0].price, null);
    }
});
test('invalid ratings and missing stock are not fabricated', () => {
    const [row] = parseSearchResults(card('MOB1', '₹100', '<div class="XQDdHH">8</div>'), 'q', 1);
    assert.equal(row.rating, null); assert.equal(row.inStock, null);
});
test('a phone processor does not misclassify the phone as a laptop', () => {
    const [row] = parseSearchResults(card('MOB1', '₹69,900', '<li class="DTBslk">128 GB ROM</li><li class="DTBslk">A18 Chip, 6 Core Processor Processor</li>'), 'iphone', 1);
    assert.equal(row.category, 'Mobile Phones');
});
test('classifies visible block and explicit empty messages, ignores script strings', () => {
    assert.equal(classifyPage('<h1>Access denied</h1>'), 'blocked');
    assert.equal(classifyPage('<div>No results found</div>'), 'empty');
    assert.equal(classifyPage('<script>const captcha = true;</script>' + card()), 'content');
});
test('stops fetching immediately at requested count', async () => {
    const deps = depsFor([card() + card('MOB2')]);
    const result = await collect(normalizeInput({ maxResults: 1 }), deps);
    assert.equal(deps.calls(), 1); assert.equal(deps.rows.length, 1); assert.equal(result.status, 'succeeded');
});
test('repeated pages stop instead of burning the full page budget', async () => {
    const deps = depsFor([card()]);
    const result = await collect(normalizeInput({ maxResults: 50 }), deps);
    assert.equal(deps.calls(), 2); assert.equal(result.results, 1);
    assert.equal(result.coverage[0].reason, 'no_new_priced_products'); assert.equal(result.status, 'partial');
});
test('no usable price means no billing and no speculative next-page fetch', async () => {
    const deps = depsFor([card('MOB1', '')]);
    const result = await collect(normalizeInput({ maxResults: 25 }), deps);
    assert.equal(deps.calls(), 1); assert.equal(deps.rows.length, 0); assert.equal(result.unpricedSkipped, 1);
});
test('does not request any source page when result budget is already exhausted', async () => {
    const deps = depsFor([card()], { canCharge: () => false });
    const result = await collect(normalizeInput({}), deps);
    assert.equal(deps.calls(), 0); assert.equal(result.spendingLimitReached, true);
});
test('billing limit stops mid-page without fetching again', async () => {
    let charged = 0;
    const deps = depsFor([card() + card('MOB2')], { push: async () => { charged++; return { chargedCount: 1, eventChargeLimitReached: true }; } });
    const result = await collect(normalizeInput({ maxResults: 20 }), deps);
    assert.equal(charged, 1); assert.equal(result.results, 1); assert.equal(result.status, 'limited');
});
test('storage or billing failure is not retried or silently reported successful', async () => {
    const deps = depsFor([card()], { push: async () => { throw new Error('storage'); } });
    await assert.rejects(collect(normalizeInput({}), deps), /storage/); assert.equal(deps.calls(), 1);
});
test('source failure after saved data retains honest partial coverage', async () => {
    const deps = depsFor([card(), new FetchFailure('REQUEST_TIMEOUT')]);
    const result = await collect(normalizeInput({ maxResults: 25 }), deps);
    assert.equal(result.results, 1); assert.equal(result.failedPages, 1); assert.equal(result.status, 'partial');
});
test('an unrecognized empty shell fails, while explicit no-results is reported honestly', async () => {
    assert.equal((await collect(normalizeInput({}), depsFor(['<html>Loading</html>']))).status, 'failed');
    assert.equal((await collect(normalizeInput({}), depsFor(['<h1>No results found</h1>']))).status, 'succeeded');
});
test('invalid proxy stops all keywords without retries per keyword', async () => {
    const deps = depsFor([new FetchFailure('PROXY_AUTH_OR_COUNTRY_UNAVAILABLE')]);
    const result = await collect(normalizeInput({ searchQueries: ['phone', 'laptop'] }), deps);
    assert.equal(deps.calls(), 1); assert.equal(result.status, 'failed');
});
test('query deduplication and bounded configurable page count', () => {
    assert.deepEqual(normalizeInput({ searchQueries: ['phone', 'phone'] }).searchQueries, ['phone']);
    for (const maxPagesPerQuery of [0, 26, 1.5]) assert.throws(() => normalizeInput({ maxPagesPerQuery }));
});
test('page and overall time limits prevent further source fetches', async () => {
    const deps = depsFor([card()]);
    assert.equal((await collect(normalizeInput({ maxResults: 25, maxPagesPerQuery: 1 }), deps)).coverage[0].reason, 'page_cap');
    let tick = 0;
    const timed = depsFor([card()], { now: () => tick++ === 0 ? 0 : 220000 });
    assert.equal((await collect(normalizeInput({}), timed)).coverage[0].reason, 'time_budget');
    assert.equal(timed.calls(), 0);
});

function httpDeps(statuses, payload = card()) {
    let calls = 0, destroyed = 0;
    return { calls: () => calls, destroyed: () => destroyed,
        makeAgent: () => ({ destroy: async () => { destroyed++; } }),
        fetch: async (_url, options) => {
            assert.ok(options.signal); assert.equal(options.redirect, 'error');
            const status = statuses[Math.min(calls++, statuses.length - 1)];
            if (status instanceof Error) throw status;
            return new Response(payload, { status });
        } };
}
test('closes successful proxy connection', async () => {
    const deps = httpDeps([200]);
    await fetchHtml('https://www.flipkart.com/search', async () => 'http://proxy', 1000, deps);
    assert.equal(deps.calls(), 1); assert.equal(deps.destroyed(), 1);
});
test('closes all proxy connections on bounded blocked retries', async () => {
    const deps = httpDeps([403]);
    await assert.rejects(fetchHtml('https://www.flipkart.com/search', async () => 'http://proxy', 1000, deps), /HTTP_403/);
    assert.equal(deps.calls(), 2); assert.equal(deps.destroyed(), 2);
});
test('proxy authentication and non-retryable status stop after one attempt', async () => {
    for (const status of [407, 404]) {
        const deps = httpDeps([status]);
        await assert.rejects(fetchHtml('https://www.flipkart.com/search', async () => 'http://proxy', 1000, deps));
        assert.equal(deps.calls(), 1); assert.equal(deps.destroyed(), 1);
    }
});
test('rejects oversized bodies and destroys their connection', async () => {
    const deps = httpDeps([200], 'x'.repeat(4 * 1024 * 1024 + 1));
    await assert.rejects(fetchHtml('https://www.flipkart.com/search', async () => 'http://proxy', 1000, deps), /RESPONSE_TOO_LARGE/);
    assert.equal(deps.calls(), 1); assert.equal(deps.destroyed(), 1);
});
test('200 challenge pages do not become successful output', async () => {
    const deps = httpDeps([200], '<h1>Verify you are human</h1>');
    await assert.rejects(fetchHtml('https://www.flipkart.com/search', async () => undefined, 1000, deps), /SOURCE_BLOCKED/);
    assert.equal(deps.calls(), 2);
});
