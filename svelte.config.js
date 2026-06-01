import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	// bytemd ships pre-compiled Svelte 3/4 components; keep legacy `new Component()` API.
	compilerOptions: {
		compatibility: { componentApi: 4 }
	},

	kit: {
		adapter: adapter(),
		alias: {
			$lib: './src/lib',
			'@src': './src',
			'@db': './db',
			'~types': './types'
		}
	}
};

export default config;
