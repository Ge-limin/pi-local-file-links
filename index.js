import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { rewriteLocalLinks } from './links.js';

export function remoteEnvironment(env = process.env) {
  return Boolean(env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY || env.CODESPACES ||
    env.REMOTE_CONTAINERS || env.CONTAINER || existsSync('/.dockerenv'));
}

export default function localFileLinks(pi) {
  if (typeof pi.registerMarkdownTransformer !== 'function') return;
  let base = null;
  const cache = new Map();
  pi.on('session_start', (_event, ctx) => {
    cache.clear();
    base = null;
    if (ctx.mode !== 'tui' || remoteEnvironment() || process.platform === 'win32') return;
    const header = ctx.sessionManager.getHeader();
    const cwd = ctx.cwd;
    // Different resume directories make historical relative links ambiguous.
    base = { cwd, allowRelative: Boolean(header?.cwd && resolve(header.cwd) === resolve(cwd)) };
  });
  pi.on('agent_end', () => { cache.clear(); });
  pi.registerMarkdownTransformer((markdown, context) => {
    if (!base || context.messageType !== 'assistant' || context.isStreaming) return markdown;
    const cached = cache.get(markdown);
    if (cached && Date.now() - cached.time < 2000) return cached.text;
    const text = rewriteLocalLinks(markdown, base);
    if (cache.size >= 32) cache.delete(cache.keys().next().value);
    cache.set(markdown, { text, time: Date.now() });
    return text;
  });
}
