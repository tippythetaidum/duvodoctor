export type FileKind =
	| 'client'
	| 'crash'
	| 'launcher'
	| 'launcher-update'
	| 'app'
	| 'studio'
	| 'state'
	| 'settings'
	| 'terminal'
	| 'event-viewer'
	| 'unknown';

export type Level = 'INFO' | 'WARNING' | 'ERROR';

export interface LogLine {
	n: number;
	text: string;
	level: Level | null;
	timestamped: boolean;
	clipped: boolean;
}

export interface CrashEntry {
	line: number;
	code: string;
	path: string;
	module: string;
	offset: string;
	access: string | null;
	address: string | null;
	moduleKind: 'gpu-driver' | 'luduvo' | 'windows' | 'other';
}

export interface StateInfo {
	version: string | null;
	seq: number | null;
	failCount: number | null;
	lastFail: number | null;
	hasInstallId: boolean;
}

export type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';

export interface ParsedFile {
	name: string;
	kind: FileKind;
	kindFrom: 'name' | 'content';
	size: number;
	truncated: boolean;
	binary: boolean;
	empty: boolean;
	encoding: Encoding;
	lines: LogLine[];
	crashes: CrashEntry[];
	settings: Record<string, string> | null;
	state: StateInfo | null;
}

export type Vendor =
	| 'nvidia'
	| 'amd'
	| 'intel'
	| 'apple'
	| 'microsoft-software'
	| 'llvmpipe'
	| 'unknown';

export type Api = 'vulkan' | 'd3d12' | 'metal';

export interface Adapter {
	api: Api;
	index: number | null;
	name: string;
	type: string | null;
	vendorId: string | null;
	deviceId: string | null;
	vendor: Vendor;
	memoryMb: number | null;
	skipped: string | null;
	software: boolean;
}

export interface DriverVersion {
	raw: number;
	decoded: string | null;
	scheme: string;
}

export type Os = 'windows' | 'linux' | 'macos';

export interface SetupSummary {
	os: Os | null;
	osFrom: string | null;
	build: number | null;
	sha: string | null;
	networkEpoch: number | null;
	backend: Api | null;
	fallback: string[];
	adapters: Adapter[];
	selected: Adapter | null;
	driver: DriverVersion | null;
	vkLoader: string | null;
	vkDevice: string | null;
	validation: { requested: boolean; enabled: boolean } | null;
	blocklistOverride: boolean;
	resolution: string | null;
	connected: boolean;
	server: string | null;
	cleanQuit: boolean;
	errorCount: number;
	settings: Record<string, string> | null;
	failCount: number | null;
	nonAsciiUser: boolean;
}

export interface Analysis {
	files: ParsedFile[];
	setup: SetupSummary;
}
