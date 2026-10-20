#!/usr/bin/env python3
"""Verify an Ed25519 detached signature over a manifest file (acceptance test DT-41).
Usage: python3 tools/verify_manifest.py <manifest.json> <signature.b64> <public_key.pem>
The test key pair in test/keys is SYNTHETIC AND TEST ONLY. Production manifests verify only
against the production public key held read only in the repository; where that key is absent,
production manifest loading refuses and every unrelated build step continues.
Exit 0 when the signature verifies, 1 otherwise. Uses the cryptography package, or the openssl command as fallback."""
import base64, os, subprocess, sys, tempfile

def verify(manifest, sig_b64, pub):
    data = open(manifest, "rb").read()
    sig = base64.b64decode(open(sig_b64, "rb").read().strip(), validate=True)
    if len(sig) != 64: raise ValueError("Ed25519 signatures are 64 bytes")
    try:
        from cryptography.hazmat.primitives.serialization import load_pem_public_key
        from cryptography.exceptions import InvalidSignature
        key = load_pem_public_key(open(pub, "rb").read())
        try: key.verify(sig, data); return True
        except InvalidSignature: return False
    except ImportError:
        with tempfile.NamedTemporaryFile(delete=False) as s: s.write(sig); sp = s.name
        r = subprocess.run(["openssl","pkeyutl","-verify","-pubin","-inkey",pub,"-rawin","-in",manifest,"-sigfile",sp], capture_output=True)
        os.unlink(sp); return r.returncode == 0

def main(a):
    if len(a) != 4: print(__doc__); return 2
    for p in a[1:]:
        if not os.path.exists(p): print(f"REFUSED missing file: {p}"); print("RESULT REFUSED"); return 1
    try: ok = verify(a[1], a[2], a[3])
    except Exception as x:
        print(f"REFUSED malformed signature, key or manifest ({type(x).__name__})"); print("RESULT REFUSED"); return 1
    print("RESULT", "VERIFIED" if ok else "REFUSED (signature does not match)")
    return 0 if ok else 1

if __name__ == "__main__": sys.exit(main(sys.argv))
