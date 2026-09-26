import type { LogLine, StateInfo } from '../types.ts';

export function parseSettings(lines: LogLine[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const l of lines) {
		const m = /^\s*([A-Za-z0-9_.]+)\s*=\s*(.*?)\s*$/.exec(l.text);
		if (m) out[m[1]] = m[2];
	}
	return out;
}

function num(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
	return null;
}

export function parseState(text: string): StateInfo | null {
	try {
		const obj = JSON.parse(text.trim());
		if (!obj || typeof obj !== 'object') return null;
		return {
			version: obj.version != null ? String(obj.version) : null,
			seq: num(obj.seq),
			failCount: num(obj.fail_count),
			lastFail: num(obj.last_fail),
			hasInstallId: typeof obj.install_id === 'string'
		};
	} catch {
		return null;
	}
}
