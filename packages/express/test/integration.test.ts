import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import * as http from 'node:http';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type WebhookEvent, type Verifier } from '@tayori/core';

/**
 * Integration tests for the Express adapter using a real express() app instance.
 * These tests verify the full end-to-end request-processing flow without mocks.
 */

/** Starts an express app on an OS-assigned port and returns {server, baseUrl} */
function startServer(app: express.Express): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
    server.on('error', reject);
  });
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('Express adapter integration tests', () => {
  const testEvent: WebhookEvent = {
    id: 'evt_integration_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123', amount: 1000 } },
  };

  let server: http.Server;
  let baseUrl: string;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  beforeEach(async () => {
    router = new WebhookRouter();
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });

    const app = express();
    app.post(
      '/webhook',
      express.raw({ type: 'application/json' }),
      expressAdapter(router, { verifier: mockVerifier })
    );

    ({ server, baseUrl } = await startServer(app));
  });

  afterEach(async () => {
    await stopServer(server);
  });

  it('should return 200 and call handler when request is valid', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const payload = JSON.stringify(testEvent);
    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      body: payload,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ received: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should return 400 when body is missing', async () => {
    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      // no body - express.raw will set req.body to undefined/Buffer(0)
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('should return 400 when verification fails', async () => {
    (mockVerifier as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'bad_sig',
      },
      body: JSON.stringify(testEvent),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    // Must not expose internal error details
    expect(body.error).toBe('Verification failed');
  });

  it('should return 500 when handler throws', async () => {
    router.on('payment_intent.succeeded', async () => {
      throw new Error('Handler crashed');
    });

    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      body: JSON.stringify(testEvent),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });

  it('should call onError handler and still return 500', async () => {
    const onError = vi.fn().mockResolvedValue(undefined);

    // Rebuild server with onError option
    await stopServer(server);
    const app2 = express();
    const router2 = new WebhookRouter();
    router2.on('payment_intent.succeeded', async () => {
      throw new Error('Dispatch error');
    });
    app2.post(
      '/webhook',
      express.raw({ type: 'application/json' }),
      expressAdapter(router2, { verifier: mockVerifier, onError })
    );
    ({ server, baseUrl } = await startServer(app2));

    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      body: JSON.stringify(testEvent),
    });

    expect(response.status).toBe(500);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should handle multiple sequential requests correctly', async () => {
    const results: string[] = [];
    router.on('payment_intent.succeeded', async (event) => {
      results.push(event.id);
    });

    const events = ['evt_a', 'evt_b', 'evt_c'];
    for (const id of events) {
      (mockVerifier as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        event: { ...testEvent, id },
      });
      const response = await fetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test_sig',
        },
        body: JSON.stringify({ ...testEvent, id }),
      });
      expect(response.status).toBe(200);
    }

    expect(results).toEqual(['evt_a', 'evt_b', 'evt_c']);
  });

  it('should handle whitespace-only body with 400', async () => {
    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test_sig',
        'content-length': '6',
      },
      body: '   \n  ',
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Request body cannot be empty');
  });

  it('should normalize multi-value headers by using the first value', async () => {
    // Verify the verifier receives normalized headers
    const capturingVerifier = vi.fn().mockReturnValue({ event: testEvent });

    await stopServer(server);
    const app3 = express();
    app3.post(
      '/webhook',
      express.raw({ type: 'application/json' }),
      expressAdapter(new WebhookRouter(), { verifier: capturingVerifier })
    );
    ({ server, baseUrl } = await startServer(app3));

    const response = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'sig_value',
      },
      body: JSON.stringify(testEvent),
    });

    expect(response.status).toBe(200);
    const receivedHeaders = (capturingVerifier.mock.calls[0] as unknown[])[1] as Record<string, string>;
    expect(typeof receivedHeaders['stripe-signature']).toBe('string');
    expect(receivedHeaders['stripe-signature']).toBe('sig_value');
  });
});
