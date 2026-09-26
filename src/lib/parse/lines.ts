import type { Level, LogLine } from '../types.ts';

export const MAX_LINE_CHARS = 8192;
/** A 25 MB healthy log is about 230,000 lines; anything far past that is junk or an attack. */
export const MAX_LINES = 400_000;
const MAX_PARTS = 8;

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} - (?:\d{2}:\d{2}:\d{2}\.\d{3} )?\[(INFO|WARNING|ERROR)\]/;
const BARE_LEVEL = /^\[(INFO|WARNING|ERROR)\]/;
// two writers sometimes land on one line; a second full timestamp mid-line starts a new entry
const EMBEDDED = /(?<=\S) ?(?=\d{4}-\d{2}-\d{2} - \d{2}:\d{2}:\d{2}\.\d{3} \[(?:INFO|WARNING|ERROR)\])/;

export interface SplitResult {
	lines: LogLine[];
	capped: boolean;
}

function splitEmbedded(raw: string): string[] {
	if (raw.length <= 40 || raw.length > MAX_LINE_CHARS * 2 || !EMBEDDED.test(raw)) return [raw];
	const parts = raw.split(EMBEDDED);
	if (parts.length <= MAX_PARTS) return parts;
	return [...parts.slice(0, MAX_PARTS - 1), parts.slice(MAX_PARTS - 1).join(' ')];
}

export function splitLines(text: string): SplitResult {
	const out: LogLine[] = [];
	const rawLines = text.split(/\r*\n|\r/);
	if (rawLines.length && rawLines[rawLines.length - 1] === '') rawLines.pop();
	let n = 0;
	for (const raw of rawLines) {
		for (const part of splitEmbedded(raw)) {
			if (n >= MAX_LINES) return { lines: out, capped: true };
			n++;
			let body = part;
			let clipped = false;
			if (body.length > MAX_LINE_CHARS) {
				body = body.slice(0, MAX_LINE_CHARS);
				clipped = true;
			}
			const ts = TIMESTAMP.exec(body);
			const bare = ts ? null : BARE_LEVEL.exec(body);
			const level = ((ts ?? bare)?.[1] as Level | undefined) ?? null;
			out.push({ n, text: body, level, timestamped: ts !== null, clipped });
		}
	}
	return { lines: out, capped: false };
}
