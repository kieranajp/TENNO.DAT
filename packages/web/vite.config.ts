import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			sass: {
				silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function']
			}
		}
	}
});
