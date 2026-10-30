// Pulls stars, last push and language for every project with a public repo,
// and writes github.json for the deck's ops lines. Uses GITHUB_TOKEN if set.
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const OWNER = '00xJS';
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));

async function syncGithub() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'observation-deck' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const out = { generatedAt: new Date().toISOString(), repos: {} };
  const repos = [...new Set(manifest.projects.filter((p) => p.repo).map((p) => p.repo))];

  for (const repo of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r = await res.json();
      out.repos[repo] = {
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
        language: r.language,
        archived: r.archived,
      };
      console.log(`  ${repo}: ★${r.stargazers_count}, pushed ${r.pushed_at}`);
    } catch (err) {
      console.error(`  Error fetching ${repo}: ${err.message}`);
    }
  }

  // Contributions in the last year: the same figure as the profile's graph. Private
  // contributions are included because the profile shows them, so any token works
  // (GraphQL just needs one).
  if (headers.Authorization) {
    try {
      const query = `{ user(login: "${OWNER}") { contributionsCollection { contributionCalendar { totalContributions } } } }`;
      const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers, body: JSON.stringify({ query }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (body.errors) throw new Error(body.errors[0].message);
      out.contributions = { total: body.data.user.contributionsCollection.contributionCalendar.totalContributions };
      console.log(`  contributions in the last year: ${out.contributions.total}`);
    } catch (err) {
      console.error(`  Error counting contributions: ${err.message}`);
    }
  } else {
    console.log('  no GITHUB_TOKEN, skipping contributions');
  }

  fs.writeFileSync(path.join(ROOT, 'github.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote github.json');
}

syncGithub();
