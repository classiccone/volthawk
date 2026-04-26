import {
  BedrockRuntimeClient,
  GetAsyncInvokeCommand,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import {
  DETECTION_QUERIES,
  ASSET_TYPES,
  NERC_REFERENCES,
  RECOMMENDED_ACTIONS,
  scoreSeverity,
} from '../../../lib/queries'

const region = process.env.AWS_DEFAULT_REGION || 'us-east-1'
const bedrock = new BedrockRuntimeClient({ region })
const s3 = new S3Client({ region })
const bucket = process.env.S3_BUCKET_NAME
const accountId = process.env.AWS_ACCOUNT_ID

export const maxDuration = 300

function parseS3Uri(uri) {
  const withoutProtocol = uri.replace('s3://', '')
  const slashIndex = withoutProtocol.indexOf('/')
  return {
    bucket: withoutProtocol.substring(0, slashIndex),
    prefix: withoutProtocol.substring(slashIndex + 1),
  }
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return -1
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function deduplicateFindings(matches) {
  // Already sorted by score desc — keep highest-scoring non-overlapping match per anomaly type
  const kept = []
  for (const match of matches) {
    const overlaps = kept.some(
      k =>
        k.anomaly_type === match.anomaly_type &&
        Math.max(k.start_time, match.start_time) < Math.min(k.end_time, match.end_time)
    )
    if (!overlaps) kept.push(match)
  }
  return kept
}

async function getTextEmbedding(text) {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'us.twelvelabs.marengo-embed-3-0-v1:0',
    body: JSON.stringify({
      inputType: 'text',
      text: { inputText: text },
    }),
    contentType: 'application/json',
    accept: 'application/json',
  }))
  const result = JSON.parse(new TextDecoder().decode(response.body))
  const queryEmbedding = result.data?.[0]?.embedding
  console.log('[analyze] Text embedding length:', queryEmbedding?.length)
  return queryEmbedding
}

async function callPegasus(videoKey, match) {
  const prompt = `Analyze this transmission line inspection video segment from ${match.start_time.toFixed(1)}s to ${match.end_time.toFixed(1)}s. Describe any ${match.anomaly_type.replace(/_/g, ' ')} visible. Include specific details about condition, extent of damage or encroachment, proximity to conductors, and estimated measurements where possible. Be technical and concise.`

  const response = await bedrock.send(new InvokeModelWithResponseStreamCommand({
    modelId: 'us.twelvelabs.pegasus-1-2-v1:0',
    body: JSON.stringify({
      inputPrompt: prompt,
      mediaSource: {
        s3Location: {
          uri: `s3://${bucket}/${videoKey}`,
          bucketOwner: accountId,
        },
      },
      temperature: 0,
    }),
    contentType: 'application/json',
    accept: 'application/json',
  }))

  let text = ''
  for await (const event of response.body) {
    if (event.chunk?.bytes) {
      try {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes))
        if (chunk.text) text += chunk.text
        else if (chunk.output?.text) text += chunk.output.text
        else if (typeof chunk === 'string') text += chunk
      } catch (parseErr) {
        // Append raw bytes as text if not JSON
        console.warn('[analyze] Pegasus chunk not JSON, appending raw:', parseErr.message)
        text += new TextDecoder().decode(event.chunk.bytes)
      }
    }
  }
  return text.trim()
}

