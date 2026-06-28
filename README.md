# Flipkart Scraper - Prices, Ratings & Product Search Data

Scrape public Flipkart product search results and export clean data to JSON, CSV, Excel, XML, or RSS from the Apify Dataset — no login and no API key required. This Flipkart scraper extracts product titles, brands, prices, MRP, discounts, ratings, product IDs, image URLs, product URLs, and timestamps for any search term.

Built with Node.js 20, TypeScript, and the Apify SDK. It reads Flipkart's server-rendered search pages over lightweight HTTP requests through Apify residential proxies (India), with retries and resilient parsing so cloud runs stay reliable. It does not require login and does not collect private customer, seller, or contact data.

For a low-cost first run, use the default sample input: `iphone`, 10 products, sorted by relevance.

## What It Extracts

- Source, search query, and result position
- Flipkart product ID (`pid`)
- Product title and derived brand
- Current price, MRP, discount percentage, and currency
- Pack-size style details where visible in the title/specs
- Category fallback where detectable
- Star rating and rating count
- Product URL and image URL
- ISO scrape timestamp

## Use Cases

1. E-commerce price monitoring and repricing across Flipkart listings.
2. Product catalog and assortment research for a brand or category.
3. Discount and rating analysis to spot deals and best-sellers.
4. Competitive tracking of how rivals rank for key search terms.
5. Marketplace trend reports and dashboards over time.

## Pricing

This Actor uses Apify Pay Per Event pricing. You pay only for clean records delivered to the dataset — failed, blocked, or empty results are not billed.

| Event name | Price per event | 1,000 results | 10,000 results |
| --- | ---: | ---: | ---: |
| `product-scraped` | $0.002 | $2.00 | $20.00 |

Depending on the active Store pricing configuration, platform usage such as compute and proxy traffic may also be billed by Apify. Keep residential India proxy enabled for reliable cloud runs, and start with a small `maxResults` value.

Cost-control tips:

- Start with one query and `maxResults: 10`.
- Add more keywords only after the first run confirms the output fits your use case.
- Keep India residential proxy enabled for reliability, especially for cloud runs.
- Use the run's maximum cost setting if you want a strict spending cap.

## Input

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `searchQueries` | array | yes | `["iphone"]` | Product search terms such as iphone, laptop, shoes, or mixer grinder. |
| `maxResults` | integer | no | `10` | Maximum products saved across all search queries. |
| `sortBy` | string | no | `relevance` | Sort order: relevance, popularity, price low/high, or newest. |
| `proxyConfiguration` | object | no | Residential, IN | Apify proxy settings. Residential India recommended. |

## Example Input

```json
{
  "searchQueries": ["iphone"],
  "maxResults": 10,
  "sortBy": "relevance",
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

## Sample Output

```json
{
  "source": "flipkart",
  "searchQuery": "iphone",
  "position": 1,
  "productId": "MOBHFN6YN2HXB5HE",
  "title": "Apple iPhone 17 (Black, 256 GB)",
  "brand": "Apple",
  "price": 77900,
  "mrp": 82900,
  "discountPercent": 6,
  "currency": "INR",
  "packSize": "256 GB, 6.3 inch",
  "category": "Mobile Phones",
  "rating": 4.6,
  "ratingCount": 13902,
  "inStock": null,
  "productUrl": "https://www.flipkart.com/apple-iphone-17-black-256-gb/p/itm6eb39da622cdd?pid=MOBHFN6YN2HXB5HE",
  "imageUrl": "https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/s/t/g/-original-imahft5gqkxzyeqa.jpeg?q=70",
  "scrapedAt": "2026-06-12T19:56:31.980Z"
}
```

## How It Works

1. Validates the search queries and builds Flipkart search URLs (with optional sort).
2. Fetches server-rendered search pages through Apify residential proxies, retrying on 403/429/529 blocks.
3. Parses each product card and cleans price, rating, review, and specification fields.
4. Deduplicates by product ID across pages and queries.
5. Saves and charges each clean record atomically, then stops before further requests when the user's spending limit is reached.

## How to Scrape Flipkart (Step by Step)

1. Click **Try for free** / **Run**.
2. Enter one or more search terms in `searchQueries` (for example, `iphone` or `laptop`).
3. Set `maxResults` (start small to test) and pick a `sortBy` order.
4. Keep residential India proxy enabled for reliable results.
5. Run, then export results as CSV, JSON, or Excel, or pull them via the Apify API.

## Reliability & Anti-Bot Handling

- Apify residential proxy support, pinned to India by default.
- Retries on transient failures and 403/429/529 responses.
- Field-level fallback to `null` when optional data is unavailable.
- Charges only for clean, saved records — never for blocked or empty pages.

## Known Limits

- Flipkart's search HTML class names change periodically; if a run returns no records, keep residential proxy enabled and retry.
- Some fields (discount, original price, rating, reviews) appear only when Flipkart shows them for a listing and may be `null` otherwise.

## Legal and Ethical Use

Use this Actor for legitimate research, price monitoring, and analysis. You are responsible for complying with Flipkart's terms, privacy laws, and local regulations wherever you use the data.

## Responsible Use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0. See `LICENSE`.
