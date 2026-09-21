import { describe, expect, it } from 'vitest';
import { deriveNames } from '@/contexts/AuthContext';

// The first Google sign-up on the rebuilt database landed a profile with
// no name at all, because the bootstrap read first_name/last_name — the
// keys this application's own sign-up writes — and Google had sent
// `name: "Hans Ade"`. A nameless profile is not just cosmetic: the
// oversight-standing guard checks that an email belongs to an account and
// does not check the name, so a profile with nothing on record will
// accept whatever name is typed against it.

describe('deriveNames', () => {
  it('takes this application\'s own sign-up keys first', () => {
    expect(deriveNames({
      first_name: 'Ekosse', last_name: 'Mofoke',
      name: 'Someone Else',
    })).toEqual({ firstName: 'Ekosse', lastName: 'Mofoke' });
  });

  it('reads the keys Google actually sends', () => {
    expect(deriveNames({ given_name: 'Hans', family_name: 'Ade' }))
      .toEqual({ firstName: 'Hans', lastName: 'Ade' });
  });

  it('splits a single full name, which is the case that was failing', () => {
    expect(deriveNames({ name: 'Hans Ade' }))
      .toEqual({ firstName: 'Hans', lastName: 'Ade' });
    expect(deriveNames({ full_name: 'Hans Ade' }))
      .toEqual({ firstName: 'Hans', lastName: 'Ade' });
  });

  it('keeps a multi-part surname whole rather than dropping it', () => {
    expect(deriveNames({ name: 'Ada Van Der Berg' }))
      .toEqual({ firstName: 'Ada', lastName: 'Van Der Berg' });
  });

  it('records a mononym rather than nothing', () => {
    expect(deriveNames({ name: 'Prince' }))
      .toEqual({ firstName: 'Prince', lastName: '' });
  });

  it('tolerates whitespace and odd spacing', () => {
    expect(deriveNames({ name: '  Hans   Ade  ' }))
      .toEqual({ firstName: 'Hans', lastName: 'Ade' });
    expect(deriveNames({ first_name: '   ', name: 'Hans Ade' }))
      .toEqual({ firstName: 'Hans', lastName: 'Ade' });
  });

  it('returns empty only when the provider really sent nothing', () => {
    expect(deriveNames({})).toEqual({ firstName: '', lastName: '' });
    expect(deriveNames({ email: 'a@b.com', picture: 'https://x' }))
      .toEqual({ firstName: '', lastName: '' });
  });

  it('ignores non-string values instead of throwing', () => {
    expect(deriveNames({ first_name: 42, name: 'Hans Ade' }))
      .toEqual({ firstName: 'Hans', lastName: 'Ade' });
    expect(deriveNames({ name: null })).toEqual({ firstName: '', lastName: '' });
  });
});
