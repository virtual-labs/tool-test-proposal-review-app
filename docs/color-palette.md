# Virtual Labs Proposal Review — Colour Palette

Current palette reference · Restored and verified against the saved stylesheet on 20 November 2026.

The original palette has been restored. The developer orange/navy palette is no longer applied in the source stylesheet. The original backup remains available in [backups](../backups/README.md).

The interface uses deep teal actions, dark blue-grey text, soft green surfaces and pastel dashboard cards. Source: [client/styles.css](../client/styles.css). This reference describes stylesheet declarations after overrides, not sampled pixels from the deployed site. Logo/image colours and browser-default link colours are excluded.

## Core palette

| Usage | Colour | Hex |
|---|---|---|
| Primary buttons and styled action links | Deep teal | `#315F68` |
| Primary text and headings | Dark blue-grey | `#253B43` |
| Secondary text | Slate grey | `#53637A` |
| Page background | Soft off-white | `#F5F7F4` |
| Cards and form fields | White | `#FFFFFF` |
| Login panel and dialogs | Warm off-white | `#FCFDFB` |
| Secondary button background | Pale grey-green | `#E9F1EF` |
| Secondary button text | Dark teal | `#2B5556` |
| Table header background | Pale green | `#F0F5F2` |
| Proposal detail panel | Light green | `#EAF3EE` |
| Card / rank-summary border | Light grey-green | `#DFE8E4` |
| Table dividers | Light blue-grey | `#DDE3EB` |
| Form-field border | Blue-grey | `#AEB9C8` |
| Dialog border | Grey-green | `#CDDED7` |

## Dashboard cards and navigation

| Usage | Hex |
|---|---|
| Reviewed / Selected card background | `#DEEEE2` |
| Draft / Ranked card background | `#F7E8DC` |
| Pending / Unranked card background | `#F7DFDF` |
| Card label, count and supporting text | `#29413E` |
| Active card border | `#446B68` |
| Current navigation background (`aria-current="page"`) | `#DFF0E9` |
| Current navigation text | `#245847` |
| Current navigation border colour declaration | `#9AC9B8` |

Card colour classes are presentation styles: components can explicitly override the category colour. For example, ranking-monitor cards explicitly use mint for Ranked Proposals. Navigation declares a border colour, but a visible border also requires a border width/style; the base buttons use `border: 0`.

## Feedback and interaction

| Usage | Background | Text / accent |
|---|---|---|
| Error message | `#FCE8E6` | `#971B13` |
| Information notice | `#EAF2FD` | `#214D80` |
| Success style | `#E6F4EA` | `#176335` |
| Refresh button | `#EAF4F8` | `#244C60` |
| Refresh hover | `#DCECF3` | — |
| Keyboard focus outline | — | `#91BCF1` |
| Loading indicator text | — | `#45617A` |
| Loading spinner track | — | `#C7D8ED` |
| Loading spinner accent | — | `#1767CF` |
| Ranking guideline button-name emphasis | — | `#B42318` |
| Ranking guideline emphasis | — | `#175CD3` |

Refresh button border: `#AAC5D2`. The stylesheet also defines eyebrow text as `#526E75`.

## Shadows, transparency and disabled states

| Effect | CSS value | Meaning |
|---|---|---|
| Card shadow | `0 4px 20px #254B3610` | Dark green with approximately 6.3% opacity |
| Dialog backdrop | `#16372B66` | Dark green with 40% opacity |
| Disabled button | `opacity: 0.55` | Entire button is faded; there is no separate disabled hex colour |
| Sort-heading button background | `transparent` | Inherits the surrounding table-header appearance |

Eight-digit hex notation is `#RRGGBBAA`; the final two digits represent alpha.

## Copyable CSS variables

These are suggested names for sharing or reusing the palette. They are not currently defined as variables in the application stylesheet; the application uses literal colour values.

```css
:root {
  --color-primary: #315F68;
  --color-on-primary: #FFFFFF;
  --color-text: #253B43;
  --color-text-muted: #53637A;
  --color-page: #F5F7F4;
  --color-surface: #FFFFFF;
  --color-surface-warm: #FCFDFB;
  --color-secondary: #E9F1EF;
  --color-on-secondary: #2B5556;
  --color-table-header: #F0F5F2;
  --color-proposal-panel: #EAF3EE;
  --color-border: #DFE8E4;
  --color-divider: #DDE3EB;
  --color-input-border: #AEB9C8;
  --color-dialog-border: #CDDED7;

  --color-card-mint: #DEEEE2;
  --color-card-peach: #F7E8DC;
  --color-card-pink: #F7DFDF;
  --color-card-text: #29413E;
  --color-card-active-border: #446B68;
  --color-nav-active: #DFF0E9;
  --color-nav-active-text: #245847;

  --color-error-bg: #FCE8E6;
  --color-error-text: #971B13;
  --color-info-bg: #EAF2FD;
  --color-info-text: #214D80;
  --color-success-bg: #E6F4EA;
  --color-success-text: #176335;
  --color-focus: #91BCF1;
  --color-refresh-bg: #EAF4F8;
  --color-refresh-text: #244C60;
  --color-refresh-hover: #DCECF3;
  --color-refresh-border: #AAC5D2;

  --shadow-card: 0 4px 20px #254B3610;
  --color-backdrop: #16372B66;
}
```

## Implementation notes

- Use white text on primary teal actions. Secondary controls use pale grey-green with dark teal text. Table action buttons and download-toolbar buttons have more specific rules that use the primary teal treatment, even when a secondary class is present.
- Use the pastel card fills with dark card text; the active state is indicated by the darker border as well as the selected control state.
- Preserve the visible keyboard focus outline.
- Typography is **Arial, sans-serif**, with a base size of **16px** and line-height **1.5**.
- Earlier rules in the file contain superseded colours: primary blue `#1767CF`, secondary `#EAF0F8` / `#174A87`, and table-header `#F4F6FA`. Later rules establish the current teal/green palette. Blue `#1767CF` remains in the loading spinner.
- An older `aria-selected="true"` tab rule defines `#E0ECE7` / `#234740`; current navigation uses the `aria-current="page"` colours listed above.
- Keep this reference aligned with stylesheet changes. No application styles were changed to create this document.
