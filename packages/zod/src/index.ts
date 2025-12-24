import type { WebhookEvent, Middleware, Verifier, VerifyResult } from '@tayori/core';
import { z } from 'zod';

/**
 * Base Zod schema for webhook events
 */
export const baseEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.unknown(),
  }),
});

/**
 * Create a typed event schema with a specific event type and data object schema
 *
 * @param type - The event type string (e.g., 'issue.opened')
 * @param dataObjectSchema - Zod schema for the data.object property
 * @returns A Zod schema for the complete event
 *
 * @example
 * ```typescript
 * const issueOpenedSchema = createEventSchema('issue.opened', z.object({
 *   id: z.number(),
 *   title: z.string(),
 *   body: z.string().optional(),
 * }));
 *
 * type IssueOpenedEvent = z.infer<typeof issueOpenedSchema>;
 * ```
 */
export function createEventSchema<
  TType extends string,
  TDataObject extends z.ZodTypeAny,
>(type: TType, dataObjectSchema: TDataObject) {
  // Use baseEventSchema.shape.id to keep the id definition DRY
  return z.object({
    id: baseEventSchema.shape.id,
    type: z.literal(type),
    data: z.object({
      object: dataObjectSchema,
    }),
  });
}

/**
 * Event schema definition for building event maps
 */
export interface EventSchemaDefinition<
  TType extends string = string,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  type: TType;
  schema: TSchema;
}

/**
 * Define an event schema for use with createEventMap
 *
 * @param type - The event type string
 * @param dataObjectSchema - Zod schema for the data.object property
 * @returns An event schema definition
 *
 * @example
 * ```typescript
 * const issueOpened = defineEvent('issue.opened', z.object({
 *   id: z.number(),
 *   title: z.string(),
 * }));
 * ```
 */
export function defineEvent<TType extends string, TDataObject extends z.ZodTypeAny>(
  type: TType,
  dataObjectSchema: TDataObject
): EventSchemaDefinition<TType, ReturnType<typeof createEventSchema<TType, TDataObject>>> {
  return {
    type,
    schema: createEventSchema(type, dataObjectSchema),
  };
}

/**
 * Infer event type from schema definition
 */
export type InferEventType<T extends EventSchemaDefinition> = z.infer<T['schema']>;

/**
 * Create an event map type from event schema definitions
 *
 * @example
 * ```typescript
 * const issueOpened = defineEvent('issue.opened', z.object({ id: z.number() }));
 * const issueClosed = defineEvent('issue.closed', z.object({ id: z.number() }));
 *
 * const schemas = { issueOpened, issueClosed };
 * type GitHubEventMap = InferEventMap<typeof schemas>;
 * // Results in:
 * // {
 * //   'issue.opened': { id: string; type: 'issue.opened'; data: { object: { id: number } } };
 * //   'issue.closed': { id: string; type: 'issue.closed'; data: { object: { id: number } } };
 * // }
 * ```
 */
export type InferEventMap<T extends Record<string, EventSchemaDefinition>> = {
  [K in keyof T as T[K]['type']]: InferEventType<T[K]>;
};

/**
 * Schema registry for runtime validation
 */
export class SchemaRegistry<TEventMap extends Record<string, WebhookEvent> = Record<string, WebhookEvent>> {
  private schemas: Map<string, z.ZodTypeAny> = new Map();

  /**
   * Register a schema for an event type
   */
  register<TType extends keyof TEventMap & string>(
    type: TType,
    schema: z.ZodTypeAny
  ): this {
    this.schemas.set(type, schema);
    return this;
  }

  /**
   * Register multiple event definitions
   */
  registerAll(definitions: Record<string, EventSchemaDefinition>): this {
    for (const def of Object.values(definitions)) {
      this.schemas.set(def.type, def.schema);
    }
    return this;
  }

  /**
   * Get the schema for an event type
   */
  get(type: string): z.ZodTypeAny | undefined {
    return this.schemas.get(type);
  }

  /**
   * Check if a schema exists for an event type
   */
  has(type: string): boolean {
    return this.schemas.has(type);
  }

  /**
   * Validate an event against its registered schema
   *
   * @throws ZodError if validation fails
   */
  validate(event: WebhookEvent): WebhookEvent {
    const schema = this.schemas.get(event.type);
    if (!schema) {
      return event; // No schema registered, pass through
    }
    return schema.parse(event);
  }

