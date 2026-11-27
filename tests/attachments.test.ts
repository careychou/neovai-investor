import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { saveAttachment, splitRunInput } from '../shell/main/attachments'

describe('attachments', () => {
  it('keeps a file under records/attachments with a safe name', () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'nv-att-'))
    const rel = saveAttachment(ws, '../my report (1).pdf', Buffer.from('hello').toString('base64'))
    expect(rel).toMatch(/^records\/attachments\/[0-9a-f]{8}-my_report__1_\.pdf$/)
    expect(fs.readFileSync(path.join(ws, rel), 'utf8')).toBe('hello')
  })

  it('sends images and PDFs with the run message and keeps only names in the input', () => {
    const img = { kind: 'image', name: 'a.png', dataUrl: 'data:image/png;base64,AA', width: 1, height: 1, path: 'records/attachments/x-a.png' }
    const txt = { kind: 'text', name: 'n.csv', text: 'a,b' }
    const r = splitRunInput({ ticker: 'AAPL', attachments: [img, txt] } as never)
    expect(r.attachments).toEqual([img])
    expect((r.input as any).attachments).toEqual([{ name: 'a.png', kind: 'image', sent: 'with the message', path: img.path }, txt])
    expect((r.input as any).ticker).toBe('AAPL')
  })

  it('leaves an input without files alone', () => {
    const input = { ticker: 'MSFT' } as never
    expect(splitRunInput(input)).toEqual({ input, attachments: [] })
  })
})
