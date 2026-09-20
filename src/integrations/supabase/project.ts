// Which Supabase project this application talks to.
//
// Why this is in code and not only in .env
// ----------------------------------------
// A hosting dashboard's environment variables beat a committed .env file
// at build time. Vite does this on purpose:
//
//   // check if there are actual env variables starting with VITE_*
//   // these are typically provided inline and should be prioritized
//   for (const key in process.env) { if (key.startsWith(prefix)) ... }
//
// So the repository cannot correct a stale deployment setting by editing
// .env, no matter which .env file it edits. That precedence is what kept
// the live site calling a project that had been torn down: the repo said
// one thing, the dashboard said another, and the dashboard shipped.
//
// The rule here is narrow on purpose. The build environment stays
// authoritative for any project it names that actually exists, so moving
// the app to a new project is still a dashboard change and not a code
// change. What it may not do is name a project we know is gone.

export const CANONICAL_PROJECT = {
  ref: 'tnjyywtulpdyackmwnca',
  url: 'https://tnjyywtulpdyackmwnca.supabase.co',
  // Publishable, by design: it ships inside the client bundle and is
  // readable by anyone who loads the page. Row-level security is what
  // protects the data, not the secrecy of this string. The secret and
  // service-role keys are not in this repository and must never be.
  publishableKey: 'sb_publishable_4B9I2p0hFbDzJeLxVthbMQ_5C59i2oV',
} as const;

// Projects that have been torn down. A build environment still naming one
// is carrying configuration that stopped being true, not expressing a
// choice, so it does not win.
const RETIRED_PROJECT_REFS: readonly string[] = ['ijxnsmponlrdhomaurkg'];

export type ProjectSource = 'environment' | 'canonical-retired' | 'canonical-absent';

export interface ResolvedProject {
  url: string;
  publishableKey: string;
  source: ProjectSource;
  /** Set when the environment was overridden, for the console warning. */
  overrodeUrl?: string;
}

function refOf(url: string): string {
  // https://<ref>.supabase.co
  //
  // Lowercased before it is returned. The pattern matches
  // case-insensitively but the comparison against the retired list does
  // not, so without this an uppercased ref would read as a different,
  // live project and the override would not fire.
  return (/^https?:\/\/([a-z0-9]+)\.supabase\./i.exec(url)?.[1] ?? '').toLowerCase();
}

/**
 * The URL and publishable key are resolved together as one pair, never
 * independently. Taking the URL from one project and the key from another
 * produces a client that authenticates against nothing and fails in a way
 * that reads like an outage rather than a misconfiguration.
 */
export function resolveProject(
  envUrl: string | undefined,
  envKey: string | undefined,
): ResolvedProject {
  const url = (envUrl ?? '').trim();
  const key = (envKey ?? '').trim();

  if (!url || !key) {
    return { ...CANONICAL_PROJECT, source: 'canonical-absent' };
  }

  if (RETIRED_PROJECT_REFS.includes(refOf(url))) {
    return { ...CANONICAL_PROJECT, source: 'canonical-retired', overrodeUrl: url };
  }

  return { url, publishableKey: key, source: 'environment' };
}

export const PROJECT = resolveProject(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

if (PROJECT.source !== 'environment' && typeof console !== 'undefined') {
  // Loud rather than silent. An override that nobody can see is how a
  // deployment ends up running against a project nobody meant to use.
  console.warn(
    PROJECT.source === 'canonical-retired'
      ? `[supabase] Build environment names a retired project (${PROJECT.overrodeUrl}). `
        + `Using ${CANONICAL_PROJECT.url} instead. Update VITE_SUPABASE_URL and `
        + `VITE_SUPABASE_PUBLISHABLE_KEY in the hosting dashboard to clear this.`
      : `[supabase] No project configured in the build environment. `
        + `Using ${CANONICAL_PROJECT.url}.`,
  );
}
