// divernote-append: a link that opens an issue in a browser, where its log and
// changes can be selected and commented on. `/append` in an open issue shows
// opens it here; `divernote append <task-id>` prints it. See link.mjs.
import { execFile } from 'node:child_process';
import { issueLink, nodeOrigin } from './link.mjs';

const USAGE = 'Usage: divernote append <task-id> [--open]\n';

/** Opens `url` in this computer's browser, where it has one. */
function openInBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'linux' ? 'xdg-open' : undefined;
  if (!command) return Promise.resolve(false);
  return new Promise(resolve => execFile(command, [url], { timeout: 5_000 }, error => resolve(!error)));
}

export default function append(divernote, { open = openInBrowser, env = process.env } = {}) {
  divernote.registerIssueCommand('append', { description: 'Open this issue in a browser to comment on it' }, async ({ issue }) => {
    // The command runs in the terminal that typed it, so the browser here is
    // the reader's, except over SSH. Divernote's status line drops links, so
    // when the page cannot open here the status names the command that prints it.
    const printIt = "Run divernote append with this issue's ID for the link.";
    let url;
    try {
      url = issueLink(await nodeOrigin(), issue.taskId);
    } catch (error) {
      return { status: error instanceof Error ? error.message : String(error) };
    }
    if (env.SSH_CONNECTION || env.SSH_TTY) return { status: printIt };
    return { status: await open(url) ? 'Opened this issue in your browser.' : `The browser could not be opened. ${printIt}` };
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
