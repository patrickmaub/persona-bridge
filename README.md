# Persona Bridge

Persona Bridge is a signed, general-purpose Apple Shortcut that lets Persona run small, capability-audited programs on an Apple device. A user installs one Shortcut once; Persona can then post validated `shortcuts://` actions without asking the user to build a new Shortcut for every task.

[Install Persona Bridge](https://raw.githubusercontent.com/patrickmaub/persona-bridge/main/shortcut/Persona%20Bridge.shortcut)

The exact filename matters: Apple imports it as a Shortcut named **Persona Bridge**, which is also the name used by generated run links.

## Agent flow

1. Generate a small program in the underlying Melon language.
2. Run the deterministic capability preflight.
3. Disclose and approve sensitive or mutating capabilities.
4. Post the returned `shortcuts://run-shortcut` URL as **Run with Persona Bridge**.

```bash
npm run build
npm run melon -- check program.melon
npm run melon -- link program.melon
```

```ts
import { prepareShortcut } from "melon-lang";

const prepared = prepareShortcut('print("Hello from Persona Bridge.");');
if (prepared.valid) console.log(prepared.url);
```

See [docs/agent-integration.md](docs/agent-integration.md) for policy options, capability manifests, payload limits, and install behavior.

## Current Apple-data support

- Messages queries are available but treated as sensitive and require explicit approval.
- Apple Notes reads are not currently implemented; the validator will not invent an unsupported action.
- Arbitrary raw syscalls, destructive actions, and unapproved writes are rejected by default.

## Upstream and license

Persona Bridge is a branded fork of [melon-lang/melon-lang](https://github.com/melon-lang/melon-lang). Melon remains the internal source language and package name for upstream and license compatibility; the installed runner and user-facing actions are branded Persona Bridge.

The original project documentation is available at [melon-lang.github.io/melon-lang](https://melon-lang.github.io/melon-lang/#/). Contributions to the runtime should also follow [shortcut/README.md](shortcut/README.md).
