/**
 * Convert a human-readable name/title into a URL-safe slug.
 * e.g. "My Template #1!" → "my-template-1"
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/[\s-]+/g, '-')
		.replace(/^-|-$/g, '');
}
