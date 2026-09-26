import type { Analysis, ParsedFile } from '../types.ts';
import { decodeBytes, decodeText, type Decoded } from './decode.ts';
import { splitLines } from './lines.ts';
import { kindFromContent, kindFromName } from './detect.ts';
import { parseCrashes } from './crash.ts';
import { parseSettings, parseState } from './config.ts';
import { buildSetup } from './setup.ts';

function fromDecoded(name: string, d: Decoded): ParsedFile {
	const base: ParsedFile = {
		name,
		kind: 'unknown',
		kindFrom: 'content',
		size: d.size,
		truncated: d.truncated,
		binary: d.binary,
		empty: false,
		encoding: d.encoding,
		lines: [],
		crashes: [],
		settings: null,
		state: null
	};
	if (d.binary) return base;
	if (d.text.trim() === '') {
		const named = kindFromName(name);
		return { ...base, empty: true, kind: named ?? 'unknown', kindFrom: named ? 'name' : 'content' };
	}
	const lines = splitLines(d.text);
	const named = kindFromName(name);
	const kind = named ?? kindFromContent(d.text, lines);
	const file: ParsedFile = { ...base, lines, kind, kindFrom: named ? 'name' : 'content' };
	file.crashes = parseCrashes(lines);
	if (kind === 'settings') file.settings = parseSettings(lines);
	if (kind === 'state') file.state = parseState(d.text);
	return file;
}

export function parseBytes(name: string, bytes: Uint8Array, size?: number): ParsedFile {
	return fromDecoded(name, decodeBytes(bytes, size));
}

export function parseText(name: string, text: string): ParsedFile {
	return fromDecoded(name, decodeText(text));
}

export function analyse(files: ParsedFile[]): Analysis {
	return { files, setup: buildSetup(files) };
}
