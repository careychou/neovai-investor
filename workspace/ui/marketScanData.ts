// Written by the `market-scan` skill after each scan. Do not edit by hand.
// Set to null when no scan has run yet. Only fetched numbers go here; missing ones are null.
import type { MarketScan } from '../logic/marketScan'

export const latestScan: MarketScan | null = {
  asOf: '2026-11-22T18:25:03Z',
  mood: {
    label: 'risk-off',
    reason:
      "S&P 500 and Dow closed Friday in correction (10% off highs), Nasdaq turned negative for 2026, VIX above 35 and money fled to Treasuries and defensive stocks. Sunday scan: figures are Friday Nov 20 closes.",
  },
  metrics: [
    { item: 'S&P 500', value: '6,910.39', change: '-3.70%', source: 'CNBC market wrap', time: '2026-11-20 4:17 PM ET close' },
    { item: 'Nasdaq Composite', value: '22,617.73', change: '-5.28%', source: 'CNBC market wrap', time: '2026-11-20 4:17 PM ET close' },
    { item: 'Dow Jones', value: '48,147.33', change: '-1.93%', source: 'CNBC market wrap', time: '2026-11-20 4:17 PM ET close' },
    { item: 'Russell 2000', value: '2,581.79', change: '-2.76%', source: 'CNBC quote .RUT (delayed)', time: '2026-11-20 close' },
    { item: 'VIX', value: '35.89', change: '+26.20%', source: 'CNBC quote .VIX', time: '2026-11-20 close' },
    { item: '10Y Treasury', value: '4.95%', change: '-0.102 pts', source: 'CNBC quote US10Y', time: '2026-11-20 5:05 PM ET' },
    { item: 'WTI crude', value: '$83.98', change: '+0.93%', source: 'CNBC market live blog', time: '2026-11-20 settle' },
    { item: 'Brent crude', value: '$92.57', change: '+0.64%', source: 'CNBC market live blog', time: '2026-11-20 3:10 PM ET' },
  ],
  alerts: [
    {
      severity: 'high',
      kind: 'news',
      title: 'S&P 500 and Dow enter correction; Nasdaq-100 hits bear market intraday',
      detail:
        "Worst week for the Dow since March 2020 (-8%), S&P -8.6%, Nasdaq about -10%. All three indexes are below their 200-day averages; BTIG and Capital Economics both say the sell-off may have further to run, so expect large swings Monday.",
      source: 'CNBC market wrap',
      time: '2026-11-20 6:46 PM ET',
    },
    {
      severity: 'high',
      kind: 'news',
      title: 'Reuters: SEC examining possible accounting issues at Nvidia',
      detail:
        "Nvidia fell about 14% Friday and has lost 33% in November, its seventh straight losing week. As the largest AI stock, any further news here can drag the whole Nasdaq and chip sector.",
      tickers: ['NVDA', 'AMD', 'MU'],
      source: 'CNBC / Reuters',
      time: '2026-11-20 2:26 PM ET',
    },
    {
      severity: 'high',
      kind: 'macro',
      title: 'Fed rate hike expected at Dec 8-9 meeting',
      detail:
        "Futures price about a 92% chance of a quarter-point hike (CME FedWatch). Governor Waller says a half-point may be needed and Governor Cook warns of falling behind on inflation. Higher rates pressure stock valuations, especially tech.",
      source: 'CNBC (CME FedWatch)',
      time: '2026-11-20',
    },
    {
      severity: 'high',
      kind: 'mover',
      title: 'Anthropic gives back IPO gains on first full trading day',
      detail:
        "Down 8.5% Friday after a 17% debut jump Thursday, touching $83.05 intraday. The weak follow-through triggered profit-taking across AI stocks. Seaport started coverage at neutral.",
      tickers: ['ANT'],
      source: 'CNBC',
      time: '2026-11-20',
    },
    {
      severity: 'medium',
      kind: 'mover',
      title: 'AI "picks and shovels" crushed',
      detail:
        "Micron about -14%, Sandisk -14%, CoreWeave -11%, Western Digital and Bloom Energy more than -12%. These are high-beta names: avoid new buys until selling eases.",
      tickers: ['MU', 'SNDK', 'CRWV', 'WDC', 'BE'],
      source: 'CNBC stocks moving',
      time: '2026-11-20 11:58 AM ET',
    },
    {
      severity: 'medium',
      kind: 'news',
      title: 'Trump wants to ban US companies from building data centers abroad',
      detail:
        "Threatens penalties for overseas data centers. Adds policy uncertainty to cloud and AI infrastructure spending plans.",
      source: 'CNBC',
      time: '2026-11-20 1:10 PM ET',
    },
    {
      severity: 'medium',
      kind: 'rating',
      title: 'TD Cowen upgrades UnitedHealth and Humana to buy',
      detail:
        "UNH (target $455, rose about 4%) and HUM (target $485, rose about 3%) on stronger 2027-28 Medicare Advantage earnings. Healthcare is acting as a safe haven.",
      tickers: ['UNH', 'HUM'],
      source: 'CNBC',
      time: '2026-11-20',
    },
    {
      severity: 'medium',
      kind: 'earnings',
      title: 'Intuit and Ross Stores fall on weak outlooks',
      detail:
        "Intuit cut its fiscal 2027 revenue outlook on a Credit Karma slowdown (about -8% premarket). Ross fell about 5% on a disappointing forecast.",
      tickers: ['INTU', 'ROST'],
      source: 'CNBC premarket movers',
      time: '2026-11-20 8:12 AM ET',
    },
    {
      severity: 'medium',
      kind: 'mover',
      title: 'Bitcoin breaks below $60,000; crypto stocks slide',
      detail:
        "First time below $60,000 since July. Strategy -6%, Robinhood -6%, Riot more than -8%, Coinbase -3%. Shows risk appetite is falling broadly, not just in AI.",
      tickers: ['MSTR', 'HOOD', 'RIOT', 'COIN'],
      source: 'CNBC',
      time: '2026-11-20 12:09 PM ET',
    },
    {
      severity: 'low',
      kind: 'macro',
      title: 'Consumer sentiment up, inflation expectations fall',
      detail:
        "University of Michigan index 51.5 (as expected, up from 48.0). One-year inflation expectations dropped to 3.7%, the lowest since March. A small offset to Fed hike fears.",
      source: 'CNBC',
      time: '2026-11-20 10:29 AM ET',
    },
    {
      severity: 'low',
      kind: 'news',
      title: 'Thanksgiving week ahead',
      detail:
        "Holiday Thursday Nov 26 means fewer trading days and thinner volume, which can make swings larger. Gas prices are falling into the holiday ($3.69 national average, AAA).",
      source: 'CNBC / AAA',
      time: '2026-11-20 3:10 PM ET',
    },
  ],
  trends: [
    {
      title: 'AI trade repricing',
      direction: 'down',
      why:
        "Slowing data-center capex, Nvidia leadership turmoil and an SEC probe, plus a lukewarm Anthropic IPO, are pulling money out of AI stocks. Tech had its worst week since April 2025.",
      source: 'CNBC',
    },
    {
      title: 'Fed hiking into a sell-off',
      direction: 'down',
      why:
        "A December hike is almost fully priced in and a half-point is possible. If stocks keep falling, the Fed may slow down (LPL), which would be a relief trigger.",
      source: 'CNBC / CME FedWatch',
    },
    {
      title: 'Rotation into defensives and bonds',
      direction: 'up',
      why:
        "Consumer staples (XLP about +2%), Walmart, Costco, J&J, P&G and General Mills rose while the market fell. The 10-year yield dropped to 4.95% on safe-haven buying.",
      source: 'CNBC',
    },
    {
      title: 'Oversold bounce possible but fragile',
      direction: 'mixed',
      why:
        "BTIG notes past six-day losing streaks saw the S&P higher 5 days later, then more downside. Chips are back to April levels where some relief may come, but breadth readings do not yet look like a lasting bottom.",
      source: 'CNBC (BTIG, Wolfe Research)',
    },
    {
      title: 'Oil firm near $84 WTI',
      direction: 'up',
      why:
        "Crude rose Friday even as stocks fell. Gasoline is still 59 cents above last year, which keeps inflation pressure on the Fed.",
      source: 'CNBC / AAA',
    },
  ],
  sectors: {
    leading: ['Consumer staples', 'Healthcare (managed care)', 'Big-box retail'],
    lagging: ['Technology', 'Semiconductors & memory', 'AI infrastructure', 'Crypto-linked'],
  },
  watchList: [
    { ticker: 'XLP', reason: 'Staples ETF led Friday (about +2%) as money hid in defensives.' },
    { ticker: 'WMT', reason: 'Gained more than 1-2% on a down day; defensive retail leader.' },
    { ticker: 'COST', reason: 'Rose with Walmart as a safe-haven retailer.' },
    { ticker: 'PG', reason: 'Defensive staple that rose about 1% in the sell-off.' },
    { ticker: 'JNJ', reason: 'Defensive healthcare that rose about 1%.' },
    { ticker: 'UNH', reason: 'TD Cowen upgrade to buy, named a Best Idea for 2027.' },
    { ticker: 'HUM', reason: 'TD Cowen upgrade to buy, target $485.' },
    { ticker: 'SH', reason: 'Inverse S&P ETF for a small hedge, per the user style in a weak market.' },
    { ticker: 'SOXX', reason: 'Chips back at April levels; watch only for a relief bounce, high risk.' },
    { ticker: 'NVDA', reason: 'Watch only: SEC probe news is the biggest single risk for the market.' },
  ],
}
