# Package copy

A working copy of the T3A-DEV-DAY1-001 v1.3 package so CI can re-run its checks: the dictionary JSON, the governing instruction, `tools/`, `reference/`, `test/`, `tests/`, `package_manifest.json` and `sha256sums.txt`.

Not copied (human-format duplicates of files that are here, or replaced by our own filled version): the three `.docx` files, `T3A-DEV-DAY1-001_Field_Dictionary_v1.3.md`, and `mapping/` (the filled mapping is `../reconciliation-mapping.csv`). `sha256sum -c sha256sums.txt` therefore reports those five as unreadable and reports no content mismatch for any file present.

Classification in the package: trade secret, founder and developer only. Keep this repository private.
