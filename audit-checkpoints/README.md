# Published audit checkpoints

Only public material belongs here: the Ed25519 public key and signed checkpoint JSON.
The initial public key is a bootstrap key whose private half was discarded; before
creating the first checkpoint, run `npm run checkpoint -- --generate-key` locally.
It replaces the bootstrap public key while no checkpoint JSON exists. Put the printed
private PEM in `.env` only, as a quoted multiline `AUDIT_SIGNING_KEY` value. Never
redirect key-generation output into a file or share a terminal transcript containing it.

Commit `public-key.pem` and the timestamped JSON files, then publish them outside the
database. Anyone verifying them must retain a trusted copy of the public key and
checkpoint. Key generation refuses to rotate a key once JSON checkpoints exist;
preserve the old key/checkpoints and plan explicit key rotation separately.
