import type { Catalog, Signature } from './catalog.ts';

export interface SymptomChoice {
	text: string;
	sig: Signature;
}

export function symptomChoices(catalog: Catalog): SymptomChoice[] {
	const out: SymptomChoice[] = [];
	for (const sig of catalog.signatures) {
		if (sig.blame === 'noise') continue;
		for (const text of sig.symptoms ?? []) out.push({ text, sig });
	}
	return out.sort((a, b) => a.text.localeCompare(b.text, 'en-GB'));
}
