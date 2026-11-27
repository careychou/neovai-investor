/** Retail segments and the tickers the Retail screen prices live. Keep in step with the retail-scan skill. */
export interface Segment { key: string; name: string; tickers: string[]; blurb: string }

export const SEGMENTS: Segment[] = [
  { key: 'grocery', name: 'Grocery', tickers: ['KR', 'ACI', 'SFM', 'GO', 'WMK'], blurb: 'Supermarkets' },
  { key: 'bigbox', name: 'Big box & clubs', tickers: ['WMT', 'COST', 'TGT', 'BJ', 'PSMT'], blurb: 'Supercenters and warehouse clubs' },
  { key: 'discount', name: 'Discount & dollar', tickers: ['DG', 'DLTR', 'OLLI', 'TJX', 'ROST', 'BURL'], blurb: 'Dollar stores and off-price' },
  { key: 'staples', name: 'Consumer staples', tickers: ['PG', 'KO', 'PEP', 'MDLZ', 'GIS', 'CL', 'KMB', 'CHD', 'HSY'], blurb: 'Makers of food, drinks and household goods' },
  { key: 'home', name: 'Home improvement', tickers: ['HD', 'LOW', 'TSCO'], blurb: 'Home and farm stores' },
  { key: 'online', name: 'Online & department', tickers: ['AMZN', 'CHWY', 'M', 'KSS', 'DDS'], blurb: 'E-commerce and department stores' },
  { key: 'etf', name: 'Sector funds', tickers: ['XRT', 'XLP', 'XLY'], blurb: 'Retail, staples and discretionary ETFs' },
]

export const segmentName = (key: unknown) => SEGMENTS.find((s) => s.key === key)?.name ?? (typeof key === 'string' && key ? key : 'Other')

export const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
