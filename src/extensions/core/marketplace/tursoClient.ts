/**
 * @module TursoRegistryClient
 * @description
 * High-performance client that interfaces directly with the
 * Turso libSQL edge database over the standard Hrana HTTP pipeline protocol (`/v2/pipeline`).
 *
 * Re-exports the native Turso registry implementation from `@/lib/registry/tursoRegistryClient`
 * to maintain seamless backwards compatibility for the marketplace extension.
 *
 * @since 0.2.0
 */

export * from '@/lib/registry/tursoRegistryClient';
