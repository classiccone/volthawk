# ⚡ VoltHawk — AI-Powered Transmission Line Inspection

The grid's eye in the sky. Automated drone inspection for transmission reliability.

## What it does
VoltHawk processes drone footage of transmission lines through TwelveLabs Marengo 3.0 and Pegasus 1.2 via AWS Bedrock to automatically detect insulator damage, vegetation encroachment, and structural corrosion — scored against NERC FAC-003-4, FAC-501-3, and NESC Rule 215 compliance thresholds.

## Architecture
Video Upload → S3 → Marengo 3.0 (embeddings) → Cosine Similarity Search → Pegasus 1.2 (structured descriptions) → NERC Severity Scoring → Maintenance Cross-Reference → Dashboard + AI Co-Pilot

## Validation
- Precision: 77.3%
- Recall: 100%
- F1 Score: 87.2%
- Ground truth: 17 manually verified labels from 20-min inspection footage

## Tech Stack
- TwelveLabs Marengo 3.0 + Pegasus 1.2 via AWS Bedrock
- Next.js 14 (App Router)
- Tailwind CSS + Recharts
- Anthropic Claude (AI Co-Pilot)

## Setup
```
npm install
cp .env.example .env  # Add your API keys
npm run dev
```

## GeoVIDINT Hackathon 2026 — Track 2: Energy Infrastructure Monitoring
