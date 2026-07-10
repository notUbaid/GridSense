import axios from 'axios';
import { ProcessBatchRequest, ProcessBatchResponseSchema } from '../types/schema';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8000/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const processBatchApi = async (batch: ProcessBatchRequest, schemaMapping?: ProcessBatchRequest['schemaMapping'], signal?: AbortSignal) => {
  const response = await apiClient.post('/process/batch', { ...batch, schemaMapping }, { signal });
  return ProcessBatchResponseSchema.parse(response.data);
};

export const callLocalOllama = async (prompt: string, model: string = 'llama3', signal?: AbortSignal) => {
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a strict data extraction system. Output ONLY valid JSON array.' },
        { role: 'user', content: prompt }
      ],
      format: 'json',
      options: {
        temperature: 0.0,
        num_ctx: 8192,
        num_predict: 2000
      },
      stream: false
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.message?.content;
  
  if (!content) {
    throw new Error('Empty response from Ollama');
  }
  
  return content;
};
