import { Router } from 'express';
import { mapHeaders, processBatchController } from '../controllers/process.controller';

const router = Router();

router.post('/map-headers', mapHeaders);
router.post('/batch', processBatchController);

export default router;

