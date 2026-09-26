export type RedactionKind =
	| 'username'
	| 'install-id'
	| 'token'
	| 'email'
	| 'launch-link'
	| 'server'
	| 'host';

export interface Redaction {
	start: number;
	end: number;
	kind: RedactionKind;
	original: string;
	replacement: string;
}

export interface RedactOptions {
	/** The IP: and connected to lines point at Luduvo's own servers, so they stay unless asked. */
	removeServer?: boolean;
}

export interface Redacted {
	text: string;
	redactions: Redaction[];
}

interface Rule {
	kind: RedactionKind;
	re: RegExp;
	/** capture group to replace; 0 means the whole match */
	group: number;
	replacement: string | ((value: string) => string);
	skip?: (value: string) => boolean;
}

const SEP = String.raw`(?:\\\\|\\|/)`;
const NAME_CHAR = String.raw`(?:\\x[0-9A-Fa-f]{2}|[^\\/\r\n"'<>|:*?\t])`;
const NAME_CHAR_NO_SPACE = String.raw`(?:\\x[0-9A-Fa-f]{2}|[^\\/\s"'<>|:*?,;)])`;
const ALREADY_HIDDEN = /^<[a-z -]+>$|^\[[A-Za-z ]+\]$|^-+$/;
const userPlaceholder = (name: string) =>
	/\\x[0-9A-Fa-f]{2}|[^\x00-\x7f]/.test(name) ? '<non-ascii user>' : '<user>';

const RULES: Rule[] = [
	{
		kind: 'username',
		re: new RegExp(String.raw`[A-Za-z]:${SEP}Users${SEP}(${NAME_CHAR}+)(?=${SEP})`, 'gid'),
		group: 1,
		replacement: userPlaceholder,
		skip: (v) => ALREADY_HIDDEN.test(v)
	},
	{
		kind: 'username',
		re: new RegExp(String.raw`[A-Za-z]:${SEP}Users${SEP}(${NAME_CHAR_NO_SPACE}+)`, 'gid'),
		group: 1,
		replacement: userPlaceholder,
		skip: (v) => ALREADY_HIDDEN.test(v)
	},
	{
		kind: 'username',
		re: /(?<![A-Za-z]:)\/(?:home|Users)\/([^/\s"'<>]+)/dg,
		group: 1,
		replacement: userPlaceholder,
		skip: (v) => ALREADY_HIDDEN.test(v)
	},
	{
		kind: 'host',
		re: /^([\w.-]+@[\w.-]+):[^\n$#]*[$#]/dgm,
		group: 1,
		replacement: '<user>@<host>'
	},
	{
		kind: 'host',
		re: /\b([\w.-]+@[\w-]+(?:\.[\w-]+)*)(?=:[~/])/dg,
		group: 1,
		replacement: '<user>@<host>'
	},
	{
		kind: 'install-id',
		re: /"install_id"\s*:\s*"([^"]*)"/dg,
		group: 1,
		replacement: '<removed>'
	},
	{
		kind: 'launch-link',
		re: /luduvo:\/\/[^\s"'<>`]+/dg,
		group: 0,
		replacement: 'luduvo://<launch link removed>',
		skip: (v) => /^luduvo:\/\/?$/.test(v)
	},
	{
		kind: 'token',
		re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/dg,
		group: 0,
		replacement: '<token>'
	},
	{
		kind: 'token',
		re: /\bBearer\s+([A-Za-z0-9._~+/=-]{12,})/dgi,
		group: 1,
		replacement: '<token>'
	},
	{
		kind: 'token',
		re: /\b(?:session|token|auth|cookie|sid|access_token|refresh_token|api_key|apikey|password|secret)[\w-]*["']?\s*[=:]\s*["']?([A-Za-z0-9._~+/%-]{12,})/dgi,
		group: 1,
		replacement: '<token>'
	},
	{
		kind: 'email',
		re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/dg,
		group: 0,
		replacement: '<email>'
	}
];

const SERVER_RULES: Rule[] = [
	{
		kind: 'server',
		re: /IP: (\S+?),? Port: (\d+)/dg,
		group: 1,
		replacement: '<server>'
	},
	{
		kind: 'server',
		re: /IP: \S+?,? Port: (\d+)/dg,
		group: 1,
		replacement: '<port>'
	},
	{
		kind: 'server',
		re: /connect(?:ed)? to (\d{1,3}(?:\.\d{1,3}){3}:\d+)/dg,
		group: 1,
		replacement: '<server>'
	}
];

export function redact(text: string, options: RedactOptions = {}): Redacted {
	const rules = options.removeServer ? [...RULES, ...SERVER_RULES] : RULES;
	const found: Redaction[] = [];
	for (const rule of rules) {
		rule.re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = rule.re.exec(text)) !== null) {
			if (m[0].length === 0) {
				rule.re.lastIndex++;
				continue;
			}
			const span = m.indices?.[rule.group];
			if (!span) continue;
			const original = text.slice(span[0], span[1]);
			if (rule.skip?.(original)) continue;
			found.push({
				start: span[0],
				end: span[1],
				kind: rule.kind,
				original,
				replacement:
					typeof rule.replacement === 'function' ? rule.replacement(original) : rule.replacement
			});
		}
	}
	found.sort((a, b) => a.start - b.start || b.end - a.end);
	const kept: Redaction[] = [];
	let lastEnd = -1;
	for (const r of found) {
		if (r.start < lastEnd) continue;
		kept.push(r);
		lastEnd = r.end;
	}
	let out = '';
	let pos = 0;
	for (const r of kept) {
		out += text.slice(pos, r.start) + r.replacement;
		pos = r.end;
	}
	out += text.slice(pos);
	return { text: out, redactions: kept };
}

export interface PreviewPiece {
	text: string;
	redaction: Redaction | null;
}

/** Splits text into plain and redacted pieces for the preview, without building any HTML. */
export function previewPieces(text: string, redactions: Redaction[]): PreviewPiece[] {
	const pieces: PreviewPiece[] = [];
	let pos = 0;
	for (const r of redactions) {
		if (r.start > pos) pieces.push({ text: text.slice(pos, r.start), redaction: null });
		pieces.push({ text: r.original, redaction: r });
		pos = r.end;
	}
	if (pos < text.length) pieces.push({ text: text.slice(pos), redaction: null });
	return pieces;
}
