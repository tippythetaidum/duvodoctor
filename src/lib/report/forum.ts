import type { Analysis, ParsedFile, SetupSummary } from '../types.ts';
import type { MatchResult } from '../match/engine.ts';
import { redact, type Redacted } from '../redact/redact.ts';
import { VENDOR_NAMES } from '../parse/driver.ts';

export const DISCOURSE_MAX_POST = 32000;
const CONTEXT = 2;

export interface ReportFields {
	cpu: string;
	description: string;
	steps: string;
	expected: string;
}

export interface Report {
	raw: string;
	redacted: Redacted;
	length: number;
	tooLong: boolean;
	category: 'Engine' | 'Studio' | 'Website';
}

const OS_NAMES = { windows: 'Windows', linux: 'Linux', macos: 'macOS' } as const;

export function fenceFor(text: string): string {
	let longest = 0;
	for (const m of text.matchAll(/`+/g)) longest = Math.max(longest, m[0].length);
	return '`'.repeat(Math.max(3, longest + 1));
}

function gpuLine(s: SetupSummary): string {
	if (!s.selected) {
		const names = [...new Set(s.adapters.map((a) => a.name))];
		return names.length ? `${names.join(', ')} (none selected)` : 'Not in the logs';
	}
	const a = s.selected;
	const parts = [a.name];
	if (a.vendorId) parts.push(`${VENDOR_NAMES[a.vendor]} ${a.vendorId}:${a.deviceId}`);
	if (a.memoryMb) parts.push(`${a.memoryMb} MB`);
	let line = parts.join(', ');
	if (s.driver) {
		line += s.driver.decoded
			? `, driver ${s.driver.decoded} (raw ${s.driver.raw})`
			: `, driver ${s.driver.raw} (not decoded)`;
	}
	return line;
}

/** Line numbers worth quoting from one file, before merging into ranges. */
function interestingLines(file: ParsedFile, fileIndex: number, result: MatchResult): Set<number> {
	const keep = new Set<number>();
	if (file.kind === 'crash') {
		for (const l of file.lines) keep.add(l.n);
		return keep;
	}
	const folded = new Set<number>();
	for (const n of result.noise) for (const e of n.evidence) if (e.file === fileIndex) folded.add(e.line);

	const isLog = ['client', 'app', 'studio', 'launcher', 'launcher-update', 'terminal', 'unknown', 'event-viewer'].includes(file.kind);
	if (isLog) {
		for (const l of file.lines) {
			if (folded.has(l.n)) continue;
			keep.add(l.n);
			if (/Renderer up:/.test(l.text) || l.level === 'ERROR') break;
		}
	} else {
		for (const l of file.lines) keep.add(l.n);
	}
	const anchors = new Set<number>();
	for (const l of file.lines) if (l.level === 'ERROR' && !folded.has(l.n)) anchors.add(l.n);
	for (const d of result.flat) for (const e of d.evidence) if (e.file === fileIndex) anchors.add(e.line);
	for (const n of anchors) {
		for (let k = n - CONTEXT; k <= n + CONTEXT; k++) {
			if (k >= 1 && k <= file.lines.length && !folded.has(k)) keep.add(k);
		}
	}
	const last = file.lines[file.lines.length - 1];
	if (last && /\] Quit\./.test(last.text)) keep.add(last.n);
	return keep;
}

export function excerpt(file: ParsedFile, fileIndex: number, result: MatchResult): string {
	if (file.empty) return '(empty file)';
	if (file.binary) return '(not a text file)';
	const keep = interestingLines(file, fileIndex, result);
	const byNumber = new Map(file.lines.map((l) => [l.n, l.text]));
	const numbers = [...keep].sort((a, b) => a - b);
	const out: string[] = [];
	let prev = 0;
	for (const n of numbers) {
		if (prev && n > prev + 1) out.push(`... (${n - prev - 1} lines skipped)`);
		out.push(byNumber.get(n) ?? '');
		prev = n;
	}
	if (prev && prev < file.lines.length) out.push(`... (${file.lines.length - prev} more lines)`);
	return out.join('\n');
}

function noiseSummary(result: MatchResult): string | null {
	if (!result.noise.length) return null;
	const parts = result.noise.map((n) => `${n.evidence.length} × ${n.sig.fold?.label ?? n.sig.title}`);
	return `Folded as harmless: ${parts.join(', ')}.`;
}

function category(result: MatchResult, a: Analysis): Report['category'] {
	const top = result.flat[0]?.sig;
	if (top?.id === 'macos-join-does-nothing') return 'Website';
	if (top?.severity === 'studio') return 'Studio';
	const kinds = a.files.filter((f) => !f.empty).map((f) => f.kind);
	if (kinds.length && kinds.every((k) => k === 'studio' || k === 'app')) return 'Studio';
	return 'Engine';
}

export function buildReport(
	a: Analysis,
	result: MatchResult,
	fields: ReportFields,
	options: { removeServer?: boolean } = {}
): Report {
	const s = a.setup;
	const version = s.build !== null ? `Luduvo ${s.build}${s.sha ? ` (${s.sha})` : ''}` : 'Not in the logs';
	const lines: string[] = [];
	lines.push('## Version Information and Specs', '');
	lines.push(`**Luduvo Version:** ${version}`);
	lines.push(`**Operating System:** ${s.os ? OS_NAMES[s.os] : 'Not in the logs'}`);
	lines.push(`**CPU:** ${fields.cpu.trim() || '(not given)'}`);
	lines.push(`**GPU:** ${gpuLine(s)}`);
	const backend = s.backend ? s.backend.toUpperCase().replace('VULKAN', 'Vulkan').replace('METAL', 'Metal') : null;
	if (backend) lines.push(`**Graphics API:** ${backend}${s.fallback.length ? ` (${s.fallback.join('; ')})` : ''}`);
	if (s.vkLoader) lines.push(`**Vulkan loader:** ${s.vkLoader}`);
	if (s.settings?.graphics_api) lines.push(`**Settings.cfg graphics_api:** ${s.settings.graphics_api}`);
	lines.push('', '## Describe The Issue', '');
	lines.push(fields.description.trim() || '(not given)');
	if (result.flat.length) {
		lines.push('', 'Duvo Doctor matched these known issues:');
		for (const d of result.flat) {
			lines.push(`- ${d.sig.title} (${d.confidence === 'exact' ? 'exact match' : 'partial match'}, ${d.sig.id})`);
		}
	} else if (result.verdict === 'unknown') {
		lines.push('', "Duvo Doctor didn't recognise these errors.");
	}
	lines.push('', '## Steps to Reproduce', '');
	lines.push(fields.steps.trim() || '1. Start Luduvo\n2. (what happens next)');
	lines.push('', '## Expected Behavior', '');
	lines.push(fields.expected.trim() || 'The game starts and I can join.');
	lines.push('', '## Logs', '');
	a.files.forEach((f, i) => {
		const body = excerpt(f, i, result);
		const fence = fenceFor(body);
		const label = f.kind === 'crash' ? f.name : `${f.name} (excerpt)`;
		lines.push(`[details="${label.replace(/["\]]/g, '')}"]`, `${fence}text`, body, fence, '[/details]', '');
	});
	const noise = noiseSummary(result);
	if (noise) lines.push(noise, '');
	lines.push('Made with Duvo Doctor (duvodoctor.com). Personal details were removed before copying.');

	const raw = lines.join('\n');
	const redacted = redact(raw, options);
	return {
		raw,
		redacted,
		length: redacted.text.length,
		tooLong: redacted.text.length > DISCOURSE_MAX_POST,
		category: category(result, a)
	};
}
