// divernote-append: a link that opens an issue in a browser, where its log and
// changes can be selected and commented on. `/append` in an open issue shows
// it; `divernote append <task-id>` prints it. See link.mjs.
import { execFile } from 'node:child_process';
import { issueLink, nodeOrigin } from './link.mjs';

const USAGE = 'Usage: divernote append <task-id> [--open]\n';

/** Opens `url` in this computer's browser, where it has one. */
function openInBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'linux' ? 'xdg-open' : undefined;
  if (!command) return Promise.resolve(false);
  return new Promise(resolve => execFile(command, [url], { timeout: 5_000 }, error => resolve(!error)));
}

export default function append(divernote) {
  divernote.registerIssueCommand('append', { description: 'Open this issue in a browser to comment on it' }, async ({ issue }) => {
    // Only the link: the command may run on another computer than the one reading it.
    try {
      return { status: issueLink(await nodeOrigin(), issue.taskId) };
    } catch (error) {
      return { status: error instanceof Error ? error.message : String(error) };
    }
  });

  divernote.registerCommand('append', async ({ argv, env, stdout, stderr }) => {
    const open = argv.includes('--open');
    const rest = argv.filter(arg => arg !== '--open');
    if (rest.length !== 1 || rest[0].startsWith('-')) {
      stderr(USAGE);
      return 2;
    }
    try {
      const url = issueLink(await nodeOrigin(env), rest[0]);
      stdout(`${url}\n`);
      if (open) await openInBrowser(url);
      return 0;
    } catch (error) {
      stderr(`${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  });
}
