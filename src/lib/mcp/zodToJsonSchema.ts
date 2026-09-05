/**
 * @module zodToJsonSchema
 * @description
 * High-performance, zero-dependency introspection converter that transforms Zod schemas
 * into strict JSON Schemas conforming to the Model Context Protocol (MCP 2024-11-05) standard.
 *
 * Supports string, number, boolean, array, enum, and nested object types, handling optionality,
 * default values, and JSDoc-derived descriptions via `.describe()`.
 *
 * @since 0.4.0
 */

import type { z } from 'zod';
import type { McpJsonSchema } from '@/core/extensions/types';

interface SchemaPropertyDescriptor {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
  default?: unknown;
}

/**
 * Extracts inner type, default value, optionality flag, and description from any Zod node.
 */
function unwrapZodType(schema: any): {
  coreSchema: any;
  isOptional: boolean;
  defaultValue?: unknown;
  description?: string;
} {
  let curr = schema;
  let isOptional = false;
  let defaultValue: unknown = undefined;
  let description = curr?.description || curr?._def?.description;

  while (curr && curr._def) {
    const def = curr._def;
    const typeName = def.typeName || def.type;

    if (!description && (curr.description || def.description)) {
      description = curr.description || def.description;
    }

    if (typeName === 'ZodOptional' || typeName === 'optional') {
      isOptional = true;
      curr = def.innerType;
    } else if (typeName === 'ZodNullable' || typeName === 'nullable') {
      isOptional = true;
      curr = def.innerType;
    } else if (typeName === 'ZodDefault' || typeName === 'default') {
      isOptional = true;
      defaultValue = typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
      curr = def.innerType;
    } else if (typeName === 'ZodEffects' || typeName === 'effects') {
      curr = def.schema;
    } else {
      break;
    }
  }

  return {
    coreSchema: curr,
    isOptional,
    defaultValue,
    description,
  };
}

/**
 * Converts a single primitive or structural Zod schema node to a JSON Schema property definition.
 */
function convertProperty(schema: any): SchemaPropertyDescriptor {
  const { coreSchema, defaultValue, description } = unwrapZodType(schema);
  const def = coreSchema?._def || {};
  const typeName = def.typeName || def.type;

  const prop: SchemaPropertyDescriptor = {
    type: 'string',
  };

  if (description) {
    prop.description = description;
  }
  if (defaultValue !== undefined) {
    prop.default = defaultValue;
  }

  switch (typeName) {
    case 'ZodString':
    case 'string':
      prop.type = 'string';
      break;

    case 'ZodNumber':
    case 'number':
      prop.type = 'number';
      break;

    case 'ZodBoolean':
    case 'boolean':
      prop.type = 'boolean';
      break;

    case 'ZodEnum':
    case 'enum': {
      prop.type = 'string';
      if (Array.isArray(coreSchema.options)) {
        prop.enum = coreSchema.options;
      } else if (def.entries && typeof def.entries === 'object') {
        prop.enum = Object.keys(def.entries);
      } else if (Array.isArray(def.values)) {
        prop.enum = def.values;
      }
      break;
    }

    case 'ZodArray':
    case 'array': {
      prop.type = 'array';
      const elementSchema = def.type || def.element;
      if (elementSchema) {
        prop.items = convertProperty(elementSchema) as unknown as Record<string, unknown>;
      } else {
        prop.items = { type: 'string' };
      }
      break;
    }

    case 'ZodObject':
    case 'object': {
      prop.type = 'object';
      break;
    }

    default:
      prop.type = 'string';
      break;
  }

  return prop;
}

/**
 * Transforms a top-level Zod object schema into an MCP-compliant JSON Schema.
 *
 * @param schema - Top-level Zod schema (typically z.object({...})).
 * @returns McpJsonSchema compatible with tools/list protocol requirements.
 */
export function zodToMcpJsonSchema(schema: z.ZodTypeAny): McpJsonSchema {
  const { coreSchema } = unwrapZodType(schema);
  const properties: Record<string, SchemaPropertyDescriptor> = {};
  const required: string[] = [];

  const shape =
    typeof coreSchema?.shape === 'function'
      ? coreSchema.shape()
      : coreSchema?.shape || coreSchema?._def?.shape;

  if (shape && typeof shape === 'object') {
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const { isOptional } = unwrapZodType(fieldSchema);
      properties[key] = convertProperty(fieldSchema);

      if (!isOptional) {
        required.push(key);
      }
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Formats validation issues produced by Zod safeParse into human-readable text for MCP error returns.
 */
export function formatZodIssues(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `- [${path}] ${issue.message}`;
  });
  return `Schema validation failed:\n${lines.join('\n')}`;
}
