import type { Level, LogLine } from '../types.ts';

export const MAX_LINE_CHARS = 8192;

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} - (?:\d{2}:\d{2}:\d{2}\.\d{3} )?\[(INFO|WARNING|ERROR)\]/;
const BARE_LEVEL = /^\[(INFO|WARNING|ERROR)\]/;
// two writers sometimes land on one line; a second full timestamp mid-line starts a new entry
const EMBEDDED = /(?<=\S) ?(?=\d{4}-\d{2}-\d{2} - \d{2}:\d{2}:\d{2}\.\d{3} \[(?:INFO|WARNING|ERROR)\])/;

export function splitLines(text: string): LogLine[] {
	const out: LogLine[] = [];
	const rawLines = text.split(/\r\n|\r|\n/);
	if (rawLines.length && rawLines[rawLines.length - 1] === '') rawLines.pop();
	let n = 0;
	for (const raw of rawLines) {
		const parts = raw.length > 40 && EMBEDDED.test(raw) ? raw.split(EMBEDDED) : [raw];
		for (const part of parts) {
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
	return out;
}
