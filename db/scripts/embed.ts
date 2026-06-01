/**
 * db/scripts/embed.ts — re-exports the canonical server embedding utility.
 * Kept as a separate file so seed.ts imports stay unchanged.
 */
export { embed, embedMany } from '../../src/lib/server/embeddings';
