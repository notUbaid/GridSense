import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('API Routes', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /api/v1/process/batch should validate required fields', async () => {
    const res = await request(app)
      .post('/api/v1/process/batch')
      .send({
        // Missing headers and rows
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid request payload');
  });

  it('POST /api/v1/process/batch should process valid requests', async () => {
    const res = await request(app)
      .post('/api/v1/process/batch')
      .send({
        batchId: 'test-batch',
        headers: ['Name', 'Email', 'Phone'],
        rows: [
          { Name: 'Test User', Email: 'test@example.com', Phone: '555-1234' }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.records).toBeDefined();
    expect(res.body.records).toHaveLength(1);
    expect(res.body.records[0].email).toBe('test@example.com');
  });
});
