# Duvo Doctor

Luduvo won't start? Drop your `client.log` into [duvodoctor.com](https://duvodoctor.com) and it tells you why, in plain English: whether it's a Luduvo bug or something on your PC, what to try, what not to bother with, and what staff last said. It never leaves your browser.

Unofficial fan tool. Not affiliated with or endorsed by Luduvo Corporation.

## What it does

- Reads `client.log`, `crash.log`, `launcher.log`, `launcher-update.log`, `app.log`, `studio.log`, `state.json` and `Settings.cfg`, or pasted text.
- Shows your setup as the logs describe it: build, graphics mode, every GPU adapter and which one was picked, the decoded driver version.
- Matches the logs against a catalog of known problems collected from the Luduvo forum, root cause first.
- Folds the harmless noise (hundreds of Razor shadow warnings in a healthy log) so the real errors stand out.
- Builds a bug report in the layout staff already answer, with personal details removed.

The same catalog powers the [Known issues](https://duvodoctor.com/issues) board.

## How the privacy works

- All parsing happens in a Web Worker in your browser tab. There is no server code at all: the site is static files.
- The Content Security Policy sets `connect-src 'none'` on every page, including the worker script, so the browser refuses any network request the page makes. The headers are in [`static/_headers`](static/_headers); the rest of the policy is generated into each page by SvelteKit's `csp` setting in [`vite.config.ts`](vite.config.ts).
- The page loads its code and fonts up front, so reading a log makes no requests at all. [`e2e/privacy.e2e.ts`](e2e/privacy.e2e.ts) checks this for every fixture.
- Fonts are self-hosted. No analytics, cookies or third-party scripts.
- Before anything is copied or downloaded, [`src/lib/redact/redact.ts`](src/lib/redact/redact.ts) replaces usernames in paths (including `\xNN`-escaped and non-Latin ones), `install_id`, tokens, email addresses and `luduvo://` launch links. The `IP:` line is Luduvo's own server, so it stays unless you tick the box.
- Log text is only ever rendered as text, never as HTML. A test fails if an HTML sink appears in `src/`.

## Running it

You need Node 20 or newer.

```sh
npm install
npm run dev          # local dev server
npm test             # unit tests: parser, matcher, redaction, catalog, report
npm run build        # static site in build/
npm run serve        # serve build/ with the real headers (Cloudflare Pages dev server)
npx playwright install chromium
npm run test:e2e     # browser tests: every fixture, privacy, accessibility, 360 px
```

## Adding a signature

Every diagnosis is one entry in [`src/data/signatures.json`](src/data/signatures.json). Adding one never needs a code change.

1. Add an entry with an `id` (lowercase, dashes, never renamed later), a plain-English `headline` that talks to the player, `blame`, `severity`, `steps`, `dont`, `status`, `sources` and `credits`. Link every source to the exact forum post.
2. Describe how to spot it under `match.files`: `all`, `any` and `none` lists of regular expressions per file type (`any` searches every file). Add `when` conditions for OS, GPU vendor, graphics API, build range or missing files if needed.
3. If it has a knock-on effect, list the follow-on signature in `leads_to` so the root cause shows first.
4. Mark anything a player suggested but nobody confirmed with `"unconfirmed": true`.
5. Add a redacted log to `fixtures/`, list it in [`fixtures/index.json`](fixtures/index.json) with the ids it should produce, and run `npm test`. The tests check the schema, that every pattern compiles and stays fast, that every signature has a fixture, and that healthy logs raise nothing.

Problems that leave no log (a Windows popup, a Mac Join button that does nothing) use `symptoms` instead, which feed the "No log? Pick what you saw" picker.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to send one in.

## Keeping up with Luduvo

Once a day, [`scripts/forum-check.ts`](scripts/forum-check.ts) reads the forum's public release notes, new bug reports, staff replies and the threads the site links to. It runs the Doctor over any logs posted there and opens a `forum-check` issue listing what it found: new builds, logs it recognises, errors it doesn't, and what staff said. The site itself never contacts the forum.

Only two things go on the site without a person checking them first: the newest Luduvo build number and the titles of staff release notes, in [`src/data/luduvo.json`](src/data/luduvo.json). A new build only counts once staff post its release notes or logs from two different threads show it. Diagnoses and statuses are always changed by hand.

Deploys need two repository secrets, `CLOUDFLARE_API_TOKEN` (a token with Cloudflare Pages edit access) and `CLOUDFLARE_ACCOUNT_ID`. Without them, the checks still run and nothing is deployed.

## Credits

Most of what the Doctor knows was worked out by players and staff on the [Luduvo forum](https://forum.luduvo.com). Each issue credits them by name, and the [About page](https://duvodoctor.com/about) lists everyone.

## Licence

[MIT](LICENSE).
