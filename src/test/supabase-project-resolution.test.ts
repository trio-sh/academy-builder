import { describe, expect, it } from 'vitest';
import {
  CANONICAL_PROJECT,
  resolveProject,
} from '@/integrations/supabase/project';

// The live site went on calling a Supabase project that had been torn
// down, because the hosting dashboard's environment variables beat the
// committed .env at build time and nothing in the repository could
// outrank them. These tests pin the narrow rule that fixes it: the build
// environment stays authoritative for a project that exists, and loses
// only when it names one we know is gone.

const RETIRED_URL = 'https://ijxnsmponlrdhomaurkg.supabase.co';
const RETIRED_KEY = 'sb_publishable_someKeyForTheRetiredProject';

describe('resolveProject', () => {
  it('overrides a build environment still naming the retired project', () => {
    const r = resolveProject(RETIRED_URL, RETIRED_KEY);

    expect(r.source).toBe('canonical-retired');
    expect(r.url).toBe(CANONICAL_PROJECT.url);
    expect(r.url).not.toBe(RETIRED_URL);
  });

  it('carries the key over with the url, never one without the other', () => {
    // A url from one project and a key from another authenticates against
    // nothing, and fails looking like an outage rather than a mistake.
    const r = resolveProject(RETIRED_URL, RETIRED_KEY);

    expect(r.publishableKey).toBe(CANONICAL_PROJECT.publishableKey);
    expect(r.publishableKey).not.toBe(RETIRED_KEY);
  });

  it('leaves a live project named by the environment alone', () => {
    // Moving the app to a new project stays a dashboard change. If this
    // ever fails, the override has stopped being narrow.
    const url = 'https://someotherliveproject.supabase.co';
    const key = 'sb_publishable_aKeyForThatProject';
    const r = resolveProject(url, key);

    expect(r.source).toBe('environment');
    expect(r.url).toBe(url);
    expect(r.publishableKey).toBe(key);
  });

  it('falls back when the environment supplies nothing', () => {
    for (const [url, key] of [
      [undefined, undefined],
      ['', ''],
      ['   ', '  '],
      [CANONICAL_PROJECT.url, undefined],
      [undefined, CANONICAL_PROJECT.publishableKey],
    ] as const) {
      const r = resolveProject(url, key);
      expect(r.source).toBe('canonical-absent');
      expect(r.url).toBe(CANONICAL_PROJECT.url);
      expect(r.publishableKey).toBe(CANONICAL_PROJECT.publishableKey);
    }
  });

  it('matches the retired project however the url is written', () => {
    for (const url of [
      RETIRED_URL,
      `${RETIRED_URL}/`,
      'http://ijxnsmponlrdhomaurkg.supabase.co',
      'https://IJXNSMPONLRDHOMAURKG.supabase.co',
      'https://ijxnsmponlrdhomaurkg.supabase.in',
    ]) {
      expect(resolveProject(url, RETIRED_KEY).url).toBe(CANONICAL_PROJECT.url);
    }
  });

  it('points the canonical project at a url that matches its ref', () => {
    expect(CANONICAL_PROJECT.url).toContain(CANONICAL_PROJECT.ref);
  });

  it('never ships a secret or service-role key as the publishable one', () => {
    expect(CANONICAL_PROJECT.publishableKey).toMatch(/^sb_publishable_/);
    expect(CANONICAL_PROJECT.publishableKey).not.toMatch(/^sb_secret_/);
  });
});
