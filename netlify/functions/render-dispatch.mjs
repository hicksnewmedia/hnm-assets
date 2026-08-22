// Bridges the Studio (browser) to the render worker (GitHub Actions).
// The GitHub token stays server-side — never shipped to the client.
//
// Required env vars in Netlify:
//   GITHUB_TOKEN  — fine-grained PAT, Contents:read + Actions:write on this repo only
//   GITHUB_REPO   — e.g. hicksnewmedia/brand-vault
//
// Note the deliberate absence of a VITE_ prefix: anything VITE_-prefixed
// gets inlined into the client bundle, which would leak the token.

const VALID = {
  entity: ['hnm', 'tns', 'tekstack', 'tekforum', 'dc', 'all'],
  template: ['intro', 'outro', 'lowerThird', 'all'],
  orientation: ['horizontal', 'vertical', 'all'],
  format: ['master', 'overlay', 'social', 'all'],
};

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return Response.json(
      { error: 'Render worker not configured. Set GITHUB_TOKEN and GITHUB_REPO.' },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  // Validate against the allowlist rather than forwarding arbitrary input
  // into a workflow that runs shell commands.
  const payload = {};
  for (const [key, allowed] of Object.entries(VALID)) {
    const value = body[key] ?? 'all';
    const parts = String(value).split(',').map((s) => s.trim());
    const bad = parts.filter((p) => !allowed.includes(p));
    if (bad.length) {
      return Response.json(
        { error: `Invalid ${key}: ${bad.join(', ')}`, allowed },
        { status: 400 },
      );
    }
    payload[key] = parts.join(',');
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'render-request', client_payload: payload }),
  });

  if (!res.ok) {
    return Response.json(
      { error: `GitHub returned ${res.status}`, detail: await res.text() },
      { status: 502 },
    );
  }

  return Response.json({
    queued: true,
    payload,
    watch: `https://github.com/${repo}/actions`,
  });
};

export const config = { path: '/api/render' };
