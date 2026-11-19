# Colour-only update — 20 November 2026

Original stylesheet: `styles.before-colour-update-2026-11-20.css`. This is a byte-for-byte backup made before applying the developer palette.

Only hexadecimal colour values changed. Fonts, dimensions, spacing, border widths, shadow geometry, responsive rules and the S.No. fix are preserved.

## Restore

From the repository root in PowerShell:

```powershell
Copy-Item -LiteralPath backups/styles.before-colour-update-2026-11-20.css -Destination client/styles.css
npm run build
```

Restore the old body-colour expectation in `tests/browser/visual-parity.spec.js` to `rgb(37, 59, 67)` as well, then redeploy to change the live site.

## Colour comparison

| Previous | Developer palette |
|---|---|
| `#f5f7f4` | `#F7F8FA` |
| `#253b43` | `#1C2B40` |
| `#1767cf` | `#E8930A` |
| `#eaf0f8` | `#EEF1F5` |
| `#174a87` | `#1C2B40` |
| `#53637a` | `#6B7A8F` |
| `#dfe8e4` | `#DDE3EB` |
| `#f4f6fa` | `#F7F8FA` |
| `#526e75` | `#8A98A8` |
| `#254b3610` | `#1C2B4010` |
| `#315f68` | `#E8930A` |
| `#e9f1ef` | `#EEF1F5` |
| `#2b5556` | `#1C2B40` |
| `#fcfdfb` | `#FFFFFF` |
| `#29413e` | `#1C2B40` |
| `#446b68` | `#E8930A` |
| `#e0ece7` | `#FFF6E8` |
| `#234740` | `#1C2B40` |
| `#eaf3ee` | `#EEF1F5` |
| `#f0f5f2` | `#F7F8FA` |
| `#cdded7` | `#DDE3EB` |
| `#16372b66` | `#1C2B4066` |
| `#aac5d2` | `#C8D3DE` |
| `#eaf4f8` | `#EEF1F5` |
| `#244c60` | `#1C2B40` |
| `#dcecf3` | `#E2E7EF` |
| `#dff0e9` | `#FFF6E8` |
| `#9ac9b8` | `#E8930A` |
| `#245847` | `#1C2B40` |
