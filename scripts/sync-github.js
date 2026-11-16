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
      const res = await fetch(`https://api.github.com/repos/${repo.includes('/') ? repo : `${OWNER}/${repo}`}`, { headers });
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

  // Drift check: my own public repos that have no card on the deck. Forks are
  // skipped (they are covered by `owner/name` cards), and so is anything in
  // profile.ignoreRepos. Only public repos are listed, because github.json and
  // the Actions log are public; private projects still have to be added by hand.
  try {
    const tracked = new Set(
      [...repos, ...(manifest.profile.ignoreRepos || [])].map((r) => r.toLowerCase())
    );
    const mine = [];
    for (let page = 1; ; page++) {
      const res = await fetch(`https://api.github.com/users/${OWNER}/repos?type=owner&per_page=100&page=${page}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const batch = await res.json();
      mine.push(...batch);
      if (batch.length < 100) break;
    }
    out.untracked = mine
      .filter((r) => !r.fork && !r.private && !tracked.has(r.name.toLowerCase()))
      .map((r) => ({ name: r.name, pushedAt: r.pushed_at, description: r.description || '' }))
      .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
    if (out.untracked.length) {
      const names = out.untracked.map((r) => r.name).join(', ');
      console.log(`  ${out.untracked.length} public repo(s) with no card: ${names}`);
      // Shows as a warning on the workflow run without failing it
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Repos missing from the deck::${names}`);
    } else {
      console.log('  every public repo has a card');
    }
  } catch (err) {
    console.error(`  Error checking for untracked repos: ${err.message}`);
  }

  fs.writeFileSync(path.join(ROOT, 'github.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote github.json');
}

syncGithub();
