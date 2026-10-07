import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeInput } from '../dist/input.js';
import { parseSearchResults } from '../dist/routes.js';

const sampleSearchHtml = `
<html>
  <body>
    <div data-id="MOBTEST123">
      <a href="/apple-iphone-15-black-128-gb/p/itmabc123?pid=MOBTEST123&lid=LSTMOBTEST123&otracker=search">
        <img src="//rukminim2.flixcart.com/image/312/312/xif0q/mobile/example.jpeg?q=70" alt="Apple iPhone 15 (Black, 128 GB)">
      </a>
      <div class="hZ3P6w">Rs.57,999</div>
      <div class="kRYCnD">Rs.69,900</div>
      <div class="HQe8jr">17% off</div>
      <div class="MKiFS6">4.6</div>
      <span class="PvbNMB">1,23,456 Ratings &amp; 7,890 Reviews</span>
      <ul>
        <li class="DTBslk">128 GB ROM</li>
        <li class="DTBslk">15.49 cm Display</li>
      </ul>
    </div>
    <div data-id="MOBTEST123">
      <a href="/duplicate/p/itmabc123?pid=MOBTEST123">
        <img src="//rukminim2.flixcart.com/image/312/312/xif0q/mobile/example.jpeg?q=70" alt="Duplicate Phone">
      </a>
    </div>
  </body>
</html>
`;

test('parses and deduplicates Flipkart search cards', () => {
    const records = parseSearchResults(sampleSearchHtml, 'iphone', 1);

    assert.equal(records.length, 1);
    assert.equal(records[0].source, 'flipkart');
    assert.equal(records[0].searchQuery, 'iphone');
    assert.equal(records[0].position, 1);
    assert.equal(records[0].productId, 'MOBTEST123');
    assert.equal(records[0].title, 'Apple iPhone 15 (Black, 128 GB)');
    assert.equal(records[0].brand, 'Apple');
    assert.equal(records[0].price, 57999);
    assert.equal(records[0].mrp, 69900);
    assert.equal(records[0].discountPercent, 17);
    assert.equal(records[0].rating, 4.6);
    assert.equal(records[0].ratingCount, 123456);
    assert.equal(records[0].packSize, '128 GB, 15.49 cm');
    assert.equal(records[0].category, 'Mobile Phones');
    assert.equal(records[0].imageUrl?.startsWith('https://rukminim2.flixcart.com/'), true);
    assert.equal(records[0].productUrl, 'https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itmabc123?pid=MOBTEST123&lid=LSTMOBTEST123');
});

test('normalizes default input to one result without paid proxy', () => {
    const input = normalizeInput({});

    assert.deepEqual(input.searchQueries, ['iphone']);
    assert.equal(input.maxResults, 1);
    assert.equal(input.sortBy, 'relevance');
    assert.deepEqual(input.proxyConfiguration, { useApifyProxy: false });
});

test('explicit Residential and custom proxy choices remain unchanged', () => {
    for (const proxyConfiguration of [
        { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'], apifyProxyCountry: 'IN' },
        { useApifyProxy: false, proxyUrls: ['http://localhost:8899'] },
    ]) assert.deepEqual(normalizeInput({ proxyConfiguration }).proxyConfiguration, proxyConfiguration);
});

test('rejects unsafe input sizes and invalid sort values', () => {
    assert.throws(
        () => normalizeInput({ searchQueries: ['a', 'b', 'c', 'd', 'e', 'f'] }),
        /at most 5/,
    );
    assert.throws(
        () => normalizeInput({ searchQueries: ['iphone'], maxResults: 0 }),
        /between 1 and 500/,
    );
    assert.throws(
        () => normalizeInput({ searchQueries: ['iphone'], sortBy: 'random' }),
        /sortBy/,
    );
});
