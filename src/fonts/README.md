# Application fonts

- `plus-jakarta-sans-latin-wght-normal.woff2`: existing local variable font; license in `OFL.txt`.
- `dm-sans-latin-wght-normal.woff2`: Latin variable normal font from
  `@fontsource-variable/dm-sans@5.3.0`, `files/dm-sans-latin-wght-normal.woff2`;
  license preserved in `DM-Sans-OFL.txt`.

The Fontsource archive was used only to obtain the licensed asset; no package was
added to dependencies. Both fonts are served locally via `next/font/local`, with
weights 400–800 available for the interface. The brand wordmark and tagline retain
self-hosted Outfit SemiBold and Arial, respectively.

Outfit: latin variable WOFF2 (100–900), 32,292 bytes, downloaded from
https://cdn.jsdelivr.net/fontsource/fonts/outfit:vf@latest/latin-wght-normal.woff2.
License: Outfit-OFL.txt, from google/fonts ofl/outfit (SIL OFL).
Only the brand wordmark uses Outfit; no runtime font request is added.
