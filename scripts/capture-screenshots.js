const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const projects = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));

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
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    try {
      console.log(`Capturing: ${project.id} (${project.url})`);
      const started = Date.now();
      const response = await page.goto(project.url, { waitUntil: 'networkidle0', timeout: 30000 });
      const responseMs = Date.now() - started;
      await new Promise((r) => setTimeout(r, 2000));

      const outputPath = path.join(IMAGES_DIR, `${project.id}.webp`);
      await page.screenshot({ path: outputPath, type: 'webp', quality: 82, fullPage: false });

      status.projects[project.id] = {
        up: response !== null && response.ok(),
        httpStatus: response ? response.status() : null,
        responseMs,
        capturedAt: new Date().toISOString(),
      };
      console.log(`  Saved: ${outputPath} (${status.projects[project.id].httpStatus}, ${responseMs}ms)`);
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
