import { BedrockRuntimeClient, GetAsyncInvokeCommand } from '@aws-sdk/client-bedrock-runtime'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

const region = process.env.AWS_DEFAULT_REGION || 'us-east-1'
const bedrock = new BedrockRuntimeClient({ region })
const s3 = new S3Client({ region })

function parseS3Uri(uri) {
  const withoutProtocol = uri.replace('s3://', '')
  const slashIndex = withoutProtocol.indexOf('/')
  return {
    bucket: withoutProtocol.substring(0, slashIndex),
    prefix: withoutProtocol.substring(slashIndex + 1),
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const response = await bedrock.send(new GetAsyncInvokeCommand({
      invocationArn: jobId,
    }))

    const result = { status: response.status }

    if (response.status === 'Completed') {
      const outputUri = response.outputDataConfig?.s3OutputDataConfig?.s3Uri
      if (outputUri) {
        const { bucket, prefix } = parseS3Uri(outputUri)

        // Find the output JSON file
        const listResponse = await s3.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        }))

        const outputKey = listResponse.Contents?.find(
          obj => obj.Key.endsWith('.json')
        )?.Key

        if (outputKey) {
          const getResponse = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: outputKey,
          }))
          const body = await getResponse.Body.transformToString()
          const data = JSON.parse(body)
          result.segmentCount = data.embeddings?.length || 0
          result.outputKey = outputKey
        }
      }
    }

    if (response.failureMessage) {
      result.failureMessage = response.failureMessage
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Status check error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
