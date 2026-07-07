import { Router, Request, Response } from 'express';
import { ProcessBatchRequestSchema } from '../validation/schema';
import { processBatch } from '../lib/extractor';
import { mapHeadersToSchema } from '../lib/mapper';
import logger from '../utils/logger';

const router = Router();

router.post('/map-headers', async (req: Request, res: Response): Promise<void> => {
  try {
    const headers = req.body.headers;
    if (!headers || !Array.isArray(headers)) {
      res.status(400).json({ error: 'Headers array is required' });
      return;
    }
    const result = await mapHeadersToSchema(headers);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error({ err: error.message }, 'Header mapping failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

  const { batchId, headers, rows, provider, schemaMapping } = parsed.data;

  try {
    const { records, skippedCount, skippedReasons, processingTimeMs } = await processBatch(headers, rows, provider as any, schemaMapping);
    
    res.status(200).json({
      batchId,
      status: 'success',
      records,
      skippedCount,
      skippedReasons,
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

    // Return the actual HTTP status code — the frontend handles rate limits via response body
    const responseStatusCode = statusCode;

    logger.error({ batchId, err: error.message, stack: error.stack, statusCode }, 'Batch processing failed');
    res.status(responseStatusCode).json({
      batchId,
      status: 'error',
      error: errorMessage,
      exhaustedProvider: error?.exhaustedProvider,
    });
  }
});

export default router;
