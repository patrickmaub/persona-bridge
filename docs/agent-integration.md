# Persona Bridge Agent and Chat Integration

Persona Bridge uses one installed, Persona-branded Shortcut as a runner. A model generates source for the underlying Melon runtime; your server validates it and posts a run link. The model does not generate or sign a new `.shortcut` file for every response.

## Recommended flow

1. Ask the user to install the signed [Persona Bridge Shortcut](https://github.com/patrickmaub/persona-bridge/releases/latest/download/Persona%20Bridge.shortcut) once.
2. Generate a small Melon program.
3. Call `prepareShortcut` with the capabilities your product or user has approved.
4. Show the returned capability manifest beside the action button.
5. Render `url` as a button only when `valid` is true.

Apple documents the `shortcuts://run-shortcut?name=...&input=text&text=...` URL scheme for running an already-saved shortcut from another app. It does not silently install the runner. Your app should keep the install step explicit during onboarding.

## API

```ts
import { prepareShortcut } from "melon-lang";

const source = `
let messages = findMessage("today");
print(messages);
`;

const prepared = prepareShortcut(source, {
  allowedCapabilities: ["findMessage"]
});

if (!prepared.valid) {
  console.error(prepared.diagnostics);
} else {
  console.log(prepared.capabilities);
  console.log(prepared.url);
}
```

The default policy permits only `low` risk capabilities. Approval may be granted by wrapper name or Apple action ID with `allowedCapabilities`, or more broadly with `allowedRisks`. Risk levels are `low`, `sensitive`, `write`, `destructive`, and `arbitrary`.

Direct `syscall(...)` use is `arbitrary` risk. Prefer typed standard-library wrappers so argument validation and capability reporting remain useful.

## CLI

Build once, then read source from a file or standard input:

```bash
npm run build
printf 'print("hello");' | npm run melon -- check -
printf 'print("hello");' | npm run melon -- link -
npm run melon -- link messages.melon --allow findMessage
```

Both commands return JSON and exit nonzero when validation fails. `link` includes `url` only after syntax, capability, source-size, and URL-size checks pass.

## Transport limits

Run links contain URL-encoded source. `prepareShortcut` defaults to an 8,000-character run URL and 32 KiB of source. Apple does not publish a universal maximum URL length for every calling app, so keep programs small and test the clients you support. For larger programs, use a user-visible clipboard flow or a trusted hosted payload rather than silently dropping validation.

## Sensitive data and Messages

`findMessage`, `findConversation`, contacts, clipboard, files, location, camera, and microphone operations are marked `sensitive`. Do not approve them merely because a model requested them. Show the scope to the user, bound the result set, keep processing on-device when possible, and require a separate explicit decision before sending results to a network service.

Shortcuts access depends on the actions and permissions available on the user's OS. It is not a general, silent iMessage database scraper. On macOS, direct access to `~/Library/Messages/chat.db` is a different architecture and may require Full Disk Access; it should not be hidden behind a Melon run link.

## Runtime trust boundary

The released runner downloads the version-pinned web runtime from the matching GitHub release. That keeps the Shortcut small, but it means execution trusts that hosted release asset. A production app with a stronger threat model should pin and verify the runtime bytes or embed/serve them from an authenticated app-controlled channel.
