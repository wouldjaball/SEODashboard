// Cron Job Utilities for Performance & Error Handling

export interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  batchesProcessed: number
  successCount: number
  errorCount: number
}

export class CronPerformanceTracker {
  private metrics: PerformanceMetrics

  constructor() {
    this.metrics = {
      startTime: Date.now(),
      batchesProcessed: 0,
      successCount: 0,
      errorCount: 0
    }
  }

  recordBatchCompleted(successCount: number, errorCount: number) {
    this.metrics.batchesProcessed++
    this.metrics.successCount += successCount
    this.metrics.errorCount += errorCount
  }

  finish() {
    this.metrics.endTime = Date.now()
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime
    return this.metrics
  }

  getProgressReport(): string {
    const elapsed = Date.now() - this.metrics.startTime
    return `[Cron Performance] Batch ${this.metrics.batchesProcessed} | ` +
           `Success: ${this.metrics.successCount} | ` +
           `Errors: ${this.metrics.errorCount} | ` +
           `Elapsed: ${Math.round(elapsed / 1000)}s`
  }
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt <= maxRetries) {
        console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${delayMs}ms:`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        delayMs *= 2 // Exponential backoff
      }
    }
  }

  throw lastError!
}

export interface BatchProcessingOptions {
  batchSize: number
  batchDelayMs: number
  maxConcurrentBatches?: number
}

export async function processBatchesWithTracking<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchProcessingOptions,
  tracker: CronPerformanceTracker
): Promise<R[]> {
  const { batchSize, batchDelayMs } = options
  const batches = chunkArray(items, batchSize)
  const results: R[] = []

  console.log(`[Batch Processing] Starting ${batches.length} batches of ${batchSize} items`)

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchStart = Date.now()
    
    console.log(`[Batch ${batchIndex + 1}/${batches.length}] Processing ${batch.length} items...`)

    try {
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(item => 
          withRetry(() => processor(item), 2, 1000)
            .catch(error => {
              console.error('[Batch Item Error]:', error)
              return null // Return null for failed items
            })
        )
      )

      const successfulResults = batchResults.filter((r): r is Awaited<R> => r !== null)
      const errorCount = batchResults.length - successfulResults.length

      results.push(...successfulResults as R[])
      tracker.recordBatchCompleted(successfulResults.length, errorCount)

      const batchDuration = Date.now() - batchStart
      console.log(`[Batch ${batchIndex + 1}] Completed in ${batchDuration}ms - ${successfulResults.length}/${batch.length} successful`)
      console.log(tracker.getProgressReport())

      // Delay between batches (except for last batch)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs))
      }

    } catch (batchError) {
      console.error(`[Batch ${batchIndex + 1}] Failed completely:`, batchError)
      tracker.recordBatchCompleted(0, batch.length)
    }
  }

  return results
}