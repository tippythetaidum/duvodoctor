// Rebuilds fixtures/ from the unredacted originals in fixtures-raw/ (kept out of git).
// fixtures-raw/sources.json maps originals to fixture paths:
//   [{ "from": ["forum-logs/2616-38.txt"], "to": "forum/2616-38/client.log" }]
// fixtures-raw/replacements.txt holds extra "from => to" swaps for private folder names.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from '../src/lib/redact/redact.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const rawDir = join(root, 'fixtures-raw');
const outDir = join(root, 'fixtures');

if (!existsSync(join(rawDir, 'sources.json'))) {
	console.error('fixtures-raw/sources.json not found. The originals only live on the maintainer machine.');
	process.exit(1);
}

interface Source {
	from: string[];
	to: string;
}

const sources: Source[] = JSON.parse(readFileSync(join(rawDir, 'sources.json'), 'utf8'));
const replacements: [string, string][] = existsSync(join(rawDir, 'replacements.txt'))
	? readFileSync(join(rawDir, 'replacements.txt'), 'utf8')
			.replace(/^\uFEFF/, '')
			.split(/\r?\n/)
			.filter((l) => l.includes(' => '))
			.map((l) => l.split(' => ') as [string, string])
	: [];

let count = 0;
for (const s of sources) {
	let text = s.from.map((f) => readFileSync(join(rawDir, f), 'utf8').replace(/^\uFEFF/, '')).join('');
	for (const [from, to] of replacements) text = text.split(from).join(to);
	const out = redact(text).text;
	const target = join(outDir, s.to);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, out);
	count++;
}
console.log(`wrote ${count} fixture files`);
