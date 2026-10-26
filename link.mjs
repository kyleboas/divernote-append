import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Divernote extension helpers: see index.mjs.
//
// The link to an issue is the page its vault's node serves at /app/ on its
// own origin, so a browser on any computer opens it there: on this computer,
// over Tailscale, or on the node's public name. The issue is named after #.

const TASK_ID = /^[\w.:-]{1,200}$/;

export function configDirectory(env = process.env) {
  const base = typeof env.XDG_CONFIG_HOME === 'string' && env.XDG_CONFIG_HOME.startsWith('/')
    ? env.XDG_CONFIG_HOME
    : typeof env.HOME === 'string' && env.HOME.startsWith('/') ? join(env.HOME, '.config') : undefined;
  return base ? join(base, 'divernotes') : undefined;
}

/** The node this computer's vault is on, as its bare HTTPS origin. */
export async function nodeOrigin(env = process.env) {
  const directory = configDirectory(env);
  if (!directory) throw new Error('HOME is not set, so the vault cannot be found.');
  let enrollment;
  try {
    enrollment = JSON.parse(await readFile(join(directory, 'agent-enrollment.json'), 'utf8'));
  } catch {
    throw new Error('This computer is not paired with a vault node. Run divernote setup or divernote pair first.');
  }
  let url;
  try { url = new URL(enrollment?.nodeOrigin); } catch { throw new Error('The vault node has no address this computer knows.'); }
  // The page pairs a browser only with an HTTPS node.
  if (url.protocol !== 'https:') throw new Error(`The vault node is at ${url.origin}; a browser needs it on HTTPS (its publicOrigin), for example through tailscale serve.`);
  return url.origin;
}

/** The page for one issue. */
export function issueLink(origin, taskId) {
  if (typeof taskId !== 'string' || !TASK_ID.test(taskId)) throw new Error('That is not an issue ID.');
  return `${origin}/app/#issue=${taskId}`;
}
