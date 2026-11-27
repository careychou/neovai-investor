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

Add any other listed retailer that is in the news today. Private grocers (Aldi, Publix, Trader Joe's, Wegmans, Meijer, Schnucks) have no ticker: include their news when it affects the listed names (price wars, new stores in their markets, labor, deals), with `tickers` naming the listed companies affected.

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

## Daily digest: retail, technology, data, AI and design

On every retail scan, also build a news digest of the **last 3 calendar days** (ending today, UTC). Only include items published or materially updated inside that window. Aim for **15 to 22 items** across five lanes. The reader follows retail and grocery as an investor and as a technology practitioner, so every lane matters, not only stock news.

### Lanes

- **A. Grocery & retail** (`retail`): agentic shopping assistants, retail media, AI in store operations, competitor moves (Kroger, Albertsons, Walmart, Instacart, Amazon, Target, Costco, Publix, Wegmans, Sprouts, Schnucks, Aldi), consumer-goods and merchandising tech, supply chain. Sources: Progressive Grocer, Grocery Dive, Supermarket News, Chain Store Age, Retail Dive, CSNews, Modern Retail, RetailWire, PYMNTS retail.
- **B. Technology** (`tech`): software engineering, cloud and infrastructure, robotics, hardware, and security (breaches, major vulnerabilities in widely used enterprise software, attacks driven by AI agents). Security items go in this lane. Sources: TechCrunch, The Verge, Ars Technica, Axios, The Register, IEEE Spectrum (robotics), The Robot Report; for security, The Hacker News, BleepingComputer, SecurityWeek, Krebs on Security.
- **C. Analytics, data science & machine learning** (`data`): data platforms and the modern data stack, ML tooling and research (frontier-scale AI goes in lane D), enterprise analytics adoption, data engineering. Sources: KDnuggets, Towards Data Science, VentureBeat (data and analytics), The New Stack (data engineering), O'Reilly Radar, Gartner data and analytics commentary, the Snowflake, Databricks and dbt Labs blogs, MIT Sloan Management Review (data and analytics).
- **D. AI: frontier research and applications** (`ai`): model releases, frontier lab research, safety and policy debates, major funding and M&A, notable incidents. Start with searches such as `AI news <today's date>` and `AI news <yesterday's date>`, then TechCrunch, The Verge, Axios, Reuters tech, Bloomberg tech, MIT Technology Review, the Import AI newsletter, The Batch (deeplearning.ai), and the official OpenAI, Anthropic, Google DeepMind and Meta AI blogs.
- **E. Design & human-AI experience** (`design`): product design, design tools (Figma and others), AI in design, human-AI interaction and HCI research, accessibility, design leadership. Sources: Fast Company Design, It's Nice That, Nielsen Norman Group, UX Collective, the Figma blog, Smashing Magazine, Designer News, ACM Interactions, ACM CHI announcements, the Google PAIR blog.

### How to search

Read the sources above with the web fetch tool. To search across outlets by topic and date, use Google News RSS: `https://news.google.com/rss/search?q=<query>+when:3d&hl=en-US&gl=US&ceid=US:en`. Each `<item>` has a title (ending in " - Outlet"), a link and a `pubDate`. Run several queries per lane.

### Verification (important)

Search results and summaries have mixed up sources and shown old stories as new. Do not rely on one result. For every item you include:
1. Find **at least two independent outlets** reporting the same core fact.
2. Confirm the **publication date is inside the window**, from a dated URL path (for example /2026/11/25/), the date in the title or snippet, the RSS `pubDate`, or a follow-up search with the date.
3. Link a URL whose title or text actually contains the claim.

If you cannot meet 1 and 2, drop the item. Fewer verified items beat more unverified ones. Never invent details to fill a gap. Record notable dropped candidates and the reason.

### Writing

- **Headline:** short, under 12 words, plain (for example "Nvidia to acquire Hugging Face for $12.9B").
- **Body:** a real paragraph of 2 to 4 full sentences (about 40 to 80 words): what happened, concrete numbers and details, and context or why it is notable. The reader should understand the story without clicking through. No fragments.
- **Top 3 for retail:** pick the three items from any lane that matter most for grocery and retail operators and the retail stocks on this screen. For each, add an **angle**: one or two specific sentences on the implication for grocers and retailers (competitive, operational, security, brand and trust, or vendor), and for the listed retail stocks when there is one. Be direct and specific; never write generic "this matters for retailers" filler.
- A lane with nothing material in the window keeps its place with an empty list; the screen shows "Nothing material this window."
- Style: crisp, no emojis, no hype adjectives, numbers over adjectives.
