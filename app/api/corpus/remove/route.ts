import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'

interface UploadEntry {
  name: string
  size: number
  mtime: number
  type: 'txt'|'pdf'
  status?: string
  prepared_at?: number
  indexed_at?: number
  removed_at?: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name || '')
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    const root = process.cwd()
    const inputDir = path.join(root, 'input')
    const p = path.join(inputDir, name)
    // Remove original
    await fs.rm(p, { force: true })
    // Attempt to remove derived .txt if original was PDF
    if (name.toLowerCase().endsWith('.pdf')) {
      const txt = name.replace(/\.pdf$/i, '.txt')
      await fs.rm(path.join(inputDir, txt), { force: true })
    }
    // Update uploads registry
    const uploadsPath = path.join(root, 'output', 'uploads.json')
    const raw = await fs.readFile(uploadsPath, 'utf-8').catch(() => '[]')
    const parsed = JSON.parse(raw) as unknown
    const reg: UploadEntry[] = Array.isArray(parsed) ? parsed as UploadEntry[] : []
    const idx = reg.findIndex((r) => r.name === name)
    if (idx >= 0) {
      reg[idx].status = 'removed'
      reg[idx].removed_at = Date.now()
    }
    await fs.mkdir(path.dirname(uploadsPath), { recursive: true })
    await fs.writeFile(uploadsPath, JSON.stringify(reg, null, 2))
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to remove'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
