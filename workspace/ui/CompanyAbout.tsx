import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Building2, Users } from 'lucide-react'
import { useProfile, useIndustryPeers, fmtCap } from './lib/companyProfile'

type AnyObj = Record<string, unknown>

const muted: CSSProperties = { color: 'var(--muted)', fontSize: 12 }
const box: CSSProperties = { border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginTop: 10 }
const chip: CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, border: '1px solid var(--line)', marginRight: 6, marginTop: 4 }
const str = (v: unknown) => (typeof v === 'string' && v.trim() && !/^no data$/i.test(v.trim()) ? v.trim() : '')

interface SavedCompetitor { ticker?: string; name?: string; note?: string }

/** Plain-English "what they do" from the evaluation, if saved. */
export function savedBusiness(row: AnyObj | null | undefined): string {
  return str(row?.business)
}

/** One short line for a table row: the saved plain-English summary, else the live industry. */
export function CompanyLine({ ticker, row }: { ticker: string; row: AnyObj }) {
  const saved = savedBusiness(row)
  const industry = str(row.industry)
  const { profile } = useProfile(saved && industry ? null : ticker)
  const ind = industry || profile?.industry || ''
  const text = saved || (profile?.description ? profile.description.split(/(?<=\.)\s/)[0] : '')
  if (!text && !ind) return null
  return (
    <div style={{ marginTop: 4, maxWidth: 260, whiteSpace: 'normal' }}>
      {ind && <span style={{ ...chip, marginTop: 0, fontSize: 11, padding: '1px 7px' }}>{ind}</span>}
      {text && <div style={{ ...muted, marginTop: 3, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={text}>{text}</div>}
    </div>
  )
}

/** "About the company" box for the stock detail window: what it does, industry, key facts and competitors. */
export default function CompanyAbout({ ticker, row, onOpenTicker }: { ticker: string; row?: AnyObj | null; onOpenTicker?: (t: string) => void }) {
  const { loading, profile } = useProfile(ticker)
  const peers = useIndustryPeers(profile)
  const [more, setMore] = useState(false)
  const business = savedBusiness(row)
  const saved: SavedCompetitor[] = Array.isArray(row?.competitors) ? (row!.competitors as SavedCompetitor[]).filter((c) => c && (c.ticker || c.name)) : []
  const industry = str(row?.industry) || profile?.industry
  const desc = profile?.description ?? ''
  const short = desc.length > 420 && !more ? `${desc.slice(0, 400).replace(/\s+\S*$/, '')}…` : desc
  const facts: [string, string | undefined][] = [
    ['Sector', profile?.sector], ['Founded', profile?.founded], ['Employees', profile?.employees], ['CEO', profile?.ceo],
  ]

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
        <Building2 size={14} /> About the company
        {industry && <span style={{ ...chip, marginTop: 0, marginLeft: 6, fontWeight: 500 }}>{industry}</span>}
      </div>

      {business && <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.45 }}><b>In plain words: </b>{business}</div>}

      {loading && !desc && <div style={{ ...muted, marginTop: 8 }}>Loading the company profile…</div>}
      {!loading && !profile && !business && <div style={{ ...muted, marginTop: 8 }}>Couldn't load the company profile right now.</div>}
      {short && (
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {short}
          {desc.length > 420 && <button onClick={() => setMore(!more)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--accent)', marginLeft: 6, fontSize: 12 }}>{more ? 'Show less' : 'Read more'}</button>}
        </div>
      )}

      {facts.some(([, v]) => v) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: 8, fontSize: 12 }}>
          {facts.filter(([, v]) => v).map(([k, v]) => <span key={k}><span style={muted}>{k} </span>{v}</span>)}
          {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{profile.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12.5 }}><Users size={13} /> Competitors</div>
        {saved.length > 0 ? (
          <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
            {saved.map((c, i) => (
              <div key={`${c.ticker}-${i}`} style={{ fontSize: 13 }}>
                {c.ticker && <PeerTicker t={c.ticker} onOpen={onOpenTicker} />} {c.name && <span>{c.name}</span>}
                {c.note && <span style={muted}> · {c.note}</span>}
              </div>
            ))}
            <div style={muted}>Picked by the candidate evaluation.</div>
          </div>
        ) : (
          <div style={{ ...muted, marginTop: 4 }}>No competitor list saved yet. It will appear after the next “Evaluate candidates”.</div>
        )}

        {peers.peers.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...muted, marginBottom: 4 }}>Same industry, closest in size ({peers.total} listed in {profile?.industry}):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {peers.peers.map((p) => (
                <span key={p.ticker} style={{ ...chip, marginTop: 0, marginRight: 0 }} title={p.name}>
                  <PeerTicker t={p.ticker} onOpen={onOpenTicker} /> <span style={muted}>{p.name.replace(/,? (Inc|Corp|Corporation|Ltd|plc|Holdings|Co)\.?$/i, '').slice(0, 32)} · {fmtCap(p.marketCap)}</span>
                </span>
              ))}
            </div>
            <div style={{ ...muted, marginTop: 4 }}>Listed by industry and size, so some may not compete directly.</div>
          </div>
        )}
        {peers.loading && <div style={{ ...muted, marginTop: 6 }}>Finding companies in the same industry…</div>}
      </div>

      {profile && <div style={{ ...muted, marginTop: 8 }}>{profile.source}</div>}
    </div>
  )
}

function PeerTicker({ t, onOpen }: { t: string; onOpen?: (t: string) => void }) {
  if (!onOpen) return <b>{t}</b>
  return <button onClick={() => onOpen(t)} title={`Open ${t}`} style={{ all: 'unset', cursor: 'pointer', fontWeight: 700, borderBottom: '1px dashed var(--muted)' }}>{t}</button>
}
