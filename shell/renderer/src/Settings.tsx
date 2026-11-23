import { useEffect, useState } from 'react'
import type { AppInfo, ModelGroup, AppSettings as S } from '../../shared/api'

type Provider = S['providers'][number]
const KINDS: { id: Provider['kind']; label: string }[] = [
  { id: 'openai', label: 'OpenAI-compatible' },
  { id: 'azure', label: 'Azure OpenAI' },
  { id: 'vertex', label: 'Google Vertex AI' }
]
const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export default function Settings({ info }: { info: AppInfo | null }) {
  const [s, setS] = useState<S | null>(null)
  const [groups, setGroups] = useState<ModelGroup[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [encrypted, setEncrypted] = useState<boolean | null>(null)

  const loadModels = async () => {
    setLoading(true)
    try { setGroups(await window.api.listModels()) } catch { setGroups([]) }
    setLoading(false)
  }
  // The OS key store can block while it shows a prompt, so it is asked only once a key is entered, never on open.
  const askEncrypted = () => { if (encrypted === null) window.api.secretsEncrypted().then(setEncrypted).catch(() => {}) }
  useEffect(() => {
    window.api.getSettings().then(setS)
    loadModels()
  }, [])

  if (!s) return <div className="settings"><p className="muted">Loading…</p></div>

  const patch = (i: number, p: Partial<Provider>) =>
    setS({ ...s, providers: s.providers.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const add = () =>
    setS({ ...s, providers: [...s.providers, { id: `p${Date.now().toString(36)}`, name: 'New provider', kind: 'openai', baseUrl: '', apiKey: '' }] })
  const remove = (i: number) => setS({ ...s, providers: s.providers.filter((_, j) => j !== i) })

  const save = async () => {
    setNote('Saving…')
    try {
      await window.api.saveSettings(s)
      setS(await window.api.getSettings())
      await loadModels()
      setNote('Saved.')
    } catch (e) {
      setNote(`Could not save: ${String((e as Error)?.message ?? e)}`)
    }
  }

  const known = groups.flatMap((g) => g.models)
  const models = (cur: string) => (
    <>
      {cur && !known.includes(cur) && <option value={cur}>{cur}</option>}
      {groups.map((g) => (
        <optgroup key={g.provider} label={g.name}>
          {g.models.map((m) => <option key={m} value={m}>{m}</option>)}
        </optgroup>
      ))}
    </>
  )

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="settings">
      <h1>Settings</h1>


      <h2>Model providers</h2>
      {encrypted === false && <p className="error">This computer cannot encrypt saved keys, so they are stored as plain text.</p>}
      {s.providers.map((p, i) => (
        <div key={p.id} className="provider">
          <div className="row">
            <Field label="Name"><input value={p.name} onChange={(e) => patch(i, { name: e.target.value })} /></Field>
            <Field label="Type">
              <select value={p.kind} onChange={(e) => patch(i, { kind: e.target.value as Provider['kind'] })}>
                {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </Field>
            <label className="check"><input type="checkbox" checked={p.enabled !== false} onChange={(e) => patch(i, { enabled: e.target.checked })} /> Enabled</label>
            <button className="x" title="Remove provider" onClick={() => remove(i)}>×</button>
          </div>
          {p.kind !== 'vertex' && (
            <div className="row">
              <Field label={p.kind === 'azure' ? 'Resource URL' : 'Base URL'}><input value={p.baseUrl} placeholder={p.kind === 'azure' ? 'https://<resource>.openai.azure.com' : 'http://localhost:4000/v1'} onChange={(e) => patch(i, { baseUrl: e.target.value })} /></Field>
              <Field label="API key"><input type="password" value={p.apiKey} onFocus={askEncrypted} onChange={(e) => patch(i, { apiKey: e.target.value })} /></Field>
            </div>
          )}
          {p.kind === 'azure' && (
            <div className="row">
              <Field label="API version"><input value={p.apiVersion ?? ''} onChange={(e) => patch(i, { apiVersion: e.target.value })} /></Field>
              <Field label="Deployments (one per line)"><textarea rows={2} value={(p.deployments ?? []).join('\n')} onChange={(e) => patch(i, { deployments: lines(e.target.value) })} /></Field>
            </div>
          )}
          {p.kind === 'vertex' && (
            <>
              <div className="row">
                <Field label="Project"><input value={p.project ?? ''} onChange={(e) => patch(i, { project: e.target.value })} /></Field>
                <Field label="Location"><input value={p.location ?? ''} placeholder="global" onChange={(e) => patch(i, { location: e.target.value })} /></Field>
                <Field label="Service-account key file (optional)"><input value={p.credentialsPath ?? ''} onChange={(e) => patch(i, { credentialsPath: e.target.value })} /></Field>
              </div>
              <Field label="Models (one per line, publisher/model)"><textarea rows={3} value={(p.models ?? []).join('\n')} onChange={(e) => patch(i, { models: lines(e.target.value) })} /></Field>
            </>
          )}
          {groups.find((g) => g.provider === p.id)?.error && <p className="error small">{groups.find((g) => g.provider === p.id)!.error}</p>}
        </div>
      ))}
      <button onClick={add}>Add provider</button>

      <h2>Agent</h2>
      <div className="row">
        <Field label={loading ? 'Codify model (loading…)' : 'Codify model'}>
          <select value={s.defaultModel} onChange={(e) => setS({ ...s, defaultModel: e.target.value })}>
            <option value="">Choose a model</option>
            {models(s.defaultModel)}
          </select>
        </Field>
        <Field label="Runtime agent model (runs jobs)">
          <select value={s.runtimeModel ?? ''} onChange={(e) => setS({ ...s, runtimeModel: e.target.value })}>
            <option value="">Same as Codify{s.defaultModel ? ` (${s.defaultModel})` : ''}</option>
            {models(s.runtimeModel ?? '')}
          </select>
        </Field>
      </div>
      <div className="row">
        <Field label="Reasoning">
          <select value={s.reasoning} onChange={(e) => setS({ ...s, reasoning: e.target.value as S['reasoning'] })}>
            {['off', 'low', 'medium', 'high'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Most steps per run"><input type="number" min="1" value={s.maxTurnsMain} onChange={(e) => setS({ ...s, maxTurnsMain: Math.max(1, num(e.target.value)) })} /></Field>
      </div>
      <p className="muted small">Reasoning and steps apply to both agents. Save first to load the model list for a new provider.</p>

      <h2>Publish</h2>
      <Field label="Repository folder (the publish button copies the workspace into its workspace/ folder, then commits and pushes)">
        <input value={s.publishRepo ?? ''} placeholder="/Users/you/projects/neovai-investor" onChange={(e) => setS({ ...s, publishRepo: e.target.value.trim() })} />
      </Field>
      <p className="muted small">Run records and your preferences (goals.json) are left out.</p>

      <div className="savebar">
        <button className="primary" onClick={save}>Save</button>
        <span className="muted small">{note}</span>
      </div>
      {info && <p className="muted small">Workspace: {info.workspace}</p>}
    </div>
  )
}
