import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse, parseBytes } from '../src/lib/parse/index.ts';
import { diagnose } from '../src/lib/match/engine.ts';
import type { Catalog } from '../src/lib/match/catalog.ts';
import catalogJson from '../src/data/signatures.json';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const fixturesDir = join(root, 'fixtures');
export const catalog = catalogJson as unknown as Catalog;

export interface FixtureCase {
	dir: string;
	expect: string[];
	noise?: string[];
	verdict?: string;
	healthy?: boolean;
	prompts?: string[];
	source: string;
}

export const index: { cases: FixtureCase[] } = JSON.parse(
	readFileSync(join(fixturesDir, 'index.json'), 'utf8')
);

export function loadDir(dir: string) {
	const full = join(fixturesDir, dir);
	return readdirSync(full)
		.filter((name) => statSync(join(full, name)).isFile())
		.sort()
		.map((name) => parseBytes(name, new Uint8Array(readFileSync(join(full, name)))));
}

export function runCase(dir: string) {
	const a = analyse(loadDir(dir));
	return { analysis: a, result: diagnose(a, catalog) };
}

export function listFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...listFiles(p));
		else out.push(p);
	}
	return out;
}
