# divernote-append

A Divernote extension. It gives you a link that opens an issue in a browser,
so you can select part of the agent's reply or lines of its changes, choose
**Comment**, and send the comments back with Enter. Plannotator-style
annotation for Divernote issues.

- `/append` in an open issue shows the link under the input.
- `divernote append <task-id>` prints it; `--open` also opens it here.

The link is your vault node's own page, `https://<node>/app/#issue=<task-id>`.
The node serves Divernote's page on its own origin, so the browser only talks
to your node, never to divernote.com. Open it on this computer, over
Tailscale, or wherever the node is reachable. The first time, pair the browser
with `/connect` and a `divernote pair` ticket.

- Needs a Divernote node that serves `/app/` and has an HTTPS `publicOrigin`
  (for a Tailscale-only node, its `tailscale serve` HTTPS name).
- On the iPhone, comment in the app itself: hold on the log to select, then
  Comment.
- Turn it off in /settings.

Install: `divernote install git:github.com/kyleboas/divernote-append`

Tests: `npm test`
