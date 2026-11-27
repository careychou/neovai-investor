// Codify's own reader for attached files (kernel chat-view `prepareAttachment`): PDFs go to the model natively,
// as text, or as page images when scanned; Word, PowerPoint, Excel and HTML become text. Every file is also kept
// in the workspace's records/attachments/ so the agent can read it again with its tools (the attachment's `path`).
import { ATTACH_LIMITS, classify, clipText, fitSize, pdfAttachment, type Attachment, type Item } from 'neovai-kernel/cards/chat-view'
import { readFiles, type PrepareAttachment } from 'neovai-kernel/cards/chat-view/react'

const ext = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? ''

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Saves the original; a failure only means the model can't reopen the file, so the attachment still goes. */
async function keep(name: string, b64: string): Promise<string | undefined> {
  try { return await window.api.saveAttachment(name, b64) } catch { return undefined }
}

async function readPdf(name: string, bytes: Uint8Array, path?: string): Promise<Attachment> {
  const { getDocumentProxy, extractText, renderPageAsImage } = await import('unpdf')
  const doc = await getDocumentProxy(bytes.slice())
  const { text } = await extractText(doc, { mergePages: false })
  const pageTexts = Array.isArray(text) ? text : [text]
  const own = pdfAttachment({ name, data: toBase64(bytes), size: bytes.length, pageTexts, ...(path ? { path } : {}) })
  if (own) return own
  // Scanned: one image per page, so a vision model can read it.
  const total = doc.numPages
  const pages: { dataUrl: string; width: number; height: number }[] = []
  for (let n = 1; n <= Math.min(total, ATTACH_LIMITS.pdfMaxPages); n++) {
    const vp = (await doc.getPage(n)).getViewport({ scale: 1 })
    const size = fitSize(vp.width * 2, vp.height * 2)
    const dataUrl = await renderPageAsImage(doc, n, { width: size.width, format: 'jpeg', quality: 0.85, toDataURL: true })
    pages.push({ dataUrl, ...size })
  }
  return { kind: 'pages', name, pages, total, ...(path ? { path } : {}) }
}

// ---- Office files: a minimal zip reader (deflate via the browser's DecompressionStream) ----
async function unzip(buf: ArrayBuffer, want: RegExp): Promise<Map<string, string>> {
  const v = new DataView(buf), u8 = new Uint8Array(buf), out = new Map<string, string>(), dec = new TextDecoder()
  let eocd = -1
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('not a valid Office file')
  let p = v.getUint32(eocd + 16, true)
  for (let k = v.getUint16(eocd + 10, true); k > 0; k--) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true)
    const nl = v.getUint16(p + 28, true), off = v.getUint32(p + 42, true)
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl))
    p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true)
    if (!want.test(name)) continue
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true)
    const raw = u8.slice(start, start + size)
    if (method === 0) out.set(name, dec.decode(raw))
    else if (method === 8) out.set(name, await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text())
  }
  return out
}
const xml = (s?: string) => (s ? new DOMParser().parseFromString(s, 'application/xml') : null)
const tags = (n: Document | Element | null, t: string) => (n ? Array.from(n.getElementsByTagName(t)) : [])
const texts = (n: Element, t: string) => tags(n, t).map((x) => x.textContent ?? '').join('')
const num = (s: string) => Number(/(\d+)\.xml$/.exec(s)?.[1] ?? 0)

async function docx(buf: ArrayBuffer): Promise<string> {
  const body = tags(xml((await unzip(buf, /^word\/document\.xml$/)).get('word/document.xml')), 'w:body')[0]
  if (!body) throw new Error('no document text found')
  const out: string[] = []
  for (const el of Array.from(body.children)) {
    if (el.tagName === 'w:p') { const t = texts(el, 'w:t').trim(); if (t) out.push(t) }
    else if (el.tagName === 'w:tbl') for (const tr of tags(el, 'w:tr')) out.push(tags(tr, 'w:tc').map((tc) => texts(tc, 'w:t').trim()).join('\t'))
  }
  return out.join('\n')
}

async function pptx(buf: ArrayBuffer): Promise<string> {
  const f = await unzip(buf, /^ppt\/slides\/slide\d+\.xml$/)
  const slides = [...f.keys()].sort((a, b) => num(a) - num(b))
  if (!slides.length) throw new Error('no slides found')
  return slides.map((k) => [`## Slide ${num(k)}`, ...tags(xml(f.get(k)), 'a:p').map((p) => texts(p, 'a:t').trim()).filter(Boolean)].join('\n')).join('\n\n')
}

