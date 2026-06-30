# Flipkart Product Scraper: Prices & Search

Scrape public Flipkart search result pages and export clean product rows from the Apify Dataset in JSON, CSV, Excel, XML, HTML, or RSS. The Actor is built for price monitoring, catalog research, assortment checks, and lightweight marketplace reports.

It extracts product titles, brands, Flipkart product IDs, prices, MRP, discount percentages, ratings, rating counts, image URLs, product URLs, and scrape timestamps. It does not require a Flipkart login or API key, and it does not collect private customer, seller, account, or contact data.

The default run is intentionally small: one `iphone` search result sorted by relevance with Apify Residential proxy in India.

## What you get

- Search query and product position
- Flipkart product ID (`pid`)
- Product title and derived brand
- Current price, MRP, discount percentage, and currency
- Pack-size details when visible in the listing text
- Basic category fallback when detectable from listing specs
- Star rating and rating count
- Product URL and image URL
- Timestamp for each saved row

## Common uses

1. Track product prices, MRP, discounts, and ratings for important Flipkart keywords.
2. Compare search visibility and price positioning across competing products.
3. Build small catalog snapshots for dashboards or ecommerce reports.
4. Monitor deal pages or category keywords over time.
5. Enrich internal product lists with public Flipkart listing metadata.

## Quick start

Use this input for a low-cost first run:

```json
{
  "searchQueries": ["iphone"],
  "maxResults": 1,
  "sortBy": "relevance",
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

After the run finishes, open the dataset and export the result as CSV, JSON, Excel, or another Apify-supported format.

## Input

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `searchQueries` | array | `["iphone"]` | One to five product search terms, such as `iphone`, `running shoes`, `laptop`, or `mixer grinder`. |
| `maxResults` | integer | `1` | Maximum product rows to save across all search queries. Range: 1-500. |
| `sortBy` | string | `relevance` | Flipkart search sort: `relevance`, `popularity`, `price_asc`, `price_desc`, or `recency_desc`. |
| `proxyConfiguration` | object | Residential India | Apify proxy settings. Residential India proxy is recommended for cloud reliability. |

## Output

A saved dataset item looks like this:

```json
{
  "source": "flipkart",
  "searchQuery": "iphone",
  "position": 1,
  "productId": "MOBTEST123",
  "title": "Apple iPhone 15 (Black, 128 GB)",
  "brand": "Apple",
  "price": 57999,
  "mrp": 69900,
  "discountPercent": 17,
  "currency": "INR",
  "packSize": "128 GB, 15.49 cm",
  "category": "Mobile Phones",
  "rating": 4.6,
  "ratingCount": 123456,
  "inStock": null,
  "productUrl": "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itmabc123?pid=MOBTEST123",
  "imageUrl": "https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/example.jpeg?q=70",
  "scrapedAt": "2026-06-30T10:00:00.000Z"
}
```

Optional fields may be `null` when Flipkart does not show them in the search result card.

## Pricing

This Actor uses Apify Pay Per Event pricing.

| Event | Price |
| --- | ---: |
| `product-scraped` | `$0.002` per saved product row |
| `apify-actor-start` | `$0.00005` per GB when the Actor starts |

The Actor charges product events only when a clean product row is saved to the default dataset. It uses atomic dataset charging, so a billing/spending-limit stop prevents unpaid records from being written.

Platform usage, such as compute and proxy traffic, may also be charged by Apify depending on the run configuration. Residential proxy is more reliable for Flipkart, but it can increase platform usage cost. Start with `maxResults: 1` or a small number before scaling up.

## Cost control

- Start with one query and `maxResults: 1`.
- Increase `maxResults` only after checking the output fields.
- Keep Residential India proxy enabled for cloud runs.
- Use the run's maximum cost setting for strict budget control.
- Split very different keyword groups into separate tasks so each task is easier to monitor.

## Reliability

Flipkart changes HTML layouts and may throttle scraping traffic. The Actor includes:

- India residential proxy defaults
- Retry handling for blocked or rate-limited responses
- Conservative request pacing between result pages
- Deduplication by product ID, URL, or title
- A zero-result failure guard so blocked or changed-layout runs do not look like successful empty runs
- Field-level fallbacks when optional listing data is not visible

## Limits

- Search-result pages do not always expose stock, full specifications, seller data, or review text.
- `brand`, `packSize`, and `category` are inferred from listing text and may need downstream cleaning for strict catalog use.
- This Actor scrapes public search result pages only. It is not an official Flipkart API and is not affiliated with Flipkart.

## Responsible use

Use this Actor for lawful research, monitoring, and analysis of publicly available information. You are responsible for complying with Flipkart's terms, robots.txt, privacy laws, India's DPDP Act where applicable, and all local regulations.

Do not use this Actor to collect, infer, sell, or misuse personal data. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0. See `LICENSE`.
