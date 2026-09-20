# pi-local-file-links

Click the report Pi just wrote, even when its link is a relative path.

This Pi extension turns local Markdown link destinations into absolute `file://` URLs **at display time**. It leaves the original assistant message, saved session, and model context unchanged.

[中文说明](README.zh-CN.md)

## Install

```sh
pi install npm:pi-local-file-links
```

Or install the tagged source:

```sh
pi install git:github.com/Ge-limin/pi-local-file-links@v0.1.0
```

Run `/reload` in an existing Pi session. New sessions load it automatically.

## Example

With a session working directory of `/home/me/project` and an existing `docs/report.html`:

```markdown
[Report](docs/report.html)
```

Pi still shows **Report**. The terminal receives `file:///home/me/project/docs/report.html` as the clickable target. The saved message still contains `docs/report.html`.

File suffixes are unrestricted: Markdown, HTML, PDF, images, source files, and other regular files use the same conversion. The terminal and OS choose which application opens them. This extension does not start preview servers; HTML that requires HTTP should use an existing `http://localhost:…` link.

## What it changes

- Explicit links in completed assistant text, including restored history and reference-style links.
- Existing regular files addressed by a relative path, absolute path, or `~/` path.
- Destination text only. Link labels and surrounding Markdown are preserved using source positions.
- Spaces, Unicode, parentheses, and URL-encoded filenames are handled without double encoding. Queries and fragments are retained.

It leaves code examples, inline code, raw HTML, bare paths, images, existing URL schemes, missing files, directories, line-number suffixes, and ambiguous filenames unchanged. Reference definitions shared with images are also left alone. Streaming text is unchanged until the response completes.

## Compatibility and limits

Uses Pi's `registerMarkdownTransformer` API. Tested with **Pi 0.86.0 and Node 24 on local macOS**; the peer range is limited to 0.86.x. The author has tried it in Warp. Windows is disabled. Automated tests also pass on macOS and Linux with Node 22 and 24 in GitHub Actions; terminal clicks on Linux have not been verified.

The terminal must support OSC 8 hyperlinks and opening `file://` URLs. The extension does not guarantee which app opens a file, or whether anchors and source line navigation work.

Relative paths use the session working directory, not the last shell command's directory. If the session header and current directory differ, relative conversion is disabled. Links from other worktrees should use absolute paths. Same-directory history imported from another project cannot be identified by the display hook.

Known SSH/container environments disable conversion. Detection uses environment hints and is not exhaustive. Network-mounted paths can still make synchronous file metadata checks slow. No file contents are read or uploaded.

Messages over 100,000 characters or 128 link/definition nodes are skipped. A bounded two-second cache reduces repeated checks. Pi also caches rendering, so a file created after its link appeared may require `/reload` to refresh that link.

No tools, prompts, model requests, telemetry, or servers are added. This extension does not prevent other extensions from modifying messages.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run test:pi
npm pack --dry-run
```

Unit tests cover Markdown syntax, encoding, ambiguous paths, and session changes. The real-Pi integration test loads the extension, saves and restores a test session, renders OSC 8 links at several widths, and checks that session bytes and `convertToLlm` output remain unchanged. It makes no model requests.

To test a different installed Pi version:

```sh
PI_PACKAGE_ROOT=/path/to/node_modules/@earendil-works/pi-coding-agent npm test
```

## Remove

```sh
pi remove npm:pi-local-file-links
```

For a Git install, use `pi remove git:github.com/Ge-limin/pi-local-file-links`. Then `/reload`.

## License

[MIT](LICENSE)
