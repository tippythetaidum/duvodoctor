import { analyse, parseBytes, parseText } from '../parse/index.ts';
import { MAX_FILE_BYTES } from '../parse/decode.ts';
import { diagnose } from '../match/engine.ts';
import type { Catalog } from '../match/catalog.ts';
import type { AnalyseRequest, AnalyseResponse } from './protocol.ts';
import catalog from '../../data/signatures.json';

self.onmessage = async (event: MessageEvent<AnalyseRequest>) => {
	const { id, inputs } = event.data;
	try {
		const files = [];
		for (const input of inputs) {
			if (input.type === 'file') {
				const blob = input.file.size > MAX_FILE_BYTES ? input.file.slice(0, MAX_FILE_BYTES) : input.file;
				const bytes = new Uint8Array(await blob.arrayBuffer());
				files.push(parseBytes(input.file.name, bytes, input.file.size));
			} else {
				files.push(parseText(input.name, input.text));
			}
		}
		const analysis = analyse(files);
		const result = diagnose(analysis, catalog as unknown as Catalog);
		const response: AnalyseResponse = { id, ok: true, analysis, result };
		self.postMessage(response);
	} catch (err) {
		const response: AnalyseResponse = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
		self.postMessage(response);
	}
};
