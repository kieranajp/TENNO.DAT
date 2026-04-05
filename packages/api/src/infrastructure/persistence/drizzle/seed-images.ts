import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createLogger } from '../../logger'

const log = createLogger('SeedImages')

const CDN_BASE = 'https://cdn.warframestat.us/img'
const CONCURRENCY = 10

function createR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

async function downloadImage(imageName: string): Promise<Buffer | null> {
  const url = `${CDN_BASE}/${imageName}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      log.warn(`Failed to download ${imageName}`, { status: res.status })
      return null
    }
    return Buffer.from(await res.arrayBuffer())
  } catch (error) {
    log.warn(`Error downloading ${imageName}`, { error: String(error) })
    return null
  }
}

async function syncImage(
  client: S3Client,
  bucket: string,
  imageName: string,
): Promise<'skipped' | 'uploaded' | 'failed'> {
  const key = `img/${imageName}`

  if (await objectExists(client, bucket, key)) {
    return 'skipped'
  }

  const data = await downloadImage(imageName)
  if (!data) return 'failed'

  const contentType = imageName.endsWith('.png') ? 'image/png'
    : imageName.endsWith('.webp') ? 'image/webp'
    : imageName.endsWith('.jpg') || imageName.endsWith('.jpeg') ? 'image/jpeg'
    : 'application/octet-stream'

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  return 'uploaded'
}

async function runBatch<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function syncImages(imageNames: Set<string>) {
  const bucket = process.env.R2_BUCKET
  if (!bucket) {
    log.info('R2_BUCKET not set, skipping image sync')
    return
  }

  const client = createR2Client()
  if (!client) {
    log.info('R2 credentials not configured, skipping image sync')
    return
  }

  log.info(`Syncing ${imageNames.size} images to R2...`)

  const counts = { skipped: 0, uploaded: 0, failed: 0 }
  const names = Array.from(imageNames)

  const results = await runBatch(names, CONCURRENCY, (name) => syncImage(client, bucket, name))

  for (const result of results) {
    counts[result]++
  }

  log.info('Image sync complete', {
    total: imageNames.size,
    uploaded: counts.uploaded,
    skipped: counts.skipped,
    failed: counts.failed,
  })

  if (counts.failed > 0) {
    log.warn(`${counts.failed} images failed to sync`)
  }
}
