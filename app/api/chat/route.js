import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { messages, findings, maintenance } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const systemPrompt = `You are VoltHawk AI, an expert transmission line inspection analyst. You have analyzed drone footage and found the following inspection data:

<findings>
${JSON.stringify(findings, null, 2)}
</findings>

<maintenance_history>
${JSON.stringify(maintenance, null, 2)}
</maintenance_history>

Rules:
- Be concise. Use bullet points.
- Always reference specific finding IDs and timestamps.
- When asked about priorities, rank by severity then by marengo_score.
- When asked about NERC compliance, reference the specific regulation for each finding.
- When asked about risk/cost, use: vegetation contact=$2-8M, insulator failure=$500K-2M, structural failure=$5-15M per incident.
- When generating work orders, format as: Priority | Finding ID | Location (timestamp) | Action | Deadline`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.error?.message || `Anthropic API error (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
