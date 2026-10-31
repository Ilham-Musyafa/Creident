# Desktop Settings shortcut removal QA

Before/after production captures: 390/1280/2560px × Seller/Buyer/Reviewer × light/dark (18 views per stage).

- All six 390px before/after image pairs match byte-for-byte.
- All four Settings sections retain identical content, IDs and bounding boxes at every size/role/theme.
- The desktop sidebar retains exactly the Demo workspace card. Its sticky position remains correct when scrolling, and /menu#transparency still resolves.
- No removed navigation remains, horizontal overflow or browser console errors/warnings.
- Source scan for the removed heading and aria-label returns no matches in src/.

Checks: typecheck, 625 tests / 57 files and production build passed. No tests needed changing. Only the desktop navigation block and its unused constant were removed; no style or mobile changes were needed.
