# Flipkart repair and value upgrade — 7 October 2026

## Published result

Version **1.0.13**, build `cYmDzigRnwBPLNdZu`, published 7 October 2026 from candidate `fa87b11`. API readback confirms latest build, 256 MB default, no-proxy example input, unchanged prices and notice `NONE` after clearing maintenance. Explicit proxy settings in existing tasks remain unchanged.

All 26 local tests and three approved cloud checks passed. Each cloud run used 256 MB without proxy and returned exactly the requested count with no failed pages. Tight test charge allowances intentionally caused `OUTPUT.status=limited` after the final requested row; no requested rows were missing.

| Owner test | Rows | Duration | Peak memory | Reported platform usage | Estimated recurring margin |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default iPhone (`02Mq2Pgo17TUZWPDU`) | 1 | 3.225 s | 37.875 MiB | $0.000155606 | 90.51% |
| iPhone batch (`RuFB1McuRL9omCLsm`) | 25 | 5.066 s | 68.219 MiB | $0.000306630 | 99.23% |
| Laptop batch (`R8KlwJXk04UzHcBXv`) | 25 | 5.588 s | 81.449 MiB | $0.000314446 | 99.21% |

All 51 rows had valid priced identity and listing specifications; review counts were present in 49 rows. Both batches traversed two pages. Costs were unchanged across readings at least 60 seconds apart and checked at least three minutes after completion. Estimated margins include the 20% commission, not development/build expense, and are not a guarantee for other queries, future access or explicit paid proxy settings.

Build usage: $0.005532. Combined build, run usage and listed Actor fees: **$0.108459**, within the approved $0.15 soft target. Only the one approved build and three tests were used. Release receipt: `outputs/flipkart-upgrade-2026-10-07/release.json` in the parent workspace.

## Initial evidence (before this release)

- Public Actor `tfQ7cesZ7bhIx0bB0`, latest 1.0.12, currently UNDER_MAINTENANCE. Default 512 MB. Live prices: $0.002/product plus $0.00005/start; commission 20%.
- User's October screenshot shows approximately $0.002 cost, $0.0016 revenue, -$0.00034 profit and -20.61% margin. Rounded dashboard totals are insufficient to reconstruct exact costs.
- Authenticated owner run listing returned zero accessible recent runs. The exact customer failure is unconfirmed.
- No new cloud build, paid test, price/default-memory change, or public release has been performed for this repair.
- The user subsequently approved one staging build and at most three no-proxy cloud tests (1 iPhone, 25 iPhones, 25 products in another category) at 256 MB, with a $0.15 soft all-in target. Candidate defaults are now no-proxy/256 MB, but public defaults must change only after all three runs pass quality, reliability, memory and >=25% estimated recurring margin. Delayed billing prevents a guaranteed spending cap. Public prices stay unchanged.
- One bounded direct local request (no paid proxy) returned 24 identified, priced iPhone listings from approximately 518 KB of HTML. It exposed a phone/processor classification bug, now covered by a regression test. Local access does not prove Apify-cloud connectivity or cloud margin.

## Implemented locally

- Bound each page to two attempts/20 seconds; close proxy connections, cap decoded HTML at 4 MiB, and stop source work after 210 seconds.
- Stop proxy-authentication failures across queries, repeated pages, and already-exhausted result budgets.
- Save/charge only products with verified Flipkart URL/PID identity and usable positive listing prices. Retain prior rows without automatic source retries when storage/billing fails.
- Explicit coverage and stop reasons, including partial output, genuine empty searches and unrecognized/blocked responses.
- Additional known layout selectors, review count, listing ID, visible specifications and raw price evidence with discrepancy warnings.
- Page cap input, keyword deduplication; existing one-result default, proxy choice and memory retained pending evidence.

## Profit gate

At current prices and 20% commission, illustrative net revenue is `0.8 * (0.002 * savedRows + 0.00005)`. For a 25% recurring margin, platform usage must be no more than 75% of that net amount. Examples: 1 row <= $0.00123; 25 rows <= $0.03003. Build costs are additional development expense. Discounted or changed prices require recalculation.

Test the actual default one-row experience as well as a matching 25-row batch. Do not use a profitable batch to claim that one-row runs are profitable. Read costs again after reporting settles. If the default still loses money, hold publication as a profitability upgrade and propose an explicit pricing/cost design rather than billing for fabricated rows or silently increasing the requested count.

## Competitive direction

[FalconScrape](https://apify.com/piotrv1001/flipkart-listings-scraper) advertises $1/1,000 listing rows, keyword/category/product inputs and richer listing data, with separately priced details. [Haketa](https://apify.com/haketa/flipkart-scraper) also advertises specifications and review counts. These are published claims, not independently tested performance. Our $2/1,000 Actor cannot claim to be cheapest or uniquely offer those fields.

Near-term position: inspectable price evidence, explicit incomplete coverage and bounded operating costs. Future candidates: saved filtered search URLs, variant-aware historical comparisons and priced optional detail enrichment. Each needs source and cost proof before being advertised. No claim of guaranteed paid-user growth.
