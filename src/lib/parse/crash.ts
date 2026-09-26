import type { CrashEntry, LogLine } from '../types.ts';

const CRASH =
	/^crash: exception (0x[0-9a-fA-F]+) at (.+?)\+(0x[0-9a-fA-F]+)(?: (read|write|execute|exec) (0x[0-9a-fA-F]+))?\s*$/;

const GPU_DRIVERS =
	/^(amdvlk(64|32)|amdxc(64|32)|atio6axx|atiumd\w*|nvoglv(64|32)|nvwgf2umx?|nvldumdx?|nvgpucomp\w*|igvk(64|32)|igd\d+umd\w*|igxelpicd\w*|igc(64|32)|ig\w+icd\w*)\.dll$/i;
const LUDUVO = /^(LuduvoGame|LuduvoEditor|Luduvo|LuduvoApp|LuduvoUriHandler)(\.exe)?$/i;

export function moduleKind(path: string, module: string): CrashEntry['moduleKind'] {
	if (GPU_DRIVERS.test(module) || /\\DriverStore\\FileRepository\\/i.test(path)) return 'gpu-driver';
	if (LUDUVO.test(module)) return 'luduvo';
	if (/^[a-z]:\\windows\\/i.test(path)) return 'windows';
	return 'other';
}

export function parseCrashes(lines: LogLine[]): CrashEntry[] {
	const out: CrashEntry[] = [];
	for (const l of lines) {
		const m = CRASH.exec(l.text);
		if (!m) continue;
		const path = m[2];
		const module = path.split(/[\\/]/).pop() ?? path;
		out.push({
			line: l.n,
			code: m[1].toLowerCase(),
			path,
			module,
			offset: m[3].toLowerCase(),
			access: m[4] ?? null,
			address: m[5] ?? null,
			moduleKind: moduleKind(path, module)
		});
	}
	return out;
}