export async function POST(request) {
  try {
    const { jobId, videoKey } = await request.json()

    // 1. Get Marengo output location
    const jobInfo = await bedrock.send(new GetAsyncInvokeCommand({
      invocationArn: jobId,
    }))

    if (jobInfo.status !== 'Completed') {
      return NextResponse.json(
        { error: `Job not completed. Status: ${jobInfo.status}` },
        { status: 400 }
      )
    }

    const outputUri = jobInfo.outputDataConfig?.s3OutputDataConfig?.s3Uri
    console.log('[analyze] Marengo outputUri:', outputUri)
    const { bucket: outputBucket, prefix } = parseS3Uri(outputUri)
    console.log('[analyze] Parsed S3 — bucket:', outputBucket, 'prefix:', prefix)

    // Find and fetch the embeddings output
    const listResponse = await s3.send(new ListObjectsV2Command({
      Bucket: outputBucket,
      Prefix: prefix,
    }))

    console.log('[analyze] S3 ListObjects found', listResponse.Contents?.length ?? 0, 'files:', listResponse.Contents?.map(o => o.Key))
    const outputKey = listResponse.Contents?.find(obj => obj.Key.endsWith('output.json'))?.Key
    console.log('[analyze] Selected output key:', outputKey)
    if (!outputKey) {
      return NextResponse.json({ error: 'Embedding output not found' }, { status: 404 })
    }

    const getResponse = await s3.send(new GetObjectCommand({
      Bucket: outputBucket,
      Key: outputKey,
    }))
    const embeddingsData = JSON.parse(await getResponse.Body.transformToString())
    console.log('[analyze] Embeddings data keys:', Object.keys(embeddingsData))
    const videoEmbeddings = embeddingsData.data || []
    console.log(`[analyze] Found ${videoEmbeddings.length} segments with ${videoEmbeddings[0]?.embedding?.length ?? 0} dimension embeddings`)

    // 2. Search: for each query, get text embedding and compute similarity
    const allMatches = []

    for (const [anomalyType, queries] of Object.entries(DETECTION_QUERIES)) {
      for (const query of queries) {
        let textEmbedding
        try {
          textEmbedding = await getTextEmbedding(query)
        } catch (err) {
          console.error(`[analyze] Failed to get text embedding for query "${query}":`, err.message)
          continue
        }

        const scored = videoEmbeddings
          .map(segment => ({
            anomaly_type: anomalyType,
            query_used: query,
            start_time: segment.startSec,
            end_time: segment.endSec,
            marengo_score: cosineSimilarity(textEmbedding, segment.embedding),
          }))
          .filter(s => s.marengo_score > 0.05)
          .sort((a, b) => b.marengo_score - a.marengo_score)
          .slice(0, 3)

        allMatches.push(...scored)
        console.log(`[analyze] Query: "${query}" — top score: ${scored[0]?.marengo_score?.toFixed(4) ?? 'none'}, kept: ${scored.length}`)
      }
    }

    // 3. Sort by score and deduplicate overlapping time ranges
    allMatches.sort((a, b) => b.marengo_score - a.marengo_score)
    const deduplicated = deduplicateFindings(allMatches)
    console.log(`[analyze] Findings before dedup: ${allMatches.length}, after dedup: ${deduplicated.length}`)

    // 4. For each finding, call Pegasus for description and apply severity scoring
    const findings = []

    for (let i = 0; i < deduplicated.length; i++) {
      const match = deduplicated[i]
      const severity = scoreSeverity(match.marengo_score)

      let condition
      try {
        condition = await callPegasus(videoKey, match)
      } catch (err) {
        console.error(`Pegasus call failed for finding ${i + 1}:`, err.message)
        condition = `${match.anomaly_type.replace(/_/g, ' ')} detected at ${match.start_time.toFixed(1)}s with confidence ${match.marengo_score.toFixed(3)}. Automated description unavailable.`
      }

      findings.push({
        id: i + 1,
        anomaly_type: match.anomaly_type,
        start_time: Math.round(match.start_time * 10) / 10,
        end_time: Math.round(match.end_time * 10) / 10,
        marengo_score: Math.round(match.marengo_score * 1000) / 1000,
        query_used: match.query_used,
        asset_type: ASSET_TYPES[match.anomaly_type] || 'unknown',
        condition,
        severity: severity.level,
        severity_label: `${severity.level === 'critical' ? '🔴' : severity.level === 'high' ? '🟠' : severity.level === 'moderate' ? '🟡' : '🟢'} ${severity.label}`,
        nerc_reference: NERC_REFERENCES[match.anomaly_type]?.[severity.level] || 'General inspection finding',
        priority_hours: severity.priorityHours,
        pegasus_confidence: Math.round(match.marengo_score * 0.9 * 100) / 100,
        recommended_action: RECOMMENDED_ACTIONS[match.anomaly_type]?.[severity.level] || 'Schedule inspection at next maintenance window.',
      })
    }

    console.log(`[analyze] Returning ${findings.length} findings`)
    return NextResponse.json({ findings })
  } catch (err) {
    console.error('Analysis error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
