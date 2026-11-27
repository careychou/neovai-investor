---
description: Dive into the retail sector (grocery, big box and warehouse clubs, discount and dollar stores, consumer staples makers, home improvement, online and department stores) and collect the news, numbers and dates that matter.
order: 6
---
# Retail scan

Use the web fetch tool. Give every number and headline its source and the time you read it. Only use what you fetched in this run; never write numbers or headlines from memory. If a source fails, try one other; if that fails too, write "no data".

## Segments and tickers

Cover each segment. Read every ticker's price and day change from the Yahoo chart API (`https://query1.finance.yahoo.com/v8/finance/chart/<TICKER>?range=5d&interval=1d`: `meta.regularMarketPrice` and the previous close), and the segment's average day change.

| Segment | key | Tickers |
|---|---|---|
| Grocery | `grocery` | KR, ACI, SFM, GO, WMK, IMKTA, VLGEA |
| Big box and clubs | `bigbox` | WMT, COST, TGT, BJ, PSMT |
| Discount and dollar | `discount` | DG, DLTR, OLLI, FIVE, BURL, ROST, TJX |
| Consumer staples makers | `staples` | PG, KO, PEP, MDLZ, GIS, KHC, CL, KMB, CHD, CPB, SJM, HSY, CAG |
| Home improvement | `home` | HD, LOW, TSCO |
| Online and department | `online` | AMZN, CHWY, M, KSS, JWN, DDS |
| Sector funds | `etf` | XRT (retail), XLP (staples), XLY (discretionary), VDC |

Add any other listed retailer that is in the news today. Private grocers (H-E-B, Aldi, Publix, Trader Joe's, Wegmans, Meijer) have no ticker: include their news when it affects the listed names (price wars, new stores in their markets, labor, deals), with `tickers` naming the listed companies affected.

## What to collect

1. **Retail news (last 48 hours).** Read, in this order:
   - CNBC retail section `https://www.cnbc.com/retail/` and the CNBC stocks-moving page (see market-scan "Sources that worked").
   - Grocery Dive `https://www.grocerydive.com/` and Retail Dive `https://www.retaildive.com/` (trade news: store openings and closings, pricing, labor, supply chain, private label, delivery).
   - Supermarket News `https://www.supermarketnews.com/` and Progressive Grocer `https://progressivegrocer.com/` as backups.
   - The CNBC quote page news for any ticker that moved more than 3%.
   Keep 8 to 15 items that could move a retail stock or tell us about the shopper: earnings and guidance, same-store sales, traffic, prices and promotions, tariffs and import costs, SNAP and other benefits, food inflation, labor and unions, mergers, store openings and closings, theft and shrink, delivery and online share, private label, and rating changes. Say for each which segment it belongs to and whether it is `good`, `bad` or `neutral` for the stocks it names.
2. **Shopper and macro data.** Latest release you can fetch, with its date: retail sales (Census, monthly), CPI food at home and food away from home (BLS), consumer sentiment (University of Michigan), and the Thanksgiving / holiday season outlook from NRF when in season. Write "no data" when you could not fetch one.
3. **Calendar.** Earnings dates in the next 14 days for the tickers above (Nasdaq earnings calendar `https://api.nasdaq.com/api/calendar/earnings?date=YYYY-MM-DD`, or stockanalysis.com `/stocks/<ticker>/` "Earnings Date"), plus retail sales and CPI release dates and big shopping days (Black Friday, Cyber Monday).
4. **Themes.** Three to five trends moving the sector this month (for example "shoppers trade down to clubs and dollar stores", "tariffs on imported goods", "GLP-1 drugs cut snack volumes"), each with the reason and source.
5. **Your holdings and picks.** For every ticker the user holds (accepted Buys not sold in `records/data/decisions.json`, and `records/data/holdings.json`, both read-only) or that is on today's watch list in `records/data/market.json`, and that is retail or staples, say in one line what today's retail news means for it.
6. **Ideas.** Up to six retail tickers worth a closer look, with the reason. These go to the market scan's watch list only when the user runs the market scan; do not change `market.json`.

## Mood

One line: `strong`, `mixed` or `weak` for retail today, with the reason (segment moves, news balance and shopper data).

## Rules

- Follow the user-preference rules. This is information, not a trade call: never say buy or sell; at most "watch" or "check before buying".
- Keep the headline and the why in everyday words.
