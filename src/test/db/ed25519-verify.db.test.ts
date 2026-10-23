/** Ed25519 verification in the database (the check behind CR-29's key pair seal): RFC 8032 vectors, signatures made by OpenSSL through Node, and every kind of damage refused. Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateKeyPairSync, sign as nodeSign, randomBytes, type KeyObject } from "node:crypto";
import type pg from "pg";
import { connect, run } from "./helpers";

let c: pg.Client;
beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

const hex = (b: Buffer | Uint8Array) => Buffer.from(b).toString("hex");
const verify = async (pub: string, msg: string, sig: string) => (await run(c, `select t3a_ed25519_verify(decode('${pub}','hex'), decode('${msg}','hex'), decode('${sig}','hex')) v`))[0].v as boolean;
const rawPub = (k: KeyObject) => Buffer.from((k.export({ format: "jwk" }) as { x: string }).x, "base64url");
const flip = (h: string, i: number) => h.slice(0, i) + ((parseInt(h[i], 16) ^ 1).toString(16)) + h.slice(i + 1);

describe("Ed25519 verification", () => {
  it("accepts the RFC 8032 test vectors 1 and 2", async () => {
    expect(await verify("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a", "",
      "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b")).toBe(true);
    expect(await verify("3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c", "72",
      "92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00")).toBe(true);
  });

  it("accepts signatures made by OpenSSL for random keys and messages of several lengths", async () => {
    for (const n of [0, 1, 31, 64, 200, 1500]) {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const msg = randomBytes(n);
      const sig = nodeSign(null, msg, privateKey);
      expect(await verify(hex(rawPub(publicKey)), hex(msg), hex(sig)), `length ${n}`).toBe(true);
    }
  });

  it("refuses a changed message, a changed signature (either half), another key, and malformed input", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const other = generateKeyPairSync("ed25519").publicKey;
    const msg = randomBytes(40); const pub = hex(rawPub(publicKey)); const sig = hex(nodeSign(null, msg, privateKey));
    expect(await verify(pub, hex(msg), sig)).toBe(true);
    expect(await verify(pub, hex(Buffer.concat([msg, Buffer.from([0])])), sig)).toBe(false);
    expect(await verify(pub, flip(hex(msg), 0), sig)).toBe(false);
    expect(await verify(pub, hex(msg), flip(sig, 4))).toBe(false);          // first half (R)
    expect(await verify(pub, hex(msg), flip(sig, 100))).toBe(false);        // second half (S)
    expect(await verify(hex(rawPub(other)), hex(msg), sig)).toBe(false);
    expect(await verify(pub, hex(msg), sig.slice(0, 126))).toBe(false);     // 63 bytes
    expect(await verify(pub.slice(0, 62), hex(msg), sig)).toBe(false);      // 31 bytes
    expect(await verify("00".repeat(32), hex(msg), sig)).toBe(false);
    // S not below the group order is refused (malleability): S + L
    const L = 7237005577332262213973186563042994240857116359379907606001950938285454250989n;
    const sBytes = Buffer.from(sig.slice(64), "hex"); const s = BigInt("0x" + Buffer.from(sBytes).reverse().toString("hex"));
    const big = Buffer.from((s + L).toString(16).padStart(64, "0"), "hex").reverse();
    if (s + L < 2n ** 256n) expect(await verify(pub, hex(msg), sig.slice(0, 64) + hex(big))).toBe(false);
  });

  it("cannot be called by a signed-in participant except through the verify function, and cannot sign", async () => {
    const r = await run(c, `select has_function_privilege('authenticated','t3a_ed25519_mul(numeric,numeric[])','execute') m, has_function_privilege('anon','t3a_ed25519_verify(bytea,bytea,bytea)','execute') a, has_function_privilege('authenticated','t3a_ed25519_verify(bytea,bytea,bytea)','execute') v`);
    expect(r[0]).toEqual({ m: false, a: false, v: true });
    expect((await run(c, `select count(*)::int n from pg_proc where proname ~ '^t3a_ed25519_' and proname ~ 'sign$'`))[0].n).toBe(0);
  });
});
