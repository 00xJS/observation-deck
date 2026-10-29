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

  // Commits this year. The search only sees repos the token can read: with a
  // personal STATS_TOKEN that includes private repos, with the Actions token only
  // public ones. Compare against an anonymous search to label which it is.
  const since = `${new Date().getUTCFullYear()}-01-01`;
  const q = `search/commits?q=author:${OWNER}+committer-date:>=${since}&per_page=1`;
  try {
    const count = async (h) => {
      const res = await fetch(`https://api.github.com/${q}`, { headers: h });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).total_count;
    };
    const anon = { Accept: headers.Accept, 'User-Agent': headers['User-Agent'] };
    const publicCount = await count(anon);
    const total = headers.Authorization ? await count(headers) : publicCount;
    out.commits = { year: Number(since.slice(0, 4)), total, scope: total > publicCount ? 'all' : 'public' };
    console.log(`  commits since ${since}: ${total} (${out.commits.scope})`);
  } catch (err) {
    console.error(`  Error counting commits: ${err.message}`);
  }

  fs.writeFileSync(path.join(ROOT, 'github.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote github.json');
}

syncGithub();
