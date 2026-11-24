/** The user's trading rules, mirrored from skills/user-preference/SKILL.md. Keep both in sync. */
export type RuleGroup = 'Goal' | 'Risk' | 'Profit' | 'Sizing' | 'Timing' | 'Universe' | 'Long-term'

export interface Rule { n: number; group: RuleGroup; title: string; value: string; detail: string; added?: boolean }

export const GOAL_PCT = 10
export const HARD_STOP_PCT = 2
export const MUST_SELL_PCT = 20
export const MAX_PER_STOCK = 1000
export const MAX_POSITIONS = 5
export const MAX_BUYS_PER_DAY = 5
export const DAILY_LOSS_PCT = 2
export const WEEKLY_LOSS_PCT = 5

export const RULES: Rule[] = [
  { n: 1, group: 'Goal', title: 'Overall profit goal', value: '+10%', detail: '$1,000 on the whole $10,000 budget, realized + unrealized since 2026-11-22.' },
  { n: 2, group: 'Sizing', title: 'Budget', value: '$10,000', detail: 'Open positions plus new buys never exceed it.' },
  { n: 3, group: 'Sizing', title: 'Max per stock', value: '$1,000', detail: 'Cap for each purchase and each ticker. Never add past it.' },
  { n: 4, group: 'Risk', title: 'Loss exit', value: '-1% to -2%', detail: 'Sell at -1% if the setup weakens. Hard stop at -2%, no exceptions.' },
  { n: 5, group: 'Profit', title: 'Must sell', value: '> +20%', detail: 'Sell the whole position once its gain is over 20%.' },
  { n: 6, group: 'Timing', title: 'Day trading', value: 'Allowed', detail: 'Buying and selling the same day is fine and preferred.' },
  { n: 7, group: 'Sizing', title: 'Max open positions', value: '5', detail: 'At most $5,000 invested; half the budget stays in cash.', added: true },
  { n: 8, group: 'Sizing', title: 'Max new buys per day', value: '5', detail: 'No more buy calls once a day has 5.', added: true },
  { n: 9, group: 'Risk', title: 'Daily loss limit', value: '-$200 (2%)', detail: 'Hit it: no new buys today, cut the losing positions.', added: true },
  { n: 10, group: 'Risk', title: 'Weekly loss limit', value: '-$500 (5%)', detail: 'Hit it: pause buys until a review and your OK.', added: true },
  { n: 11, group: 'Profit', title: 'Partial profit', value: '½ at +3%', detail: 'Sell half at +3% with the stop at breakeven; stop to +3% at +6%; then trail 3%.', added: true },
  { n: 12, group: 'Timing', title: 'No buys at open or close', value: '15 min', detail: 'No new buys 9:30–9:45 or after 3:45 PM ET. Sells are allowed anytime.', added: true },
  { n: 13, group: 'Timing', title: 'Review before close', value: '4:00 PM ET', detail: 'Close day trades unless they are green with the stop at breakeven or better and nothing is due overnight.', added: true },
  { n: 14, group: 'Risk', title: 'No earnings holds', value: 'Sell before', detail: 'Never hold a position through an earnings report.', added: true },
  { n: 15, group: 'Risk', title: 'No averaging down', value: 'Never', detail: 'Never add to a losing position.', added: true },
  { n: 16, group: 'Universe', title: 'Liquid names only', value: '≥ $5, ≥ 1M vol', detail: 'US stocks and ETFs with tight spreads. No options or penny stocks.', added: true },
  { n: 17, group: 'Profit', title: 'Reward to risk', value: '≥ 1.5', detail: 'With a 2% stop, the first target is at least +3%.', added: true },
  { n: 18, group: 'Goal', title: 'Protect the goal', value: '$500 size', detail: 'At +10%, buy $500 positions. Below +8% after that, no new buys that day.', added: true },
  { n: 19, group: 'Universe', title: 'Cash account', value: 'No margin', detail: 'Buy only with settled cash.', added: true },
  { n: 26, group: 'Long-term', title: 'Hidden jewels', value: '$300M–$20B', detail: 'Profitable, few analysts, ROIC ≥ 12%, FCF yield ≥ 4%, PEG < 1.5, low debt. No hype names.', added: true },
  { n: 27, group: 'Long-term', title: 'Entry and thesis', value: '> 200-day', detail: 'Above the 200-day average, or near a 52-week low with insiders buying. One-line thesis.', added: true },
  { n: 28, group: 'Long-term', title: 'Long stop', value: '-8% to -10%', detail: 'Or a weekly close under the 200-day average. Replaces the 2% stop for long holds.', added: true },
  { n: 29, group: 'Long-term', title: 'Long size', value: '1.5× cap', detail: 'Up to $1,500 a position; the long bucket stays under 40% of the budget. Buy in two parts.', added: true },
  { n: 30, group: 'Long-term', title: 'Earnings', value: 'May hold', detail: 'Hold through earnings while the thesis is intact; exit if the report breaks it.', added: true },
  { n: 31, group: 'Long-term', title: 'Long profit', value: '⅓ at +30%', detail: 'No forced sale at +20%. Sell a third at +30%, trail the rest 15%.', added: true },
  { n: 32, group: 'Long-term', title: 'Long positions', value: '4', detail: 'Counted apart from the 5 trade positions.', added: true },
  { n: 33, group: 'Long-term', title: 'Weekly check', value: 'Weekly', detail: 'And after each earnings report: thesis true, stop safe, size under the cap.', added: true },
]

export const GROUP_COLOR: Record<RuleGroup, string> = {
  Goal: '#3b82f6', Risk: '#d64545', Profit: '#2e9e5b', Sizing: '#8b5cf6', Timing: '#e0a030', Universe: '#7a8794', 'Long-term': '#0f9d9a',
}
