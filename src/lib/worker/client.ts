import type { AnalyseResponse, Input } from './protocol.ts';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: AnalyseResponse) => void>();

function getWorker(): Worker {
	if (!worker) {
		worker = new Worker(new URL('./analyse.worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (event: MessageEvent<AnalyseResponse>) => {
			const resolve = pending.get(event.data.id);
			pending.delete(event.data.id);
			resolve?.(event.data);
		};
		worker.onerror = (event) => {
			for (const [id, resolve] of pending) resolve({ id, ok: false, error: event.message || 'The reader stopped unexpectedly.' });
			pending.clear();
			worker?.terminate();
			worker = null;
		};
	}
	return worker;
}

/** Starts the worker and loads every font face up front, so reading a log never touches the network. */
export function warmUp() {
	getWorker();
	const faces = ['400 1em "Titillium Web"', '600 1em "Titillium Web"', '700 1em "Titillium Web"'];
	for (const f of faces) document.fonts?.load(f).catch(() => {});
}

export function analyseInputs(inputs: Input[]): Promise<AnalyseResponse> {
	const id = nextId++;
	return new Promise((resolve) => {
		pending.set(id, resolve);
		getWorker().postMessage({ id, inputs });
	});
}
