/**
 * Search-hit display strings include a leading [score] and optional trailing
 * ` -- # Title`. Agents pass the whole line to get_page; normalize before lookup.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import { resetPgliteState } from './helpers/reset-pglite.ts';
import {
  operations,
  normalizePageSlugInput,
  type OperationContext,
} from '../src/core/operations.ts';

let engine: PGLiteEngine;
const get_page = operations.find(o => o.name === 'get_page')!;

const BARE_SLUG = 'gtm/deals/acme-example-deal/acme-example-deal';

function ctxOf(): OperationContext {
  return {
    engine: engine as any,
    config: {} as any,
    logger: console as any,
    dryRun: false,
    remote: false,
    sourceId: 'default',
  };
}

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
}, 60_000);

afterAll(async () => {
  if (engine) await engine.disconnect();
}, 60_000);

beforeEach(async () => {
  await resetPgliteState(engine);
  await engine.putPage(BARE_SLUG, {
    type: 'note',
    title: 'Acme Example Deal',
    compiled_truth: 'deal body',
    frontmatter: {},
  });
});

describe('normalizePageSlugInput', () => {
  test('strips score prefix and ASCII double-hyphen title suffix', () => {
    const dirty =
      `[1.0000] ${BARE_SLUG} -- # Acme Example - Deal Note`;
    expect(normalizePageSlugInput(dirty)).toBe(BARE_SLUG);
  });

  test('strips score prefix only when no title suffix', () => {
    const dirty = `[1.0000] ${BARE_SLUG}`;
    expect(normalizePageSlugInput(dirty)).toBe(BARE_SLUG);
  });

  test('leaves bare slug unchanged (idempotent)', () => {
    expect(normalizePageSlugInput(BARE_SLUG)).toBe(BARE_SLUG);
  });
});

describe('get_page resolves dirty search-hit slug input', () => {
  test('dirty slug with score and title finds the page', async () => {
    const dirty =
      `[1.0000] ${BARE_SLUG} -- # Acme Example - Deal Note`;
    const page: any = await get_page.handler(ctxOf(), { slug: dirty });
    expect(page.slug).toBe(BARE_SLUG);
    expect(page.title).toBe('Acme Example Deal');
  });

  test('dirty slug with score only finds the page', async () => {
    const dirty = `[1.0000] ${BARE_SLUG}`;
    const page: any = await get_page.handler(ctxOf(), { slug: dirty });
    expect(page.slug).toBe(BARE_SLUG);
  });

  test('clean slug still works', async () => {
    const page: any = await get_page.handler(ctxOf(), { slug: BARE_SLUG });
    expect(page.slug).toBe(BARE_SLUG);
  });
});
