import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			// daisyui package.json has "browser": "./daisyui.css" which causes
			// @tailwindcss/vite to try importing a CSS file as a JS module.
			// Point directly to the JS plugin entry instead.
			daisyui: fileURLToPath(new URL('./node_modules/daisyui/index.js', import.meta.url))
		}
	}
});
