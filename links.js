import { statSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { decodeString } from 'micromark-util-decode-string';

const isFile = path => { try { return statSync(path).isFile(); } catch { return false; } };

/** Resolve only existing local files. URL syntax wins over literal ?, #, and %. */
export function resolveFileHref(href, { cwd, home = homedir(), allowRelative = true }) {
  if (!href || /[\x00-\x20\x7f]/.test(href.replaceAll(' ', '')) || /\\/.test(href)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || /^(?:\/\/|#|\?)/.test(href)) return null;
  const cut = href.search(/[?#]/);
  const pathname = cut < 0 ? href : href.slice(0, cut);
  const suffix = cut < 0 ? '' : href.slice(cut);
  if (!pathname || /%2f|%5c/i.test(pathname)) return null;
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (/[\x00-\x1f\x7f\\]/.test(decoded) || /:\d+(?::\d+)?$/.test(decoded)) return null;
  const absolute = isAbsolute(decoded) || decoded.startsWith('~/');
  if (!absolute && (!allowRelative || !cwd)) return null;
  if (decoded.startsWith('~') && !decoded.startsWith('~/')) return null;
  const locate = p => p.startsWith('~/') ? resolve(home, p.slice(2)) : resolve(cwd || '/', p);
  const path = locate(decoded);
  if (!isFile(path)) return null;
  // Do not guess when a literal encoded-name or literal suffix file also exists.
  if (pathname !== decoded && isFile(locate(pathname))) return null;
  if (suffix && isFile(locate(decoded + suffix))) return null;
  return (pathToFileURL(path).href + suffix).replace(/[() <>"]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}

// Find just the destination's source range; never reserialize the Markdown document.
function destinationRange(source, node) {
  const start = node.position?.start.offset, end = node.position?.end.offset;
  if (start == null || end == null) return null;
  let p;
  if (node.type === 'definition') {
    p = start + 1;
    while (p < end) {
      if (source[p] === '\\') { p += 2; continue; }
      if (source[p] === ']') break;
      p++;
    }
    if (source.slice(p, p + 2) !== ']:') return null;
    p += 2;
  } else {
    p = node.children?.at(-1)?.position?.end.offset ?? start + 1;
    // Autolinks and malformed/incompatible parser results are left alone.
    if (source.slice(p, p + 2) !== '](') return null;
    p += 2;
  }
  while (/\s/.test(source[p] || '') && p < end) p++;
  const angle = source[p] === '<';
  if (angle) p++;
  const from = p;
  let depth = 0;
  for (; p < end; p++) {
    const c = source[p];
    if (c === '\\') { p++; continue; }
    if (angle) { if (c === '>') break; }
    else {
      if (/\s/.test(c) || (c === ')' && depth === 0)) break;
      if (c === '(') depth++;
      if (c === ')') depth--;
    }
  }
  if (p === end || decodeString(source.slice(from, p)) !== node.url) return null;
  return [from, p];
}

export function rewriteLocalLinks(source, options) {
  // Bound work on large tool-like outputs; do not scan the disk or read file contents.
  if (source.length > 100_000) return source;
  try {
    const tree = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
    const imageRefs = new Set(), linkRefs = new Set(), nodes = [];
    walk(tree, n => {
      if (n.type === 'imageReference') imageRefs.add(n.identifier);
      if (n.type === 'linkReference') linkRefs.add(n.identifier);
      if (n.type === 'link' || n.type === 'definition') nodes.push(n);
    });
    if (nodes.length > 128) return source;
    const edits = [];
    for (const node of nodes) {
      if (node.type === 'definition' && (!linkRefs.has(node.identifier) || imageRefs.has(node.identifier))) continue;
      const range = destinationRange(source, node);
      if (!range) continue;
      const url = resolveFileHref(node.url, options);
      if (url) edits.push({ start: range[0], end: range[1], url });
    }
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      source = source.slice(0, edit.start) + edit.url + source.slice(edit.end);
    }
    return source;
  } catch { return source; }
}
