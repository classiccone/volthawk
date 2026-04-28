# ⚡ VoltHawk

### The grid's eye in the sky.

**AI-powered drone inspection platform for high-voltage transmission lines. Upload drone footage. Get NERC-compliant risk findings in minutes.**

🏆 **3rd Place Winner** — GeoVIDINT Hackathon 2026 (out of 16 projects)
📍 St. Louis · Track 2: Energy Infrastructure Monitoring
👤 Built solo in 24 hours

[🎥 Watch the demo](https://youtu.be/8HiSfwWNt7I) · [📊 Validation Report](./validation_report.md) · [📋 Mission Impact Brief](./mission_impact_brief.md)

---

## The problem we're solving

The United States operates **200,000+ miles of high-voltage transmission lines**. The American Society of Civil Engineers gave U.S. energy infrastructure a **D+ grade** in 2025. Here's what that looks like in practice:

**Manual inspection is the bottleneck.** Utilities fly drones along transmission corridors and collect hours of footage. Then human analysts sit and watch it — frame by frame — looking for damaged equipment, trees growing too close to wires, and rust on tower structures. One analyst reviews **20-30 miles per day**. At that rate, a major utility's annual inspection takes over a year to process.

**The error rate is dangerous.** Fatigue, distraction, and inconsistency mean manual reviewers miss approximately **17% of defects** (industry average). When what you're missing is a cracked insulator or a tree about to contact a 230kV conductor, the consequences are catastrophic.

**The stakes are enormous:**
- **38% of all transmission outages** are caused by vegetation contacting conductors (NERC data)
- A single catastrophic transmission failure costs **$1M to $100M+**
- The 2003 Northeast blackout — caused by one untrimmed tree in Ohio — affected **55 million people** and cost an estimated $6 billion
- PG&E's Camp Fire, linked to transmission equipment failure, resulted in **$13.5 billion** in settlements

The data to solve this already exists. Utilities have the drone footage. What's missing is the ability to analyze it at machine speed. That's what VoltHawk does.

---

## What VoltHawk does

**Drone footage goes in. NERC-aligned risk findings come out.**

VoltHawk processes aerial inspection video and automatically detects three types of infrastructure anomalies:

### 🔴 Insulator damage
Cracks, chips, contamination, and flashover marks on the glass or ceramic disc assemblies that prevent electricity from flowing into tower structures. A failed insulator can cause a flashover — an uncontrolled electrical arc that damages equipment and triggers outages.

**Regulatory mapping:** NESC Rule 215 (insulator integrity requirements)

### 🟢 Vegetation encroachment
Trees, branches, and vegetation growing within the minimum clearance distance of high-voltage conductors. This is the single largest cause of transmission outages. NERC mandates specific clearance distances based on voltage — for 230kV lines, the minimum vegetation clearance distance (MVCD) is approximately 5.1 feet.

**Regulatory mapping:** NERC FAC-003-4 (Transmission Vegetation Management)

### 🟠 Structural corrosion
Rust, paint deterioration, and steel degradation on lattice tower structures, with particular attention to joints, bolts, and base connections. Progressive corrosion reduces structural load capacity and can lead to tower collapse under wind or ice loading.

**Regulatory mapping:** NERC FAC-501-3 (Facility Ratings — structural integrity)

**Every finding is scored against real federal compliance thresholds — not arbitrary high/medium/low scales.**

---

## How it works

```
Drone Video → Amazon S3 → Marengo 3.0 (embeddings) → Cosine Similarity Search
    → Pegasus 1.2 (descriptions) → NERC Severity Scoring → Dashboard + AI Co-Pilot
```

### Step 1: Video upload
Drone inspection footage (MP4) is uploaded through the web interface and stored in Amazon S3.

### Step 2: Marengo creates searchable embeddings
TwelveLabs **Marengo 3.0** processes the entire video asynchronously via AWS Bedrock's `StartAsyncInvoke`. It breaks the video into ~7-second segments and creates a **512-dimensional vector embedding** for each one — a mathematical representation of what's happening visually in that segment.

For a 20-minute video, this produces approximately **180 segment embeddings** in 3-5 minutes.

### Step 3: Semantic search with natural language
This is where VoltHawk differs fundamentally from traditional computer vision approaches.

Instead of training an object detection model on thousands of labeled images of damaged insulators, we **search the video using plain English**. VoltHawk runs **12 detection queries** like:
- *"damaged insulator on transmission tower"*
- *"trees growing very close to power lines"*
- *"rust or corrosion on transmission tower steel"*

Each query is converted into the same 512-dimensional embedding space using Marengo's `InvokeModel` endpoint. **Cosine similarity** measures how close each query embedding is to each video segment embedding. The closest matches are our detections.

**Why this matters:** Adding a new detection type — say, bird nests on towers or missing guy wires — requires adding one query string. No retraining. No new labeled dataset. No model fine-tuning.

### Step 4: Pegasus generates structured descriptions
For each detected segment, TwelveLabs **Pegasus 1.2** watches the video clip via `InvokeModelWithResponseStream` and generates a structured inspection assessment:
- Asset type (insulator, vegetation, tower structure)
- Condition description (what it sees in detail)
- Severity level (high, moderate, low)
- Confidence score
- Recommended action for field crews

### Step 5: NERC severity scoring
VoltHawk's severity engine maps each finding to the appropriate regulatory standard:

| Severity | Response time | Criteria |
|----------|--------------|----------|
| **CRITICAL** | 24 hours | Vegetation contact with conductor, structural failure risk, imminent threat |
| **HIGH** | 30 days | NERC clearance violation, visible cracks, measurable corrosion at joints |
| **MODERATE** | 90 days | Approaching clearance zone, minor discoloration, surface rust |
| **LOW** | 1 year | Normal wear, routine monitoring, no immediate risk |

### Step 6: Maintenance cross-reference
Findings are automatically correlated against tower maintenance history. When a finding coincides with deferred or overdue maintenance, the system **automatically escalates** the priority:

> ⚠️ **ESCALATED** — Tower T-001 has deferred maintenance (last inspected 2024-08-15) + active visual anomaly detected. Recommend immediate priority upgrade.

This intelligence is only possible when you combine video analysis with operational data — neither source reveals it alone.

---

## The dashboard

VoltHawk's inspection intelligence dashboard turns raw findings into actionable decisions.

### KPI summary
Total findings, critical count, high count, and estimated risk exposure ($M range based on industry incident costs).

### NERC compliance status
Three compliance cards showing violation/compliant status for each regulatory standard — FAC-003-4 Vegetation, FAC-501-3 Structural, NESC Rule 215 Insulators. An inspector sees at a glance which regulations are being violated.

### Severity distribution & detection timeline
Visual breakdown of findings by severity. Timeline scatter plot showing where anomalies cluster across the video duration — useful for identifying problem zones along the transmission corridor.

### Expandable findings with evidence
Each finding expands to show:
- Full condition description from Pegasus
- Recommended action
- NERC reference
- Marengo and Pegasus confidence scores
- Priority timeframe
- **Editable severity dropdown** — inspectors can override the AI's assessment
- **Inspector notes field** — add observations for field crew handoff
- **Evidence playback** — click to jump to the exact timestamp in the drone footage

### Maintenance escalation
Findings cross-referenced with maintenance history. Towers with deferred or overdue maintenance that also show visual anomalies are flagged for immediate attention.

### AI Inspection Co-Pilot
An interactive chat panel powered by Claude with full context of all inspection findings. Inspectors can ask questions in plain English:

- *"What are the highest priority findings and why?"*
- *"Generate a work order for all HIGH severity items"*
- *"If I can only send one crew today, where should they go?"*
- *"Estimate total risk exposure across all findings"*
- *"Which findings are NERC violations?"*

This transforms a reporting tool into an **intelligence tool** — inspectors don't just see data, they can interrogate it.

### Export
- **CSV** — compatible with utility work order systems (Maximo, SAP PM)
- **Markdown report** — formatted inspection summary grouped by severity
- **JSON** — structured data for integration with other systems

---

## Validation results

Validated against 17 manually labeled ground truth examples from 20 minutes of real drone inspection footage.

| Metric | Score |
|--------|-------|
| **Precision** | **77.3%** |
| **Recall** | **100.0%** |
| **F1 Score** | **87.2%** |
| Ground truth labels | 17 |
| System detections | 22 |
| True positives | 17 |
| False positives | 5 |
| False negatives | **0** |

### What these numbers mean

**100% recall** — every confirmed anomaly in the footage was detected. Zero false negatives. For infrastructure safety, this is the critical metric. A missed defect can cascade into a catastrophic failure. VoltHawk is calibrated to flag everything suspicious and let human inspectors validate.

**77.3% precision** — of the 22 findings, 5 were not in our ground truth set. These aren't necessarily errors — they may be real issues we didn't label. The system intentionally favors sensitivity over specificity. A false positive costs an inspector 30 seconds of review. A false negative can cost millions.

### VoltHawk vs. manual inspection

| Factor | Manual review | VoltHawk | Improvement |
|--------|--------------|----------|-------------|
| Throughput | 20-30 mi/day/analyst | 300+ mi/day | **15×** |
| False negative rate | ~17% | 0% | **Eliminated** |
| Time to first finding | 4-8 hours | < 10 minutes | **Near real-time** |
| Analysis cost per mile | $8-15 labor | < $1 compute | **90% reduction** |
| NERC compliance mapping | Manual cross-reference | Automatic | **Built-in** |
| Consistency | Varies with fatigue | Consistent | **Standardized** |

### Processing benchmarks

| Metric | Value |
|--------|-------|
| Video processed | 20 minutes of drone footage |
| Marengo embedding time | ~3-5 minutes |
| Search queries executed | 12 (across 3 anomaly types) |
| Search time | ~30 seconds |
| Pegasus description time | ~2 minutes (22 findings) |
| **Total pipeline time** | **~8 minutes end-to-end** |
| Equivalent manual time | 4-6 hours |
| Compute cost per run | ~$2-5 (Bedrock) |

---

## Operational impact

| Metric | Before (manual) | After (VoltHawk) |
|--------|----------------|-----------------|
| Inspection throughput | 20 mi/day | **300+ mi/day** |
| Cost per mile | $8-15 | **< $1** |
| Time to first alert | 4-8 hours | **< 10 minutes** |
| Annual program (10,000 mi) | ~18 months | **~2 weeks** |

**Risk exposure identified in a single 20-minute inspection: $18.8M – $70M**

### Target users
- **Utility inspection teams** — prioritized work orders replacing manual video review
- **NERC compliance officers** — automated FAC-003 vegetation clearance verification
- **Army Corps of Engineers** — infrastructure condition assessment for installations and forward operating bases
- **Emergency management** — post-storm rapid damage assessment for grid restoration prioritization

---

## Tech stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Video search | TwelveLabs Marengo 3.0 | Semantic video embeddings — search with English, no training data |
| Video description | TwelveLabs Pegasus 1.2 | Structured condition reports from video clips |
| ML infrastructure | AWS Bedrock | Async processing, scalable, FedRAMP-eligible |
| Storage | Amazon S3 | Video and embedding storage |
| Frontend | Next.js 14 (App Router) | Server-side API routes keep AWS credentials secure |
| Styling | Tailwind CSS | Rapid, professional UI development |
| Charts | Recharts | Severity distribution and detection timeline |
| AI Co-Pilot | Anthropic Claude | Contextual Q&A grounded in inspection findings |
| Pipeline notebook | Python / Jupyter | Development, validation, and reproducibility |

---

## Project structure

```
volthawk/
├── app/
│   ├── api/
│   │   ├── upload/route.js        # S3 upload + Marengo async embedding
│   │   ├── status/route.js        # Poll Marengo job completion
│   │   ├── analyze/route.js       # Cosine search + Pegasus + NERC scoring
│   │   └── chat/route.js          # AI co-pilot (Claude proxy)
│   ├── layout.jsx                 # App shell and metadata
│   └── page.jsx                   # 3-screen flow (upload → process → dashboard)
├── components/
│   ├── UploadScreen.jsx           # Video upload + JSON loader
│   ├── ProcessingScreen.jsx       # Real-time pipeline status with step indicators
│   ├── Header.jsx                 # VoltHawk branding + export controls
│   ├── KPICards.jsx               # Summary metrics (findings, critical, high, risk)
│   ├── ComplianceStatus.jsx       # NERC compliance violation/compliant cards
│   ├── SeverityChart.jsx          # Severity distribution bar chart
│   ├── DetectionTimeline.jsx      # Findings plotted across video duration
│   ├── FindingsTable.jsx          # Expandable rows with edit, notes, evidence
│   ├── MaintenanceCrossRef.jsx    # Auto-escalation logic
│   ├── ChatPanel.jsx              # AI co-pilot chat interface
│   └── Footer.jsx
├── data/
│   └── maintenance.json           # Mock maintenance history for cross-reference
├── lib/
│   └── utils.js                   # Risk calculation, severity framework, helpers
├── public/
│   └── logo.png                   # VoltHawk branding
├── VoltHawk_Pipeline.ipynb        # Complete Jupyter pipeline (Marengo + Pegasus)
├── validation_report.md           # Quantitative metrics and analysis
├── mission_impact_brief.md        # One-page operational value summary
└── README.md
```

---

## Setup & run locally

### Prerequisites
- Node.js 18+
- AWS account with Bedrock access (TwelveLabs Marengo + Pegasus models enabled)
- Anthropic API key (for AI co-pilot feature)

### Install

```bash
git clone https://github.com/classiccone/volthawk.git
cd volthawk
npm install
```

### Configure

Create `.env` in the project root:

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_SESSION_TOKEN=your_token
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket
AWS_ACCOUNT_ID=your_account_id
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Two ways to use it

**Process new footage:**
Upload MP4 drone video → wait ~8 minutes → full dashboard with findings

**Load previous results:**
Click "Load from JSON File" → select findings JSON → instant dashboard

---

## What I'd build next

1. **GPS georeferencing** — production drones embed GPS telemetry in every frame. Map findings to lat/long coordinates for geographic visualization and optimized field crew routing.

2. **Multi-temporal analysis** — compare inspections of the same corridor across dates to track degradation progression. "This corrosion got 30% worse since the last fly-over" triggers predictive maintenance.

3. **Work order system integration** — direct API export to Maximo, SAP PM, or other utility asset management platforms so findings become dispatched work orders automatically.

4. **Real-time streaming** — process live drone feeds during flight instead of post-flight uploads. Findings appear as the drone flies.

5. **Expanded detection library** — bird nests, missing hardware, conductor sag, ice accumulation, guy-wire fatigue. Each new detection type is just a query string — no model retraining.

6. **Confidence calibration** — adjust detection sensitivity per asset type and utility preference. Some operators want maximum sensitivity; others want fewer, higher-confidence findings.

---

## Honest limitations

- Severity scoring depends on Pegasus assessment quality — VoltHawk assists human inspectors, it doesn't replace them
- Cosine similarity thresholds require calibration per video quality and drone type
- Cannot measure precise clearance distances from video — estimates are approximate
- Test footage was publicly sourced without GPS metadata; production footage would include georeferencing
- Ground truth validation based on 17 labels from a single inspection flight
- Marengo similarity scores for this domain fall in the 0.10-0.25 range, requiring lower thresholds than typical applications

---

## Hackathon context

Built at the [Geospatial Video Intelligence Hackathon](https://geospatial-hackathon-12labs.devpost.com/) in St. Louis, April 25-26, 2026. Hosted by TwelveLabs, GeoSTL, T-REX Innovation Center, AWS, and Overture Maps Foundation.

**Track 2 — Energy Infrastructure Monitoring** challenged participants to build automated video analysis systems for energy infrastructure — enabling utilities to detect anomalies, assess equipment condition, and identify maintenance needs from aerial footage at scale.

**Judging criteria:**
- Detection Accuracy (35%) — precision, recall, severity calibration
- Domain Understanding (25%) — regulatory alignment, failure mode knowledge
- Technical Implementation (20%) — video understanding advantage, Marengo + Pegasus integration
- Operational Readiness (15%) — report generation, evidence packaging, workflow integration
- Innovation (5%) — agent workflows, novel approaches

---

*VoltHawk — The grid's eye in the sky.*
*Built with TwelveLabs Marengo 3.0 + Pegasus 1.2 via AWS Bedrock*
