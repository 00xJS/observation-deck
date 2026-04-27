const puppeteer = require('puppeteer');
const path = require('path');

const projects = [
  { name: 'calculat-bur', url: 'https://calculat-bur.netlify.app/' },
  { name: 'cashflow-comp', url: 'https://cashflow-comp.netlify.app/' },
  { name: 'dca', url: 'https://dca-btc-with-me.netlify.app/' },
  { name: 'icombo', url: 'https://i-combinator.netlify.app/' },
  { name: 'degen', url: 'https://sundance-dgen.netlify.app/' },
  { name: 'mickeys', url: 'https://phoenix-mickydeez.netlify.app/' },
];

const IMAGES_DIR = path.join(__dirname, '..', 'images');

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const project of projects) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      console.log(`Capturing: ${project.name} (${project.url})`);
      await page.goto(project.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const outputPath = path.join(IMAGES_DIR, `${project.name}.png`);
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log(`  Saved: ${outputPath}`);
    } catch (err) {
      console.error(`  Error capturing ${project.name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Done.');
}

captureScreenshots();
