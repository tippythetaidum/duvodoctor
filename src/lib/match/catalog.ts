import type { Api, CrashEntry, FileKind, Os, Vendor } from '../types.ts';

export type Blame = 'luduvo' | 'hardware' | 'setup' | 'network' | 'noise';
export type Severity = 'blocks-launch' | 'blocks-join' | 'crash-in-game' | 'studio' | 'info';
export type StatusState = 'open' | 'workaround' | 'fixed' | 'unknown';

export type Pattern = string | { re: string; min?: number };

export interface FileRule {
	all?: Pattern[];
	any?: Pattern[];
	none?: Pattern[];
}

export type FileKey = FileKind | 'any';

export interface When {
	os?: Os[];
	vendor?: Vendor[];
	backend?: Api[];
	build?: { min?: number; max?: number };
	has?: FileKind[];
	missing?: FileKind[];
	clean_quit?: boolean;
	errors?: boolean;
	non_ascii_user?: boolean;
	crash_module?: CrashEntry['moduleKind'][];
}

export interface MatchRule {
	files?: Partial<Record<FileKey, FileRule>>;
	when?: When;
}

export interface Link {
	label: string;
	url: string;
}

export interface Step {
	text: string;
	unconfirmed?: boolean;
	link?: Link;
}

export interface StaffNote {
	quote: string;
	handle: string;
	date: string;
	url: string;
	unconfirmed?: boolean;
	context?: string;
}

export interface Credit {
	handle: string;
	url: string;
	for: string;
}

export interface Signature {
	id: string;
	ref: string;
	title: string;
	headline: string;
	summary: string;
	who: string;
	blame: Blame;
	severity: Severity;
	platforms: (Os | 'all')[];
	vendors?: Vendor[];
	cause?: { text: string; unconfirmed?: boolean };
	match?: MatchRule;
	hint?: { match: MatchRule; say: string };
	fold?: { label: string };
	leads_to?: string[];
	symptoms?: string[];
	steps: Step[];
	dont: string[];
	status: { state: StatusState; fixed_in: number | null; staff_note: StaffNote | null };
	sources: Link[];
	credits: Credit[];
	last_checked: string;
	unconfirmed?: boolean;
}

export interface Catalog {
	version: number;
	updated: string;
	signatures: Signature[];
}

export const SEVERITY_ORDER: Severity[] = [
	'blocks-launch',
	'blocks-join',
	'crash-in-game',
	'studio',
	'info'
];