async function xlsx(buf: ArrayBuffer): Promise<string> {
  const f = await unzip(buf, /^xl\/(workbook\.xml|sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/)
  const shared = tags(xml(f.get('xl/sharedStrings.xml')), 'si').map((si) => texts(si, 't'))
  const names = tags(xml(f.get('xl/workbook.xml')), 'sheet').map((s) => s.getAttribute('name') ?? '')
  const sheets = [...f.keys()].filter((k) => k.startsWith('xl/worksheets/')).sort((a, b) => num(a) - num(b))
  return sheets.map((k, i) => {
    const rows = tags(xml(f.get(k)), 'row').map((r) => tags(r, 'c').map((c) => {
      const t = c.getAttribute('t'), v = tags(c, 'v')[0]?.textContent ?? ''
      return t === 's' ? shared[Number(v)] ?? '' : t === 'inlineStr' ? texts(c, 't') : v
    }).join('\t'))
    return [`## Sheet: ${names[i] || `Sheet ${i + 1}`}`, ...rows].join('\n')
  }).join('\n\n')
}

function html(s: string): string {
  const doc = new DOMParser().parseFromString(s, 'text/html')
  doc.querySelectorAll('script,style,noscript,svg,template').forEach((n) => n.remove())
  return (doc.body?.innerText ?? doc.body?.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

const OFFICE: Record<string, (b: ArrayBuffer) => Promise<string>> = { docx, pptx, xlsx, xlsm: xlsx }

/**
 * PDFs and Office/HTML files are read here; images and plain text are left to the kernel's reader,
 * which this wraps only to add the saved file's `path`.
 */
export const prepareAttachment: PrepareAttachment = async (file) => {
  const name = file.name || 'pasted'
  const e = ext(name)
  const own = e === 'pdf' || file.type === 'application/pdf' || !!OFFICE[e] || e === 'html' || e === 'htm'
  if (['doc', 'ppt', 'xls'].includes(e)) throw new Error(`old .${e} files can't be read; save it as .${e}x and attach again`)
  if (!own && !classify(name, file.type)) return null
  const bytes = new Uint8Array(await file.arrayBuffer())
  const path = await keep(name, toBase64(bytes))
  if (e === 'pdf' || file.type === 'application/pdf') return readPdf(name, bytes, path)
  let text: string | null = null
  if (OFFICE[e]) text = await OFFICE[e](bytes.buffer)
  else if (e === 'html' || e === 'htm') text = html(new TextDecoder().decode(bytes))
  if (text !== null) {
    const t = clipText(text)
    return { kind: 'text', name, text: t.text, ...(t.note ? { note: t.note } : {}), ...(path ? { path } : {}) }
  }
  if (!path) return null
  // Images and text files: the kernel reads them; add the path afterwards.
  const { attachments, skipped } = await readFiles([file])
  if (skipped.length) throw new Error(skipped[0].replace(/^[^:]*:\s*/, ''))
  return attachments.map((a) => ({ ...a, path }))
}

/**
 * The same reader for workspace screens (panel prop `readAttachments`): a screen that starts a run passes what it
 * returns in the run input's `attachments`, and the shell sends images, PDFs and scanned pages with the run's message.
 */
export const readAttachments = (files: File[]) => readFiles(files, prepareAttachment)

/** File names to show in the user's message for attachments that are not image thumbnails. */
export const attachedFiles = (atts: Attachment[]) => atts.flatMap((a) => (a.kind === 'image' ? [] : [a.name]))

// Context memory adds these to saved chats; the kernel card's helpers live with its Node-only store, so the patterns are here.
const HINTS_RE = /\s*<recall_hints>[\s\S]*?<\/recall_hints>/g
const COMPACT_TAG = '<compacted_history>'
const COMPACT_ACK = /^Understood\. I have the summary of the earlier conversation/

/** Chat items for display: drops the recall hints added after prompts and shows a compaction summary as one short note. */
export function memoryView(items: Item[]): Item[] {
  const out: Item[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (it.kind === 'user' && it.text.startsWith(COMPACT_TAG)) {
      out.push({ kind: 'assistant', text: '_Earlier turns of this chat were summarized to keep it short. Codify can still look them up._' })
      if (items[i + 1]?.kind === 'assistant' && COMPACT_ACK.test((items[i + 1] as { text: string }).text)) i++
      continue
    }
    out.push(it.kind === 'user' && it.text.includes('<recall_hints>') ? { ...it, text: it.text.replace(HINTS_RE, '').trim() } : it)
  }
  return out
}
