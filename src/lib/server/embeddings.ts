/**
 * src/lib/server/embeddings.ts
 *
 * Local embedding pipeline using Xenova/bge-small-en-v1.5 via @huggingface/transformers.
 * Runs server-side only (import from +page.server.ts or +server.ts).
 *
 * Singleton pipeline is initialized once and reused across requests.
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

let _pipe: FeatureExtractionPipeline | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
	if (!_pipe) {
		_pipe = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
			dtype: 'fp32'
		});
	}
	return _pipe;
}

/**
 * Embed a single string → 384-dim normalized vector.
 */
export async function embed(text: string): Promise<number[]> {
	const pipe = await getPipeline();
	const output = await pipe(text, { pooling: 'mean', normalize: true });
	return Array.from(output.data as Float32Array);
}

/**
 * Embed multiple strings in a single pipeline call (batched).
 * Returns vectors in the same order as the input.
 */
export async function embedMany(texts: string[]): Promise<number[][]> {
	if (texts.length === 0) return [];
	const pipe = await getPipeline();
	const output = await pipe(texts, { pooling: 'mean', normalize: true });
	// output is [num_texts, 384] shape; flatten row by row
	const dim = 384;
	return Array.from({ length: texts.length }, (_, i) =>
		Array.from(output.data.slice(i * dim, (i + 1) * dim) as Float32Array)
	);
}