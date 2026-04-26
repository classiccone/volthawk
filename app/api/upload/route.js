import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, StartAsyncInvokeCommand } from '@aws-sdk/client-bedrock-runtime'
import { NextResponse } from 'next/server'

const region = process.env.AWS_DEFAULT_REGION || 'us-east-1'
const s3 = new S3Client({ region })
const bedrock = new BedrockRuntimeClient({ region })

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('video')

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    const bucket = process.env.S3_BUCKET_NAME
    const accountId = process.env.AWS_ACCOUNT_ID
    const timestamp = Date.now()
    const videoKey = `uploads/${timestamp}-${file.name}`
    const outputPrefix = `embeddings/${timestamp}/`

    // Upload video to S3
    const buffer = Buffer.from(await file.arrayBuffer())
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: videoKey,
      Body: buffer,
      ContentType: file.type,
    }))

    // Start Marengo async video embedding
    const response = await bedrock.send(new StartAsyncInvokeCommand({
      modelId: 'twelvelabs.marengo-embed-3-0-v1:0',
      modelInput: {
        inputType: 'video',
        video: {
          mediaSource: {
            s3Location: {
              uri: `s3://${bucket}/${videoKey}`,
              bucketOwner: accountId,
            },
          },
          embeddingOption: ['visual'],
          embeddingScope: ['clip'],
        },
      },
      outputDataConfig: {
        s3OutputDataConfig: {
          s3Uri: `s3://${bucket}/${outputPrefix}`,
        },
      },
    }))

    return NextResponse.json({
      jobId: response.invocationArn,
      videoKey,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
