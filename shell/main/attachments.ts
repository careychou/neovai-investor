import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Attachment } from 'neovai-kernel/cards/agent-loop'
import type { RunInput } from 'neovai-kernel/cards/live-ui'

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

/** Writes an attached file to records/attachments/ (never published) and returns its workspace-relative path. */
export function saveAttachment(workspace: string, name: string, data: string): string {
  const bytes = Buffer.from(data, 'base64')
  if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error(`${name} is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`)
  const safe = path.basename(name).replace(/[^\w.-]/g, '_').slice(-120) || 'file'
  const rel = path.posix.join('records', 'attachments', `${randomUUID().slice(0, 8)}-${safe}`)
  fs.mkdirSync(path.join(workspace, 'records', 'attachments'), { recursive: true })
  fs.writeFileSync(path.join(workspace, rel), bytes)
  return rel
}

const NATIVE = new Set(['image', 'pdf', 'pages'])

/**
 * Takes files a screen read with `readAttachments` (images, PDFs, scanned pages) out of `input.attachments`, so they go
 * to the runtime model with the run's first message, the way a chat sends them. The input keeps each file's name, kind
 * and saved path instead, so the run report never holds the contents. Text a screen read itself stays in the input.
 */
export function splitRunInput(input: RunInput | undefined): { input: RunInput | undefined; attachments: Attachment[] } {
  const list = input && typeof input === 'object' ? (input as Record<string, unknown>).attachments : undefined
  if (!Array.isArray(list) || !list.some((a) => NATIVE.has(a?.kind))) return { input, attachments: [] }
  const attachments = list.filter((a) => NATIVE.has(a?.kind)) as Attachment[]
  const kept = list.map((a) => (NATIVE.has(a?.kind) ? { name: a.name, kind: a.kind, sent: 'with the message', ...(a.path ? { path: a.path } : {}) } : a))
  return { input: { ...(input as Record<string, unknown>), attachments: kept } as RunInput, attachments }
}
