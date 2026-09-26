import { describe, expect, it } from 'vitest';
import { buildReport, excerpt, fenceFor } from '../src/lib/report/forum.ts';
import { runCase } from './helpers.ts';

const fields = { cpu: 'Ryzen 7 7800X3D', description: 'It closes.', steps: '', expected: '' };

describe('forum report', () => {
	it("uses Jediweirdo's layout", () => {
		const { analysis, result } = runCase('forum/3314-1');
		const r = buildReport(analysis, result, fields);
		const headings = r.redacted.text.split('\n').filter((l) => l.startsWith('## '));
		expect(headings).toEqual([
			'## Version Information and Specs',
			'## Describe The Issue',
			'## Steps to Reproduce',
			'## Expected Behavior',
			'## Logs'
		]);
		expect(r.redacted.text).toContain('**Luduvo Version:** Luduvo 44 (240800eaa6d4)');
		expect(r.redacted.text).toContain('**CPU:** Ryzen 7 7800X3D');
		expect(r.redacted.text).toContain('Intel(R) UHD Graphics 620');
		expect(r.category).toBe('Engine');
	});

	it('quotes the startup header, every error with context, and folds noise', () => {
		const { analysis, result } = runCase('joe/healthy-session');
		const i = analysis.files.findIndex((f) => f.name === 'client.log');
		const text = excerpt(analysis.files[i], i, result);
		expect(text.split('\n')[0]).toContain('Luduvo 44-dirty');
		expect(text).toContain('Renderer up: 2560x1406');
		expect(text).not.toContain('texel walks truncated');
		expect(text).toContain('Quit.');
		const r = buildReport(analysis, result, fields);
		expect(r.redacted.text).toContain('533 × Razor shadow warnings');
	});

	it('includes the evidence lines for warnings that caused a match', () => {
		const { analysis, result } = runCase('forum/3314-1');
		const text = excerpt(analysis.files[0], 0, result);
		expect(text).toContain('non-conformant Vulkan 1.3 driver');
		expect(text).toContain('ClientApp::Init failed');
	});

	it('includes all of crash.log', () => {
		const { analysis, result } = runCase('forum/3221-14');
		const i = analysis.files.findIndex((f) => f.kind === 'crash');
		expect(excerpt(analysis.files[i], i, result).split('\n').length).toBe(15);
	});

	it('redacts what the player typed as well as the logs', () => {
		const { analysis, result } = runCase('forum/3314-1');
		const r = buildReport(analysis, result, { ...fields, description: 'email me at me@example.com' });
		expect(r.redacted.text).toContain('email me at <email>');
		expect(r.redacted.text).not.toContain('me@example.com');
	});

	it('can drop the server address', () => {
		const { analysis, result } = runCase('joe/healthy-session');
		expect(buildReport(analysis, result, fields).redacted.text).toContain('5.78.177.147');
		expect(buildReport(analysis, result, fields, { removeServer: true }).redacted.text).not.toContain('5.78.177.147');
	});

	it('picks a fence longer than any backticks in the log', () => {
		expect(fenceFor('plain')).toBe('```');
		expect(fenceFor('a ```` b')).toBe('`````');
	});

	it('sends Studio-only problems to the Studio category', () => {
		const { analysis, result } = runCase('forum/1427-1');
		expect(buildReport(analysis, result, fields).category).toBe('Studio');
	});
});
