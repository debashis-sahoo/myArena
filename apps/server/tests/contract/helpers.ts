import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { FormatsPlugin } from 'ajv-formats';
import { parse } from 'yaml';
import { expect } from 'vitest';

const read = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const base = read('../../../../specs/001-base-platform-experience/contracts/rest-api.openapi.yaml');
const delta = read('../../../../specs/002-games-landing-page/contracts/catalog-and-room-setup.openapi.yaml');
const ludoDelta = read('../../../../specs/003-ludo-game/contracts/catalog-art-image.openapi.yaml');
// Each path item and component schema in a later delta replaces the one of the same name in the earlier files.
const contract = {
  ...base,
  paths: { ...base.paths, ...delta.paths, ...ludoDelta.paths },
  components: { ...base.components, schemas: { ...base.components.schemas, ...delta.components.schemas, ...ludoDelta.components.schemas } },
};
const ajv = new Ajv2020({ strict: false, allErrors: true });
const addFormats: FormatsPlugin = createRequire(import.meta.url)('ajv-formats');
addFormats(ajv);

export function validateResponse(path: string, method: string, status: number, body: unknown): void {
  let response = contract.paths[path][method].responses[String(status)];
  if (response.$ref) response = contract.components.responses[response.$ref.split('/').at(-1)];
  const content = response.content;
  if (!content) { expect(body).toBeUndefined(); return; }
  const media = content['application/json'] ?? content['application/problem+json'];
  const validate = ajv.compile({ ...media.schema, components: contract.components });
  expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
}