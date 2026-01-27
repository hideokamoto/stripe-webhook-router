import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { WebhookRouter } from '@tayori/core';
import {
  baseEventSchema,
  createEventSchema,
  defineEvent,
  SchemaRegistry,
  withValidation,
  createZodVerifier,
  WebhookValidationError,
  UnknownEventTypeError,
  type InferEventMap,
  type InferEventType,
} from '../src/index.js';

describe('createEventSchema', () => {
  it('creates a schema with literal type', () => {
    const schema = createEventSchema(
      'issue.opened',
      z.object({
        id: z.number(),
        title: z.string(),
      })
    );

    const validEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: {
        object: {
          id: 1,
          title: 'Test Issue',
        },
      },
    };

    expect(schema.parse(validEvent)).toEqual(validEvent);
  });

  it('rejects events with wrong type', () => {
    const schema = createEventSchema(
      'issue.opened',
      z.object({ id: z.number() })
    );

    const invalidEvent = {
      id: 'evt_123',
      type: 'issue.closed', // wrong type
      data: { object: { id: 1 } },
    };

    expect(() => schema.parse(invalidEvent)).toThrow();
  });

  it('rejects events with invalid data object', () => {
    const schema = createEventSchema(
      'issue.opened',
      z.object({ id: z.number() })
    );

    const invalidEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 'not-a-number' } },
    };

    expect(() => schema.parse(invalidEvent)).toThrow();
  });
});

describe('defineEvent', () => {
  it('creates an event schema definition', () => {
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({ id: z.number() })
    );

    expect(issueOpened.type).toBe('issue.opened');
    expect(issueOpened.schema).toBeDefined();
  });

  it('supports type inference', () => {
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({
        id: z.number(),
        title: z.string(),
      })
    );

    type IssueOpenedEvent = InferEventType<typeof issueOpened>;

    // Type check - this should compile
    const event: IssueOpenedEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: {
        object: {
          id: 1,
          title: 'Test',
        },
      },
    };

    expect(event.type).toBe('issue.opened');
  });
});

describe('InferEventMap', () => {
  it('infers event map from schema definitions', () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const issueClosed = defineEvent('issue.closed', z.object({ id: z.number() }));

    const schemas = { issueOpened, issueClosed };
    type GitHubEventMap = InferEventMap<typeof schemas>;

    // Type check
    const eventMap: GitHubEventMap = {
      'issue.opened': {
        id: 'evt_1',
        type: 'issue.opened',
        data: { object: { id: 1 } },
      },
      'issue.closed': {
        id: 'evt_2',
        type: 'issue.closed',
        data: { object: { id: 2 } },
      },
    };

    expect(eventMap['issue.opened'].type).toBe('issue.opened');
    expect(eventMap['issue.closed'].type).toBe('issue.closed');
  });
});

