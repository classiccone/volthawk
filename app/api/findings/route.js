import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const filePath = path.join(process.cwd(), 'data', 'findings.json')

export async function GET() {
  try {
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    // Support both formats: bare array (legacy) and { findings, videoName, analysisDate }
    if (Array.isArray(data)) {
      return data.length > 0
        ? NextResponse.json({ findings: data })
        : NextResponse.json({ findings: [] })
    }
    if (data.findings?.length > 0) {
      return NextResponse.json(data)
    }
    return NextResponse.json({ findings: [] })
  } catch {
    return NextResponse.json({ findings: [] })
  }
}

export async function POST(request) {
  try {
    const { findings, videoName, analysisDate } = await request.json()
    await writeFile(filePath, JSON.stringify({ findings, videoName, analysisDate }, null, 2))
    return NextResponse.json({ saved: findings.length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
