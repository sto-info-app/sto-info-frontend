import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY;
const PR_COMMENT_FILE = process.env.CI_SUMMARY_FILE;

function appendToSummary(text) {
  if (SUMMARY_FILE) {
    appendFileSync(SUMMARY_FILE, text + '\n');
  }
  if (PR_COMMENT_FILE) {
    appendFileSync(PR_COMMENT_FILE, text + '\n');
  }
  console.log(text);
}

// --- 1. Unit Test Results (JUnit XML) ---
function getTestSummary() {
  const junitPath = join('reports', 'junit', 'junit.xml');
  if (!existsSync(junitPath)) return null;

  const content = readFileSync(junitPath, 'utf8');
  // Simple regex extraction for JUnit
  const tests = content.match(/tests="(\d+)"/) || [0, 0];
  const failures = content.match(/failures="(\d+)"/) || [0, 0];
  const errors = content.match(/errors="(\d+)"/) || [0, 0];
  const skipped = content.match(/skipped="(\d+)"/) || [0, 0];

  return {
    total: Number.parseInt(tests[1], 10),
    failed: Number.parseInt(failures[1], 10) + Number.parseInt(errors[1], 10),
    skipped: Number.parseInt(skipped[1], 10),
    passed:
      Number.parseInt(tests[1], 10) -
      (Number.parseInt(failures[1], 10) +
        Number.parseInt(errors[1], 10) +
        Number.parseInt(skipped[1], 10)),
  };
}

// --- 2. Code Coverage (JSON Summary) ---
function getCoverageSummary() {
  const covPath = join('reports', 'coverage', 'coverage-summary.json');
  if (!existsSync(covPath)) return null;

  try {
    const data = JSON.parse(readFileSync(covPath, 'utf8'));
    return data.total;
  } catch {
    return null;
  }
}

// --- 3. Lighthouse (Manifest JSON) ---
function getLighthouseSummary() {
  const lhciPath = join('reports', 'lighthouse', 'manifest.json');
  if (!existsSync(lhciPath)) return null;

  try {
    const manifest = JSON.parse(readFileSync(lhciPath, 'utf8'));
    const resultsByUrl = manifest.reduce((acc, run) => {
      if (!acc[run.url]) {
        acc[run.url] = { p: [], a: [], b: [], s: [] };
      }
      if (run.summary) {
        acc[run.url].p.push(run.summary.performance);
        acc[run.url].a.push(run.summary.accessibility);
        acc[run.url].b.push(run.summary['best-practices']);
        acc[run.url].s.push(run.summary.seo);
      }
      return acc;
    }, {});

    return Object.entries(resultsByUrl).map(([url, scores]) => {
      const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length) * 100;
      return {
        url,
        performance: Math.round(avg(scores.p)),
        accessibility: Math.round(avg(scores.a)),
        bestPractices: Math.round(avg(scores.b)),
        seo: Math.round(avg(scores.s)),
      };
    });
  } catch {
    return null;
  }
}

// --- Main execution ---

appendToSummary('## 🚀 CI Pipeline Summary');

// Unit Tests
const tests = getTestSummary();
if (tests) {
  const status = tests.failed > 0 ? '❌' : '✅';
  appendToSummary(`### ${status} Unit Tests`);
  appendToSummary(`- **Total**: ${tests.total}`);
  appendToSummary(`- **Passed**: ${tests.passed}`);
  appendToSummary(`- **Failed**: ${tests.failed}`);
  if (tests.skipped > 0) appendToSummary(`- **Skipped**: ${tests.skipped}`);
}

// Coverage
const cov = getCoverageSummary();
if (cov) {
  const getIcon = pct => {
    if (pct >= 99) return '🟢';
    if (pct >= 80) return '🟡';
    return '🔴';
  };
  appendToSummary('### 📊 Code Coverage');
  appendToSummary('| Category | Percentage | Status |');
  appendToSummary('| :--- | :---: | :---: |');
  appendToSummary(
    `| Statements | ${cov.statements.pct}% | ${getIcon(cov.statements.pct)} |`,
  );
  appendToSummary(
    `| Branches | ${cov.branches.pct}% | ${getIcon(cov.branches.pct)} |`,
  );
  appendToSummary(
    `| Functions | ${cov.functions.pct}% | ${getIcon(cov.functions.pct)} |`,
  );
  appendToSummary(`| Lines | ${cov.lines.pct}% | ${getIcon(cov.lines.pct)} |`);
}

// Lighthouse
const lhci = getLighthouseSummary();
if (lhci) {
  appendToSummary('### ⚡ Lighthouse Audit');
  appendToSummary('| Page | Perf | Acc | Best | SEO |');
  appendToSummary('| :--- | :---: | :---: | :---: | :---: |');
  lhci.forEach(page => {
    const url = new URL(page.url).pathname;
    const getIcon = score => {
      if (score >= 90) return '🟢';
      if (score >= 50) return '🟡';
      return '🔴';
    };
    appendToSummary(
      `| ${url} | ${getIcon(page.performance)} ${page.performance} | ${getIcon(page.accessibility)} ${page.accessibility} | ${getIcon(page.bestPractices)} ${page.bestPractices} | ${getIcon(page.seo)} ${page.seo} |`,
    );
  });
}

appendToSummary('\n_Full reports available as workflow artifacts._');
