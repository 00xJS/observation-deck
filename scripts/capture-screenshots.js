const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
// Only projects with a live URL get checked. Those with their own `image` get a
// liveness check but keep that image instead of a fresh screenshot.
const projects = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'))
  .projects.filter((p) => p.url);

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const status = {
    generatedAt: new Date().toISOString(),
    projects: {},
  };

  for (const project of projects) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
    // Pin dark. Every site is dark-only now, so this is belt-and-braces — but CI reports
    // no OS preference (which resolves to light), so it keeps captures deterministic here
    // and on GitHub Actions, and guards any future project that ships a light theme.
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    try {
      console.log(`Capturing: ${project.id} (${project.url})`);
      const started = Date.now();
      // A liveness-only check (project ships its own image) just needs the page to load;
      // heavy apps like the map editor never go network-idle.
      const waitUntil = project.image ? 'load' : 'networkidle0';
      const response = await page.goto(project.url, { waitUntil, timeout: 30000 });
      const responseMs = Date.now() - started;
      await new Promise((r) => setTimeout(r, 2000));

      const outputPath = path.join(IMAGES_DIR, `${project.id}.webp`);
      if (!project.image) {
        await page.screenshot({ path: outputPath, type: 'webp', quality: 78, fullPage: false });
      }

      status.projects[project.id] = {
        up: response !== null && (response.ok() || response.status() === 304),  // 304: cached by an earlier page on the same host
        httpStatus: response ? response.status() : null,
        responseMs,
        capturedAt: new Date().toISOString(),
      };
      console.log(`  ${project.image ? 'Checked' : 'Saved: ' + outputPath} (${status.projects[project.id].httpStatus}, ${responseMs}ms)`);
    } catch (err) {
      console.error(`  Error capturing ${project.id}: ${err.message}`);
      status.projects[project.id] = {
        up: false,
        httpStatus: null,
        responseMs: null,
        capturedAt: new Date().toISOString(),
        error: err.message,
      };
    } finally {
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'status.json'), JSON.stringify(status, null, 2) + '\n');
  console.log('Wrote status.json');
  console.log('Done.');
}

captureScreenshots();
