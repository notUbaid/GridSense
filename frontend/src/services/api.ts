import axios from 'axios';
import { ProcessBatchRequest, ProcessBatchResponseSchema } from '../types/schema';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const processBatchApi = async (batch: ProcessBatchRequest) => {
  const response = await apiClient.post('/process/batch', batch);
  return ProcessBatchResponseSchema.parse(response.data);
};
