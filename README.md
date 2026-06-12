# Flipkart Products Scraper

Scrape public Flipkart search result pages into a structured product dataset. The Actor collects product title, product ID, current price, original price, discount, rating, rating and review counts, product specifications, image URL, result position, and product URL.

The Actor uses lightweight HTTP requests against server-rendered Flipkart search pages. It does not require login and does not extract private customer, seller, or contact data. Flipkart commonly blocks cloud datacenter traffic, so Apify residential proxy is enabled by default for reliability.

## Input

| Field | Description | Default |
|---|---|---|
| `searchQueries` | Product search terms | `["iphone"]` |
| `maxResults` | Maximum products saved across all searches | `10` |
| `sortBy` | Relevance, popularity, price low/high, or newest | `relevance` |
| `proxyConfiguration` | Apify proxy settings | Residential, India |

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

## Output

```json
{
  "source": "flipkart",
  "searchQuery": "iphone",
  "position": 1,
  "productId": "MOBHFN6YN2HXB5HE",
  "title": "Apple iPhone 17 (Black, 256 GB)",
  "price": 77900,
  "priceDisplay": "₹77,900",
  "originalPrice": 82900,
  "originalPriceDisplay": "₹82,900",
  "discountPercent": 6,
  "rating": 4.6,
  "ratingCount": 13902,
  "reviewCount": 877,
  "specifications": ["256 GB ROM", "16.0 cm (6.3 inch) Super Retina XDR Display"],
  "imageUrl": "https://rukminim2.flixcart.com/image/312/312/...",
  "productUrl": "https://www.flipkart.com/apple-iphone-17-black-256-gb/p/...",
  "scrapedAt": "2026-06-12T17:30:00.000Z"
}
```

## Use Cases

- E-commerce price monitoring
- Product catalog research
- Discount and rating analysis
- Competitive assortment tracking
- Marketplace trend reports

## Pricing

| Event | Price |
|---|---|
| `product-scraped` | $0.002 per saved product |

The Actor charges only after a clean product record is saved. Apify platform usage is billed separately.

## Notes

Flipkart page structure can change. If a run returns no records, keep residential proxy enabled, reduce request volume, and retry.

## License

Apache-2.0
