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
function registered(options) {
  const commands = new Map();
  const issueCommands = new Map();
  append({
    registerCommand: (name, handler) => commands.set(name, handler),
    registerIssueCommand: (name, details, handler) => issueCommands.set(name, { ...details, handler }),
  }, options);
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

test('/append opens the issue in the browser here, and over SSH says how to print the link', async t => {
  const env = await home(t, { nodeOrigin: 'https://notes.example.com' });
  const saved = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = env.XDG_CONFIG_HOME;
  t.after(() => { if (saved === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = saved; });
  const opened = [];
  const run = (options, taskId = 'task-9') => registered(options).issueCommands.get('append').handler({ args: '', issue: { taskId } });
  assert.match(registered().issueCommands.get('append').description, /comment/);
  assert.deepEqual(await run({ env: {}, open: async url => { opened.push(url); return true; } }), { status: 'Opened this issue in your browser.' });
  assert.deepEqual(opened, ['https://notes.example.com/app/#issue=task-9']);
  assert.deepEqual(await run({ env: {}, open: async () => false }), { status: 'The browser could not be opened. Run divernote append with the issue ID for the link.' });
  assert.deepEqual(await run({ env: { SSH_CONNECTION: '1 2 3 4' }, open: async () => assert.fail('no browser over SSH') }), { status: 'Run divernote append with the issue ID for the link.' });
  assert.deepEqual(await run({ env: {}, open: async () => assert.fail('no link to open') }, 'a b'), { status: 'That is not an issue ID.' });
});
