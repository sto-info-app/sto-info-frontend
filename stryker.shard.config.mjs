import { readFileSync } from 'node:fs';

/**
 * Config for one shard of the weekly full mutation run
 * (scripts/mutation-shards.mjs). It is stryker.config.json without the break
 * threshold: a shard holds only part of the mutate set, so the merge job
 * applies the threshold to the combined score instead.
 */
const base = JSON.parse(
  readFileSync(new URL('./stryker.config.json', import.meta.url), 'utf8'),
);
delete base.$schema;

export default {
  ...base,
  thresholds: { ...base.thresholds, break: null },
};
