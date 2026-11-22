interface Market { date?: string; mood?: string }

/** The market mood as a banner: green when risk-on, red when risk-off. */
export default function Today({ data }: { data: Record<string, any> }) {
  const m: Market = data?.market ?? {}
  if (!m.mood) return <p className="lu-empty">No scan yet. Run the market scan.</p>
  const tone = /risk-off/i.test(m.mood) ? 'bad' : /risk-on/i.test(m.mood) ? 'good' : 'warn'
  return <div className={`lu-alert lu-${tone}`} style={{ fontSize: 15 }}><b>Mood</b> · {m.mood}{m.date ? <span className="lu-conf"> {m.date}</span> : null}</div>
}
