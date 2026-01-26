import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';

const variablesPath = path.resolve('src/styles/_variables').replace(/\\/g, '/');

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			sass: {
				additionalData: (source: string, filename: string) => {
					// Skip injection for the main styles file (it already imports variables)
					// and for the variables file itself
					if (filename.includes('_styles.sass') || filename.includes('_variables.sass')) {
						return source;
					}
					// For Svelte components, the style content preserves indentation from the file
					// We need to dedent the content to remove the common leading whitespace
					const lines = source.split('\n');
					// Find the minimum indentation (ignoring empty lines)
					let minIndent = Infinity;
					for (const line of lines) {
						if (line.trim().length === 0) continue;
						const match = line.match(/^(\s*)/);
						if (match && match[1].length < minIndent) {
							minIndent = match[1].length;
						}
					}
					// Dedent all lines by the minimum indentation
					const dedentedLines = lines.map(line => {
						if (line.trim().length === 0) return '';
						return line.slice(minIndent);
					});
					const dedentedSource = dedentedLines.join('\n');
					return `@import "${variablesPath}"\n\n${dedentedSource}`;
				},
				silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api', 'if-function']
			},
			scss: {
				silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api', 'if-function']
			}
		}
	}
});
