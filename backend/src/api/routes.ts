import { Router, Request, Response } from 'express';
import { ProcessBatchRequestSchema } from '../validation/schema';
import { processBatch } from '../lib/extractor';
import logger from '../utils/logger';

const router = Router();

router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  const parsed = ProcessBatchRequestSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid request payload',
      details: parsed.error.format()
    });
    return;
  }

  const { batchId, headers, rows, provider } = parsed.data;

  try {
    const { records, skippedCount, processingTimeMs } = await processBatch(headers, rows, provider as any);
    
    res.status(200).json({
      batchId,
      status: 'success',
      records,
      skippedCount,
      processingTimeMs
    });
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    const isRateLimit = status === 429;
    
    // Default to 500 only if there is no explicit status code from the provider
    const statusCode = status || 500;
    const errorMessage = isRateLimit 
      ? 'Rate limit exceeded for AI Provider' 
      : (error.message || 'An unexpected error occurred during processing');

    logger.error({ batchId, err: error.message, stack: error.stack, statusCode }, 'Batch processing failed');
    res.status(statusCode).json({
      batchId,
      status: 'error',
      error: errorMessage,
      exhaustedProvider: error?.exhaustedProvider,
    });
  }
});

export default router;
