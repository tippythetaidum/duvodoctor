import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fixturesDir, listFiles, root } from './helpers.ts';

const personalFile = join(root, 'fixtures-raw', 'personal-strings.txt');
const personal = existsSync(personalFile)
	? readFileSync(personalFile, 'utf8')
			.replace(/^\uFEFF/, '')
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('#'))
	: [];

const committedDirs = ['fixtures', 'src', 'static', 'tests', 'scripts'].map((d) => join(root, d));
const committedRootFiles = ['README.md', 'package.json', 'LICENSE', 'vite.config.ts'].map((f) => join(root, f));

describe('personal strings', () => {
	it.skipIf(personal.length === 0)('never appear in fixtures or anything else committed', () => {
		const files = [...committedDirs.flatMap((d) => (existsSync(d) ? listFiles(d) : [])), ...committedRootFiles];
		const hits: string[] = [];
		for (const file of files) {
			const text = readFileSync(file, 'utf8').toLowerCase();
			personal.forEach((p, i) => {
				if (text.includes(p.toLowerCase())) hits.push(`${relative(root, file)} contains personal string #${i}`);
			});
		}
		expect(hits).toEqual([]);
	});

	it('has fixtures to check', () => {
		expect(listFiles(fixturesDir).length).toBeGreaterThan(50);
	});
});

describe('log text is never rendered as HTML', () => {
	it('has no raw HTML sinks in the source', () => {
		const sinks = /\{@html|innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment/;
		const offenders = listFiles(join(root, 'src'))
			.filter((f) => /\.(svelte|ts|js)$/.test(f))
			.filter((f) => sinks.test(readFileSync(f, 'utf8')))
			.map((f) => relative(root, f));
		expect(offenders).toEqual([]);
	});
});
