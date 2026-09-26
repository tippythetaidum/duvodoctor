import type { Blame, Severity, Signature } from './match/catalog.ts';
import type { FileKind, Os, Vendor } from './types.ts';

export const BLAME: Record<Blame, string> = {
	luduvo: 'Luduvo bug',
	hardware: 'Your hardware',
	setup: 'Your setup',
	network: 'Your network',
	noise: 'Just noise'
};

export const SEVERITY: Record<Severity, string> = {
	'blocks-launch': 'Stops the game starting',
	'blocks-join': 'Stops you joining',
	'crash-in-game': 'Crashes while playing',
	studio: 'Studio only',
	info: 'Worth knowing'
};

export const OS_LABEL: Record<Os | 'all', string> = {
	windows: 'Windows',
	linux: 'Linux',
	macos: 'macOS',
	all: 'Any OS'
};

export const VENDOR_LABEL: Partial<Record<Vendor, string>> = {
	nvidia: 'NVIDIA',
	amd: 'AMD',
	intel: 'Intel',
	apple: 'Apple'
};

export const KIND_LABEL: Record<FileKind, string> = {
	client: 'client log',
	crash: 'crash log',
	launcher: 'launcher log',
	'launcher-update': 'launcher update log',
	app: 'app log',
	studio: 'Studio log',
	state: 'launcher state',
	settings: 'settings',
	terminal: 'terminal output',
	'event-viewer': 'Event Viewer text',
	unknown: 'unrecognised text'
};

export const FORUM_CATEGORY = {
	Engine: 'https://forum.luduvo.com/c/bug-reports/engine-bugs/18',
	Studio: 'https://forum.luduvo.com/c/bug-reports/studio-bugs/17',
	Website: 'https://forum.luduvo.com/c/bug-reports/website-bugs/19'
} as const;

export function stampText(sig: Signature): string {
	const s = sig.status;
	if (s.state === 'fixed') return s.fixed_in ? `Fixed in build ${s.fixed_in}` : 'Fixed';
	if (s.state === 'workaround') return 'Has a workaround';
	if (s.state === 'open') return 'Not fixed yet';
	return 'No word yet';
}

export function formatDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${d} ${months[m - 1]} ${y}`;
}

export function sourceSite(url: string): string {
	if (/forum\.luduvo\.com\/t\//.test(url)) return 'forum';
	return new URL(url).hostname.replace(/^www\./, '');
}
