// Refreshes the self-hosted copy of the Font Awesome kit stylesheet.
//
// The app used to load `kit.fontawesome.com/<id>.js`, which fetched this
// stylesheet at runtime and injected it as a <style> element. That injection
// forced a full-page style and layout pass after load, and the icons popped
// in late enough to shift text. The kit is subsetted with its fonts inlined
// as data URIs, so the stylesheet is self-contained and is bundled instead
// (angular.json `styles`).
//
// Run this after adding or removing icons in the kit on fontawesome.com, then
// commit the result:
//
//   FONT_AWESOME_KIT_ID=<kit id> npm run fa:update
//
// The kit only serves requests from an allowed origin, hence the Origin header.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';

const OUTPUT_FILE = 'vendor/font-awesome/kit.css';
const ORIGIN = 'https://startrekonline.info';

const kitId = process.env.FONT_AWESOME_KIT_ID ?? process.argv[2];
if (!kitId) {
  console.error('Set FONT_AWESOME_KIT_ID or pass the kit id as an argument.');
  process.exit(1);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Origin: ORIGIN } });
  if (!response.ok) {
    throw new Error(
      `${url} answered ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

/** Pulls the `window.FontAwesomeKitConfig = {...}` object out of kit.js. */
function readKitConfig(kitScript) {
  const marker = 'window.FontAwesomeKitConfig = ';
  const start = kitScript.indexOf(marker);
  if (start < 0)
    throw new Error('kit.js no longer carries FontAwesomeKitConfig');

  let depth = 0;
  const from = start + marker.length;
  for (let index = from; index < kitScript.length; index++) {
    if (kitScript[index] === '{') depth++;
    if (kitScript[index] === '}' && --depth === 0) {
      return JSON.parse(kitScript.slice(from, index + 1));
    }
  }
  throw new Error('FontAwesomeKitConfig is not a complete object');
}

const config = readKitConfig(
  await fetchText(`https://kit.fontawesome.com/${kitId}.js`),
);
if (!config.subsetPath) {
  throw new Error(
    'The kit is not subsetted, so its stylesheet links to separate font ' +
      'files. Turn subsetting back on in the kit settings before self-hosting.',
  );
}

const css = await fetchText(
  `${config.baseUrl}/${config.subsetPath}?token=${config.token}`,
);
if (!css.includes('@font-face')) {
  throw new Error(
    'The kit stylesheet has no @font-face rules; not writing it.',
  );
}

mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(
  OUTPUT_FILE,
  `/* Font Awesome ${config.license} ${config.version} kit subset. Generated ` +
    `by scripts/update-font-awesome.mjs; do not edit by hand. */\n${css}\n`,
);
console.log(
  `Wrote ${OUTPUT_FILE} (${Math.round(css.length / 1024)} KB, ` +
    `Font Awesome ${config.version}).`,
);