  /**
   * Safely validate an event, returning a result object
   */
  safeParse(event: WebhookEvent): z.SafeParseReturnType<WebhookEvent, WebhookEvent> {
    const schema = this.schemas.get(event.type);
    if (!schema) {
      return { success: true, data: event };
    }
    return schema.safeParse(event);
  }
}

/**
 * Validation error class for webhook events
 */
export class WebhookValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError: z.ZodError,
    public readonly eventType: string
  ) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

/**
 * Error thrown when an unregistered event type is received and allowUnknownEvents is false
 */
export class UnknownEventTypeError extends Error {
  constructor(public readonly eventType: string) {
    super(`Unknown event type: "${eventType}"`);
    this.name = 'UnknownEventTypeError';
  }
}

/**
 * Options for validation middleware
 */
export interface ValidationMiddlewareOptions {
  /**
   * Whether to skip validation for events without registered schemas
   * @default true
   */
  allowUnknownEvents?: boolean;

  /**
   * Custom error handler for validation or unknown event errors
   */
  onError?: (error: WebhookValidationError | UnknownEventTypeError) => void | Promise<void>;
}

/**
 * Create a validation middleware using a schema registry
 *
 * @param registry - The schema registry to use for validation
 * @param options - Validation options
 * @returns A middleware function
 *
 * @example
 * ```typescript
 * const registry = new SchemaRegistry()
 *   .registerAll({ issueOpened, issueClosed });
 *
 * const router = new WebhookRouter()
 *   .use(withValidation(registry))
 *   .on('issue.opened', async (event) => {
 *     // event is validated before reaching this handler
 *   });
 * ```
 */
export function withValidation<TEventMap extends Record<string, WebhookEvent>>(
  registry: SchemaRegistry<TEventMap>,
  options: ValidationMiddlewareOptions = {}
): Middleware<WebhookEvent> {
  const { allowUnknownEvents = true, onError } = options;

  return async (event, next) => {
    // Reject unregistered events when allowUnknownEvents is false
    if (!registry.has(event.type)) {
      if (!allowUnknownEvents) {
        const error = new UnknownEventTypeError(event.type);
        if (onError) {
          await onError(error);
        }
        throw error;
      }
      return next();
    }

    const result = registry.safeParse(event);

    if (!result.success) {
      const error = new WebhookValidationError(
        `Validation failed for event type "${event.type}": ${result.error.message}`,
        result.error,
        event.type
      );

      if (onError) {
        await onError(error);
      }

      throw error;
    }

    // Propagate validated/transformed data by mutating the original event object
    // This ensures transformations, defaults, and stripped keys are reflected
    const validatedEvent = result.data;
    for (const key of Object.keys(event) as Array<keyof typeof event>) {
      delete event[key];
    }
    Object.assign(event, validatedEvent);

    return next();
  };
}

/**
 * Options for Zod verifier wrapper
 */
export interface ZodVerifierOptions<T extends WebhookEvent> {
  /**
   * The underlying verifier to wrap
   */
  verifier: Verifier<T>;

  /**
   * The schema registry for validation
   */
  registry: SchemaRegistry;

  /**
   * Whether to skip validation for events without registered schemas
   * @default true
   */
  allowUnknownEvents?: boolean;
}

/**
 * Create a verifier that validates events using Zod schemas after signature verification
 *
 * @param options - Verifier options
 * @returns A new verifier that validates events
 *
 * @example
 * ```typescript
 * import { createStripeVerifier } from '@tayori/stripe';
 *
 * const registry = new SchemaRegistry()
 *   .registerAll({ paymentIntentSucceeded });
 *
 * const verifier = createZodVerifier({
 *   verifier: createStripeVerifier({ secret: 'whsec_...' }),
 *   registry,
 * });
 * ```
 */
export function createZodVerifier<T extends WebhookEvent>(
  options: ZodVerifierOptions<T>
): Verifier<T> {
  const { verifier, registry, allowUnknownEvents = true } = options;

  return async (payload, headers): Promise<VerifyResult<T>> => {
    // First, verify signature and parse event
    const result = await verifier(payload, headers);

    // Reject unregistered events when allowUnknownEvents is false
    if (!registry.has(result.event.type)) {
      if (!allowUnknownEvents) {
        throw new UnknownEventTypeError(result.event.type);
      }
      return result;
    }

    const parseResult = registry.safeParse(result.event);

    if (!parseResult.success) {
      throw new WebhookValidationError(
        `Event validation failed for "${result.event.type}": ${parseResult.error.message}`,
        parseResult.error,
        result.event.type
      );
    }

    return { event: parseResult.data as T };
  };
}
