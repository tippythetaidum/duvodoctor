# Contributing

Thanks for helping. The most useful thing you can send is a log line the Doctor doesn't recognise yet.

## Seen an error it doesn't know?

1. Drop your logs into [duvodoctor.com](https://duvodoctor.com).
2. Scroll to the report builder at the bottom and press **Download .txt**. That copy has your username, install id and other personal bits already removed. Check the preview anyway.
3. [Open an issue](https://github.com/tippythetaidum/duvodoctor/issues/new?template=new-error.yml) with the "New error I saw" template and paste the parts that matter. If there's a forum thread about it, link it.

Please don't paste a raw log without running it through the report builder first.

## Fixing or adding a diagnosis

Everything the Doctor knows lives in [`src/data/signatures.json`](src/data/signatures.json). The README explains each field under "Adding a signature".

- Every claim needs a source: link the exact forum post (`https://forum.luduvo.com/t/<topic>/<post>`).
- Credit the people who worked it out, by forum handle, linked to their post.
- Advice nobody has confirmed gets `"unconfirmed": true`.
- Every signature needs a redacted fixture in `fixtures/` and an entry in `fixtures/index.json`.
- Run `npm test` and `npm run check` before opening a pull request.

## Safe advice only

The Doctor never suggests:

- downloading DLLs from random sites, turning off antivirus, or editing the registry by hand;
- patching or replacing Luduvo's own files;
- setting `LDV_VK_SKIP_BLOCKLIST=1` (it leads to the Device Removed crash);
- anything against Luduvo's rules, such as getting around a regional block.

## Writing style

Short sentences, plain words, British spelling. Diagnoses talk to the player as "you". Be honest when there's no fix yet.
