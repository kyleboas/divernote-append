import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import append from '../index.mjs';
import { issueLink, nodeOrigin } from '../link.mjs';

async function home(t, enrollment) {
  const directory = await mkdtemp(join(tmpdir(), 'divernote-append-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  if (enrollment) {
    await mkdir(join(directory, 'divernotes'), { recursive: true });
    await writeFile(join(directory, 'divernotes', 'agent-enrollment.json'), JSON.stringify(enrollment));
  }
  return { XDG_CONFIG_HOME: directory };
}

/** The commands the extension registers, as Divernote would hold them. */
function registered() {
  const commands = new Map();
  const issueCommands = new Map();
  append({
    registerCommand: (name, handler) => commands.set(name, handler),
    registerIssueCommand: (name, options, handler) => issueCommands.set(name, { ...options, handler }),
  });
  return { commands, issueCommands };
}

test('the link is the node\'s own page, at the issue', async t => {
  const env = await home(t, { mode: 'local-first', nodeOrigin: 'https://notes.example.com' });
  assert.equal(await nodeOrigin(env), 'https://notes.example.com');
  assert.equal(issueLink('https://notes.example.com', 'task-1a2b'), 'https://notes.example.com/app/#issue=task-1a2b');
  assert.throws(() => issueLink('https://notes.example.com', 'a b'), /not an issue ID/);
  assert.throws(() => issueLink('https://notes.example.com', '<script>'), /not an issue ID/);
});

test('a computer with no vault, or a node without HTTPS, says what it needs', async t => {
  await assert.rejects(nodeOrigin(await home(t)), /not paired with a vault node/);
  await assert.rejects(nodeOrigin(await home(t, { nodeOrigin: 'http://127.0.0.1:8787' })), /needs it on HTTPS/);
});

test('divernote append <task-id> prints the link', async t => {
  const env = await home(t, { nodeOrigin: 'https://notes.example.com' });
  const { commands } = registered();
  let out = '', err = '';
  const run = argv => commands.get('append')({ argv, env, stdout: text => { out += text; }, stderr: text => { err += text; } });
  assert.equal(await run(['task-9']), 0);
  assert.equal(out, 'https://notes.example.com/app/#issue=task-9\n');
  assert.equal(await run([]), 2);
  assert.match(err, /Usage: divernote append/);
});

test('/append shows the link under the input', async t => {
  const env = await home(t, { nodeOrigin: 'https://notes.example.com' });
  const saved = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = env.XDG_CONFIG_HOME;
  t.after(() => { if (saved === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = saved; });
  const { issueCommands } = registered();
  const command = issueCommands.get('append');
  assert.match(command.description, /comment/);
  assert.deepEqual(await command.handler({ args: '', issue: { taskId: 'task-9' } }), { status: 'https://notes.example.com/app/#issue=task-9' });
});