describe('SchemaRegistry', () => {
  it('registers and retrieves schemas', () => {
    const registry = new SchemaRegistry();
    const schema = createEventSchema('test.event', z.object({ id: z.number() }));

    registry.register('test.event', schema);

    expect(registry.has('test.event')).toBe(true);
    expect(registry.get('test.event')).toBe(schema);
  });

  it('registers multiple definitions at once', () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const issueClosed = defineEvent('issue.closed', z.object({ id: z.number() }));

    const registry = new SchemaRegistry().registerAll({ issueOpened, issueClosed });

    expect(registry.has('issue.opened')).toBe(true);
    expect(registry.has('issue.closed')).toBe(true);
  });

  it('validates events correctly', () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const validEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 1 } },
    };

    expect(registry.validate(validEvent)).toEqual(validEvent);
  });

  it('throws on invalid events', () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const invalidEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 'not-a-number' } },
    };

    expect(() => registry.validate(invalidEvent)).toThrow();
  });

  it('passes through unknown events', () => {
    const registry = new SchemaRegistry();

    const unknownEvent = {
      id: 'evt_123',
      type: 'unknown.event',
      data: { object: { anything: 'goes' } },
    };

    expect(registry.validate(unknownEvent)).toEqual(unknownEvent);
  });

  it('safeParse returns success for valid events', () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const validEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 1 } },
    };

    const result = registry.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('safeParse returns error for invalid events', () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const invalidEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 'not-a-number' } },
    };

    const result = registry.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('withValidation middleware', () => {
  it('allows valid events to pass through', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('issue.opened', handler);

    await router.dispatch({
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 1 } },
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('throws WebhookValidationError for invalid events', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('issue.opened', handler);

    await expect(
      router.dispatch({
        id: 'evt_123',
        type: 'issue.opened',
        data: { object: { id: 'not-a-number' } },
      })
    ).rejects.toThrow(WebhookValidationError);

    expect(handler).not.toHaveBeenCalled();
  });

  it('allows unknown events by default', async () => {
    const registry = new SchemaRegistry();

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('unknown.event', handler);

    await router.dispatch({
      id: 'evt_123',
      type: 'unknown.event',
      data: { object: { anything: 'goes' } },
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls onError handler when validation fails', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const onError = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry, { onError }))
      .on('issue.opened', vi.fn());

    await expect(
      router.dispatch({
        id: 'evt_123',
        type: 'issue.opened',
        data: { object: { id: 'invalid' } },
      })
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(WebhookValidationError);
  });

  it('throws UnknownEventTypeError when allowUnknownEvents is false', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry, { allowUnknownEvents: false }))
      .on('unknown.event', handler);

    await expect(
      router.dispatch({
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: {} },
      })
    ).rejects.toThrow(UnknownEventTypeError);

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls onError handler for unknown events when allowUnknownEvents is false', async () => {
    const registry = new SchemaRegistry();

    const onError = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry, { allowUnknownEvents: false, onError }))
      .on('unknown.event', vi.fn());

    await expect(
      router.dispatch({
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: {} },
      })
    ).rejects.toThrow(UnknownEventTypeError);

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(UnknownEventTypeError);
  });

  it('propagates validated/transformed event data to handlers', async () => {
    // Schema with transformation: adds a default value
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({
        id: z.number(),
        priority: z.number().default(5),
      })
    );
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('issue.opened', handler);

    await router.dispatch({
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 1 } }, // No priority provided
    });

    expect(handler).toHaveBeenCalledOnce();
    const receivedEvent = handler.mock.calls[0][0];
    expect(receivedEvent.data.object.priority).toBe(5); // Default value applied
  });

  it('removes unknown fields when schema uses strip mode', async () => {
    // Schema with strip mode: removes unknown fields silently
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({
        id: z.number(),
        title: z.string(),
      }).strip() // This will remove any unknown fields
    );
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('issue.opened', handler);

    await router.dispatch({
      id: 'evt_123',
      type: 'issue.opened',
      data: {
        object: {
          id: 1,
          title: 'Test Issue',
          extraField: 'should be removed', // This should be stripped
        },
      },
    });

    expect(handler).toHaveBeenCalledOnce();
    const receivedEvent = handler.mock.calls[0][0];
    expect(receivedEvent.data.object).toEqual({
      id: 1,
      title: 'Test Issue',
      // extraField should not be present
    });
    expect((receivedEvent.data.object as Record<string, unknown>).extraField).toBeUndefined();
  });

  it('applies transformations to field values', async () => {
    // Schema with transformation: transforms string to uppercase
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({
        id: z.number(),
        title: z.string().transform((val) => val.toUpperCase()),
      })
    );
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('issue.opened', handler);

    await router.dispatch({
      id: 'evt_123',
      type: 'issue.opened',
      data: {
        object: {
          id: 1,
          title: 'lowercase title',
        },
      },
    });

    expect(handler).toHaveBeenCalledOnce();
    const receivedEvent = handler.mock.calls[0][0];
    expect(receivedEvent.data.object.title).toBe('LOWERCASE TITLE'); // Transformed to uppercase
  });

  it('mutates the original event object rather than creating a new one', async () => {
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({
        id: z.number(),
        priority: z.number().default(5),
      })
    );
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    let eventBeforeValidation: unknown = null;
    let eventAfterValidation: unknown = null;

    // Middleware that captures the event before validation
    const captureMiddleware: (event: unknown, next: () => Promise<void>) => Promise<void> = async (event, next) => {
      eventBeforeValidation = event;
      await next();
      eventAfterValidation = event;
    };

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(captureMiddleware)
      .use(withValidation(registry))
      .on('issue.opened', handler);

    const originalEvent = {
      id: 'evt_123',
      type: 'issue.opened',
      data: { object: { id: 1 } },
    };

    await router.dispatch(originalEvent);

    // The event object identity should remain the same
    expect(eventBeforeValidation).toBe(eventAfterValidation);
    expect(eventBeforeValidation).toBe(originalEvent);

    // But the contents should have been mutated
    expect((eventAfterValidation as Record<string, { object: { priority: number } }>).data.object.priority).toBe(5);
  });

  it('handles multiple transformations in sequence', async () => {
    // Complex schema with multiple transformations
    const issueOpened = defineEvent(
      'issue.opened',
      z.object({
        id: z.number(),
        title: z.string().transform((val) => val.trim()),
        priority: z.number().default(5),
        tags: z.array(z.string()).default([]),
      })
    );
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const handler = vi.fn();
    const router = new WebhookRouter()
      .use(withValidation(registry))
      .on('issue.opened', handler);

    await router.dispatch({
      id: 'evt_123',
      type: 'issue.opened',
      data: {
        object: {
          id: 1,
          title: '  Padded Title  ',
          // priority and tags not provided
        },
      },
    });

    expect(handler).toHaveBeenCalledOnce();
    const receivedEvent = handler.mock.calls[0][0];
    expect(receivedEvent.data.object).toEqual({
      id: 1,
      title: 'Padded Title', // Trimmed
      priority: 5, // Default applied
      tags: [], // Default applied
    });
  });
});

