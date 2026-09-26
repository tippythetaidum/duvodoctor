import type { FileKind, LogLine } from '../types.ts';

const BY_NAME: [RegExp, FileKind][] = [
	[/crash[^/\\]*\.log$/i, 'crash'],
	[/launcher-update[^/\\]*\.log$/i, 'launcher-update'],
	[/launcher[^/\\]*\.log$/i, 'launcher'],
	[/client[^/\\]*\.log$/i, 'client'],
	[/app[^/\\]*\.log$/i, 'app'],
	[/studio[^/\\]*\.log$/i, 'studio'],
	[/state[^/\\]*\.json$/i, 'state'],
	[/settings[^/\\]*\.cfg$/i, 'settings']
];

export function kindFromName(name: string): FileKind | null {
	for (const [re, kind] of BY_NAME) if (re.test(name)) return kind;
	return null;
}

const SETTINGS_KEYS =
	/^(quality_level|graphics_api|aa_method|aa_quality|bloom|saturation|fov|sensitivity|volume|fullscreen|vsync|ui_scale|show_fps|shift_lock)=/;

export function kindFromContent(text: string, lines: LogLine[]): FileKind {
	const trimmed = text.trimStart();
	if (trimmed.startsWith('{')) {
		try {
			const obj = JSON.parse(trimmed);
			if (obj && typeof obj === 'object' && ('install_id' in obj || 'fail_count' in obj || 'game_exe' in obj))
				return 'state';
		} catch {
			/* not JSON */
		}
	}
	const sample = lines.slice(0, 400);
	const nonEmpty = sample.filter((l) => l.text.trim() !== '');
	if (nonEmpty.length === 0) return 'unknown';

	const settingsHits = nonEmpty.filter((l) => SETTINGS_KEYS.test(l.text.trim())).length;
	if (settingsHits >= 2 && settingsHits >= nonEmpty.length * 0.6) return 'settings';

	const crashHits = nonEmpty.filter((l) => l.text.startsWith('crash: ')).length;
	if (crashHits > 0 && crashHits >= nonEmpty.length * 0.6) return 'crash';

	if (nonEmpty.some((l) => /^Faulting (application|module) name:/.test(l.text))) return 'event-viewer';

	const has = (re: RegExp) => lines.some((l) => re.test(l.text));
	const launcher = has(/\] (launcher|update|finish-update)[: ]/);
	const client = has(
		/\] Luduvo \d+(-dirty)? (\(|sha=)|\] client content:|\] Renderer up:|\] \[vk\] |\] \[d3d12\] |\] connected to |ClientApp::Init/
	);
	const studio = has(/\] studio (content|assets):/);
	const shell = has(/^(qt\.qpa|terminate called|Aborted|zsh: |[\w.-]+@[\w.-]+:.*\$)/);

	if (launcher && (client || studio || shell)) return 'terminal';
	if (shell && (client || studio)) return 'terminal';
	if (client) return 'client';
	if (studio) return 'studio';
	if (launcher) return has(/finish-update/) && !has(/launcher: up to date/) ? 'launcher-update' : 'launcher';
	if (shell) return 'terminal';
	return 'unknown';
}

export const LOG_KINDS: FileKind[] = [
	'client',
	'launcher',
	'launcher-update',
	'app',
	'studio',
	'terminal',
	'unknown'
];
