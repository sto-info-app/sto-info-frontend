import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

// Check for manifest.json in root or reports/lighthouse
const possiblePaths = [
  'manifest.json',
  join('reports', 'lighthouse', 'manifest.json'),
  join('.lighthouseci', 'manifest.json'),
];

let manifestPath = possiblePaths.find(p => existsSync(p));

if (!manifestPath) {
  console.error(
    '❌ Lighthouse manifest.json not found. Run "npm run lighthouse" first.',
  );
  process.exit(1);
}

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const resultsByUrl = manifest.reduce((acc, run) => {
    if (!acc[run.url]) {
      acc[run.url] = {
        performance: [],
        accessibility: [],
        'best-practices': [],
        seo: [],
      };
    }

    if (run.summary) {
      Object.keys(acc[run.url]).forEach(key => {
        if (run.summary[key] !== undefined) {
          acc[run.url][key].push(run.summary[key]);
        }
      });
    }

    return acc;
  }, {});

  console.log('\n📊 Lighthouse Score Summary (Averages across all runs)');
  console.log('| Page | Performance | Accessibility | Best Practices | SEO |');
  console.log('| :--- | :---: | :---: | :---: | :---: |');

  const formatScore = arr => {
    if (!arr.length) return 'N/A';
    const average = (arr.reduce((a, b) => a + b, 0) / arr.length) * 100;
    const score = Math.round(average);
    let icon;
    if (score >= 90) icon = '🟢';
    else if (score >= 50) icon = '🟠';
    else icon = '🔴';
    return `${icon} ${score}`;
  };

  Object.entries(resultsByUrl)
    .sort(([urlA], [urlB]) => urlA.localeCompare(urlB))
    .forEach(([url, scores]) => {
      // Extract path or show full URL if local
      let pageLabel;
      try {
        const urlObj = new URL(url);
        pageLabel = urlObj.pathname === '/' ? '/' : urlObj.pathname;
      } catch {
        pageLabel = url;
      }

      console.log(
        `| ${pageLabel} | ${formatScore(scores.performance)} | ${formatScore(
          scores.accessibility,
        )} | ${formatScore(scores['best-practices'])} | ${formatScore(
          scores.seo,
        )} |`,
      );
    });

  // Write to GitHub Step Summary if in CI
  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = await import('node:fs');
    let summary = '### 📊 Lighthouse Score Summary (Averages)\n\n';
    summary +=
      '| Page | Performance | Accessibility | Best Practices | SEO |\n';
    summary += '| :--- | :---: | :---: | :---: | :---: |\n';

    Object.entries(resultsByUrl)
      .sort(([urlA], [urlB]) => urlA.localeCompare(urlB))
      .forEach(([url, scores]) => {
        let pageLabel;
        try {
          const urlObj = new URL(url);
          pageLabel = urlObj.pathname === '/' ? '/' : urlObj.pathname;
        } catch {
          pageLabel = url;
        }
        summary += `| ${pageLabel} | ${formatScore(scores.performance)} | ${formatScore(
          scores.accessibility,
        )} | ${formatScore(scores['best-practices'])} | ${formatScore(
          scores.seo,
        )} |\n`;
      });

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  console.log('\n');
} catch (err) {
  console.error('❌ Error parsing manifest.json:', err.message);
  process.exit(1);
}