describe('createZodVerifier', () => {
  it('validates events after verification', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const mockVerifier = vi.fn().mockResolvedValue({
      event: {
        id: 'evt_123',
        type: 'issue.opened',
        data: { object: { id: 1 } },
      },
    });

    const verifier = createZodVerifier({
      verifier: mockVerifier,
      registry,
    });

    const result = await verifier('payload', {});
    expect(result.event.type).toBe('issue.opened');
  });

  it('throws WebhookValidationError for invalid events', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const mockVerifier = vi.fn().mockResolvedValue({
      event: {
        id: 'evt_123',
        type: 'issue.opened',
        data: { object: { id: 'not-a-number' } },
      },
    });

    const verifier = createZodVerifier({
      verifier: mockVerifier,
      registry,
    });

    await expect(verifier('payload', {})).rejects.toThrow(WebhookValidationError);
  });

  it('passes through unknown events when allowUnknownEvents is true', async () => {
    const registry = new SchemaRegistry();

    const mockVerifier = vi.fn().mockResolvedValue({
      event: {
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: { anything: 'goes' } },
      },
    });

    const verifier = createZodVerifier({
      verifier: mockVerifier,
      registry,
      allowUnknownEvents: true,
    });

    const result = await verifier('payload', {});
    expect(result.event.type).toBe('unknown.event');
  });

  it('throws UnknownEventTypeError when allowUnknownEvents is false', async () => {
    const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
    const registry = new SchemaRegistry().registerAll({ issueOpened });

    const mockVerifier = vi.fn().mockResolvedValue({
      event: {
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: {} },
      },
    });

    const verifier = createZodVerifier({
      verifier: mockVerifier,
      registry,
      allowUnknownEvents: false,
    });

    await expect(verifier('payload', {})).rejects.toThrow(UnknownEventTypeError);
  });
});

describe('baseEventSchema', () => {
  it('validates basic event structure', () => {
    const validEvent = {
      id: 'evt_123',
      type: 'some.event',
      data: { object: { key: 'value' } },
    };

    expect(baseEventSchema.parse(validEvent)).toEqual(validEvent);
  });

  it('rejects events missing required fields', () => {
    expect(() => baseEventSchema.parse({ type: 'test' })).toThrow();
    expect(() => baseEventSchema.parse({ id: '123' })).toThrow();
    expect(() => baseEventSchema.parse({ id: '123', type: 'test' })).toThrow();
  });
});
