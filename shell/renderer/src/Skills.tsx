import { useCallback, useEffect, useState } from 'react'
import type { ScreenState, SkillInfo, SkillText } from '../../shared/api'
import { SkillList } from 'neovai-kernel/cards/skills/react'
import { screenAsk } from './Codify'
import Markdown from './Markdown'

const LEARN = 'Look at the picks I accepted and declined (records/data/decisions.json) and how past picks did (records/data/review.json and the Outcome sections in records/). Tell me what patterns you see in what I take, what I skip, and what worked. Then propose specific changes to the skills, each with the reason and the evidence. Make a change only after I agree.'

/** Every skill the app uses: the workspace's own (edit here or with Codify) and shared ones (read-only). */
export default function Skills({ open, screens, tick, onCodify }: { open?: { name: string; at: number } | null; screens: ScreenState[]; tick: number; onCodify(prompt: string): void }) {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [viewing, setViewing] = useState<SkillText | null>(null)
  const [edit, setEdit] = useState<string | null>(null)
  const [error, setError] = useState('')

  const show = useCallback(async (name: string) => { setEdit(null); setError(''); setViewing(await window.api.readSkill(name)) }, [])
  // Codify or a run may change skills at any time; refresh the list and the open skill (unless being edited).
  useEffect(() => {
    window.api.listSkills().then((l) => {
      setSkills(l)
      if (!viewing && !open && l[0]) void show(l[0].name)
    }).catch(() => {})
    if (viewing && edit === null) window.api.readSkill(viewing.name).then((v) => v && setViewing(v))
  }, [tick])
  useEffect(() => { if (open) void show(open.name) }, [open, show])

  const save = async () => {
    if (!viewing || edit === null) return
    try { await window.api.saveSkill(viewing.name, edit); setEdit(null); await show(viewing.name) } catch (e) { setError(String((e as Error)?.message ?? e)) }
  }
  const screensOf = (skill: string) => screens.filter((s) => s.screen?.skills?.includes(skill))

  return (
    <div className="chat">
      <aside className="chatlist">
        <button className="primary" title="Codify reads your accepted and declined picks and the performance review, then proposes skill changes" onClick={() => onCodify(LEARN)}>Improve skills from my picks</button>
        <SkillList skills={skills} active={viewing?.name} onOpen={(n) => void show(n)} sourceTitles={{ Workspace: 'This app' }} />
      </aside>
      <section className="thread">
        {viewing ? (
          <div className="skillview">
            <div className="skillviewhead">
              <b>{viewing.name}</b>
              <span className="muted small" title={viewing.path}>{viewing.path}</span>
              {!viewing.editable && <span className="badge" title="A shared skill: this app uses it but cannot change it">read-only</span>}
              <span className="grow" />
              {edit !== null ? (
                <>
                  <button className="primary" onClick={() => void save()}>Save</button>
                  <button onClick={() => { setEdit(null); setError('') }}>Cancel</button>
                </>
              ) : viewing.editable && (
                <>
                  {screensOf(viewing.name).map((s) => (
                    <button key={s.name} title={`Change how the ${s.title} screen shows this skill's results`} onClick={() => onCodify(screenAsk({ screen: s.name, title: s.title }))}>Change the {s.title} screen</button>
                  ))}
                  <button onClick={() => setEdit(viewing.text)}>Edit</button>
                  <button className="primary" onClick={() => onCodify(`Change the ${viewing.name} skill: `)}>Change with Codify</button>
                </>
              )}
            </div>
            {error && <div className="error">{error}</div>}
            {edit !== null
              ? <textarea className="skilledit" value={edit} onChange={(e) => setEdit(e.target.value)} spellCheck={false} aria-label="Skill text" />
              : <div className="skillviewbody"><Markdown text={viewing.text.replace(/^---[\s\S]*?\n---\n/, '')} /></div>}
          </div>
        ) : <p className="muted empty">No skill selected.</p>}
      </section>
    </div>
  )
}
