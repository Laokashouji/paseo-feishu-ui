# Public release audit — 2026-09-14

The public snapshot contains the 0.3.1 plugin implementation and reviewed design/test artifacts.

## Runtime dependencies and data flow

Runtime imports use the published Paseo 0.8 plugin SDK, React, React Native and Zod. There is no server entry, custom RPC, HTTP/WebSocket client, internal service SDK, telemetry, embedded credential, model endpoint or workspace-file operation in the plugin entry graph. The browser adapter reads the local Paseo appearance setting and DOM; thinking rendering receives only the public timeline reasoning payload. Clipboard writes require an explicit copy action.

The dependency lockfile initially used an organization-specific npm mirror for some public packages. All 59 such URLs were normalized to the same package paths on `registry.npmjs.org`, retaining the pinned versions and integrity hashes. The public lockfile contains only public npm tarball origins. Installation with an empty npm cache and the public registry, typechecking, native-entry smoke checks and browser regression checks validate the distributable snapshot.

## Publication boundaries

The public Git branch starts from a new root commit with a GitHub noreply author identity. Prior development commits, organization email metadata, private remotes, ignored local references, desktop captures, diagnostic bridge files and credentials are not included. Local OpenDesign preview-server URLs were removed from the archived provenance metadata.

The included PNGs were reviewed as fictional design previews. The catalog images explicitly label themselves as design references, not app screenshots. No real user conversation captures are published. Source review included current tracked text and prior development text for credential signatures, private paths/IPs and internal domain references; no runtime internal dependency was found.

This is a scoped source/dependency review, not a formal security certification. The version-specific DOM adapter and native-mobile limitations remain documented in the README.
