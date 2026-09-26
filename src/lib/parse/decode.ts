import type { Encoding } from '../types.ts';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface Decoded {
	text: string;
	encoding: Encoding;
	binary: boolean;
	truncated: boolean;
	size: number;
}

function sniffUtf16(bytes: Uint8Array): Encoding | null {
	const n = Math.min(bytes.length, 4096);
	if (n < 4) return null;
	let evenZero = 0;
	let oddZero = 0;
	for (let i = 0; i < n; i++) {
		if (bytes[i] === 0) {
			if (i % 2 === 0) evenZero++;
			else oddZero++;
		}
	}
	const half = n / 2;
	if (oddZero > half * 0.4 && evenZero < half * 0.05) return 'utf-16le';
	if (evenZero > half * 0.4 && oddZero < half * 0.05) return 'utf-16be';
	return null;
}

function looksBinary(bytes: Uint8Array): boolean {
	const n = Math.min(bytes.length, 65536);
	if (n === 0) return false;
	let nul = 0;
	let control = 0;
	for (let i = 0; i < n; i++) {
		const b = bytes[i];
		if (b === 0) nul++;
		else if (b < 32 && b !== 9 && b !== 10 && b !== 13 && b !== 12 && b !== 27) control++;
	}
	return nul / n > 0.01 || control / n > 0.1;
}

/** `size` is the full size before any truncation, when the caller sliced the input. */
export function decodeBytes(input: Uint8Array, size = input.length): Decoded {
	const truncated = size > MAX_FILE_BYTES || input.length > MAX_FILE_BYTES;
	let bytes = input.length > MAX_FILE_BYTES ? input.subarray(0, MAX_FILE_BYTES) : input;

	let encoding: Encoding = 'utf-8';
	let offset = 0;
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		offset = 3;
	} else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		encoding = 'utf-16le';
		offset = 2;
	} else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		encoding = 'utf-16be';
		offset = 2;
	} else {
		encoding = sniffUtf16(bytes) ?? 'utf-8';
	}
	bytes = bytes.subarray(offset);

	if (encoding === 'utf-8' && looksBinary(bytes)) {
		return { text: '', encoding, binary: true, truncated, size };
	}

	if (encoding === 'utf-8') {
		// a cap can split a multi-byte character, so leave the last few bytes out of the strict check
		const checked = truncated ? bytes.subarray(0, Math.max(0, bytes.length - 4)) : bytes;
		try {
			new TextDecoder('utf-8', { fatal: true }).decode(checked);
		} catch {
			return {
				text: new TextDecoder('windows-1252').decode(bytes),
				encoding: 'windows-1252',
				binary: false,
				truncated,
				size
			};
		}
	}
	const text = new TextDecoder(encoding, { fatal: false }).decode(bytes);
	return { text, encoding, binary: false, truncated, size };
}

export function decodeText(text: string): Decoded {
	const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
	const limit = MAX_FILE_BYTES;
	const truncated = clean.length > limit;
	return {
		text: truncated ? clean.slice(0, limit) : clean,
		encoding: 'utf-8',
		binary: false,
		truncated,
		size: clean.length
	};
}
