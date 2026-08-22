// Bridges the Studio to the render worker. The GitHub token stays server-side.
// Env in Netlify: GITHUB_TOKEN (fine-grained PAT, Actions:write, this repo
// only) and GITHUB_REPO. Neither takes a VITE_ prefix — that would inline the
// token into the client bundle and leak it.

const VALID = {
  entity: ['hnm', 'tns', 'dc', 'vibecode', 'all'],
  template: ['intro', 'outro', 'all'],
  orientation: ['horizontal', 'vertical', 'all'],
  audio: ['silent', 'sfx', 'all'],
  format: ['master', 'social', 'all'],
};

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });

  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return Response.json({ error: 'Render worker not configured.' }, { status: 503 });
  }

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Body must be JSON' }, { status: 400 }); }

  // Validate against an allowlist rather than forwarding arbitrary input into
  // a workflow that runs shell commands.
  const payload = {};
  for (const [key, allowed] of Object.entries(VALID)) {
    const parts = String(body[key] ?? 'all').split(',').map((s) => s.trim());
    const bad = parts.filter((p) => !allowed.includes(p));
    if (bad.length) return Response.json({ error: `Invalid ${key}: ${bad.join(', ')}`, allowed }, { status: 400 });
    payload[key] = parts.join(',');
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'render-request', client_payload: payload }),
  });

  if (!res.ok) return Response.json({ error: `GitHub returned ${res.status}` }, { status: 502 });
  return Response.json({ queued: true, payload, watch: `https://github.com/${repo}/actions` });
};

export const config = { path: '/api/render' };
