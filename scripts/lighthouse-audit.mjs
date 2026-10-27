// Lighthouse audit of the public static pages, run straight against the
// `lighthouse` package rather than through Lighthouse CI. `@lhci/cli` pinned
// Lighthouse 12 and with it a vulnerable dependency chain, and it had not had
// a release in over a year.
//
// Usage:
//   node scripts/lighthouse-audit.mjs                 collect, report, assert
//   node scripts/lighthouse-audit.mjs --collect-only  collect and report only
//
// Every page is audited `runs` times. Assertions judge the median run (the
// one closest to the median FCP and TTI, chosen by Lighthouse's own helper).
// Any audit Lighthouse scores must reach `defaultMinScore` or it fails the
// run, unless `assertions` says otherwise. The weighted performance metrics
// are the exception: the performance category score already governs them.
//
// Reports land in `outputDir` with a `manifest.json` in the shape Lighthouse
// CI used to write, so `scripts/generate-ci-summary.mjs` reads either.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

import * as chromeLauncher from 'chrome-launcher';
import lighthouse, { desktopConfig } from 'lighthouse';
import { computeMedianRun } from 'lighthouse/core/lib/median-run.js';

const CONFIG_FILE = 'lighthouse.config.json';
const SCORED_MODES = new Set(['binary', 'numeric', 'metricSavings']);
const SUMMARY_CATEGORIES = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
];

const collectOnly = process.argv.includes('--collect-only');
const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
const require = createRequire(import.meta.url);

/** Starts `serve` on the built app and resolves once it accepts connections. */
function startServer({ directory, port }) {
  const servePackage = require.resolve('serve/package.json');
  const { bin } = JSON.parse(readFileSync(servePackage, 'utf8'));
  const serveBin = resolve(dirname(servePackage), bin.serve ?? bin);

  const server = spawn(
    process.execPath,
    [serveBin, '-s', directory, '-p', String(port), '--no-clipboard'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  return new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(
      () => rejectReady(new Error('serve did not start within 30 seconds')),
      30_000,
    );
    const onOutput = chunk => {
      if (chunk.toString().includes('Accepting connections at')) {
        clearTimeout(timer);
        resolveReady(server);
      }
    };
    server.stdout.on('data', onOutput);
    server.stderr.on('data', onOutput);
    server.on('exit', code => {
      clearTimeout(timer);
      rejectReady(new Error(`serve exited early with code ${code}`));
    });
  });
}

/** One Lighthouse run in a fresh Chrome, so runs cannot share a cache. */
async function auditOnce(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: config.chromeFlags,
  });
  try {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: ['html', 'json'],
        logLevel: 'error',
        extraHeaders: config.extraHeaders,
        onlyCategories: config.categories,
      },
      desktopConfig,
    );
    if (!result) throw new Error(`Lighthouse returned no result for ${url}`);
    return result;
  } finally {
    await chrome.kill();
  }
}

function slugFor(url) {
  const path = new URL(url).pathname.replaceAll('/', '-').replace(/^-|-$/g, '');
  return path || 'home';
}

/** Normalises an assertion entry to `{ level, options }`. */
function parseRule(rule) {
  if (Array.isArray(rule)) return { level: rule[0], options: rule[1] ?? {} };
  return { level: rule, options: {} };
}

/** Checks one score or numeric value; returns a failure or null. */
function check(level, options, { score, numericValue }) {
  const minScore = options.minScore ?? config.defaultMinScore;
  if (options.maxNumericValue !== undefined) {
    if (numericValue === undefined || numericValue <= options.maxNumericValue) {
      return null;
    }
    return {
      level,
      actual: numericValue,
      expected: `<= ${options.maxNumericValue}`,
    };
  }
  if (score === null || score === undefined || score >= minScore) return null;
  return { level, actual: score, expected: `>= ${minScore}` };
}

function assertRun(lhr) {
  const failures = [];
  const assertions = config.assertions;

  const unknown = Object.keys(assertions).filter(id =>
    id.startsWith('categories:')
      ? !lhr.categories[id.slice('categories:'.length)]
      : !lhr.audits[id],
  );
  if (unknown.length > 0) {
    throw new Error(
      `${CONFIG_FILE} asserts on ${unknown.join(', ')}, which Lighthouse ` +
        `${lhr.lighthouseVersion} does not report. Update the config.`,
    );
  }

  for (const [id, category] of Object.entries(lhr.categories)) {
    const rule = assertions[`categories:${id}`];
    if (!rule) continue;
    const { level, options } = parseRule(rule);
    if (level === 'off') continue;
    const failure = check(level, options, { score: category.score });
    if (failure) failures.push({ id: `categories:${id}`, ...failure });
  }

  const governedByCategory = new Set(
    (lhr.categories.performance?.auditRefs ?? [])
      .filter(ref => ref.weight > 0)
      .map(ref => ref.id),
  );

  for (const [id, audit] of Object.entries(lhr.audits)) {
    const rule = assertions[id];
    if (!rule && governedByCategory.has(id)) continue;
    if (!rule && !SCORED_MODES.has(audit.scoreDisplayMode)) continue;
    const { level, options } = parseRule(rule ?? 'error');
    if (level === 'off') continue;
    const failure = check(level, options, audit);
    if (failure) failures.push({ id, title: audit.title, ...failure });
  }

  return failures;
}

async function main() {
  const { outputDir, server: serverConfig } = config;
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const server = await startServer(serverConfig);
  const manifest = [];
  const results = [];

  try {
    for (const path of config.urls) {
      const url = `http://localhost:${serverConfig.port}${path}`;
      const runs = [];

      for (let run = 1; run <= config.runs; run++) {
        console.log(`Auditing ${path} (run ${run} of ${config.runs})`);
        const { lhr, report } = await auditOnce(url);
        const [html, json] = report;
        const base = join(outputDir, `${slugFor(url)}-${run}.report`);
        writeFileSync(`${base}.html`, html);
        writeFileSync(`${base}.json`, json);
        runs.push({ lhr, htmlPath: `${base}.html`, jsonPath: `${base}.json` });
      }

      const median = computeMedianRun(runs.map(run => run.lhr));
      for (const run of runs) {
        manifest.push({
          url,
          isRepresentativeRun: run.lhr === median,
          htmlPath: resolve(run.htmlPath),
          jsonPath: resolve(run.jsonPath),
          summary: Object.fromEntries(
            SUMMARY_CATEGORIES.map(id => [id, run.lhr.categories[id]?.score]),
          ),
        });
      }

      if (!collectOnly) {
        for (const failure of assertRun(median))
          results.push({ url, ...failure });
      }
    }
  } finally {
    server.kill();
  }

  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  if (collectOnly) return;

  writeFileSync(
    join(outputDir, 'assertion-results.json'),
    JSON.stringify(results, null, 2),
  );

  for (const result of results) {
    const page = new URL(result.url).pathname;
    console.log(
      `${result.level.toUpperCase()} ${page} ${result.id}: ` +
        `${result.actual} (expected ${result.expected})`,
    );
  }

  const errors = results.filter(result => result.level === 'error');
  const warnings = results.length - errors.length;
  console.log(
    `\nLighthouse: ${errors.length} error(s), ${warnings} warning(s) ` +
      `across ${config.urls.length} page(s).`,
  );
  if (errors.length > 0) process.exitCode = 1;
}

await main();
