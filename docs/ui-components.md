# UI Components

What the frontend is built from: the stylesheets that hold the LCARS look, the
class vocabulary a template reaches for, and the shared Angular components that
wrap the shapes too fiddly to hand-write twice.

Two rules run through all of it:

- **A feature does not define its own buttons or fields.** A button is
  `.lcars-btn` with a colour class, a text field is `.lcars-input-container`, a
  chooser is `.lcars-select-container`, a switch is `<app-lcars-toggle>`. What a
  feature's own stylesheet holds is layout — where those controls sit and how
  far apart — plus the shapes the rest of the site has no equivalent for.
- **A colour says what kind of thing something is, not what state it is in**, so
  it means the same on every page.

---

## Where styles live

| Layer | Location | What belongs there |
|---|---|---|
| Vendored LCARS theme | `src/styles/lcars-theme.scss` | The frame, bars, panels, footer, headings, base `button`/`a` styling. Adapted from thelcars.com; edit sparingly. |
| LCARS colour classes | `src/styles/lcars-theme-colours.scss` | `.<name>` (background) and `.go-<name>` (text) for the full LCARS palette. |
| Angular Material base | `src/styles/angular-mat-base.scss` | Material's generated theme. Overrides for it sit at the top of `lcars-theme.scss`. |
| App globals | `src/styles/styles.scss` | Forms, buttons, list-page patterns, badges, utilities — anything more than one feature uses. |
| Shared SCSS API | `src/styles/_lcars-variables.scss`, `_lcars-mixins.scss`, `_lcars-tabs.scss`, `_registry-layout.scss`, `_news-colours.scss`, `_notification-card.scss`, `_sto-rarity-colours.scss`, `_lcars-palette-properties.scss` | Variables and mixins. No output of their own except where noted. |
| Feature partials | `src/styles/_storytime.scss`, `_custom-tracking.scss`, `_help.scss` | One partial per feature whose pages are built from the same handful of shapes. Every rule scoped by the feature's class prefix (`storytime-`, `custom-tracking-`, `help-`). |
| Component SCSS | `<component>/<component>.component.scss` | Everything else — one component's own layout. |

Global stylesheets load in the order set by `angular.json`:
`font-faces` → `angular-mat-base` → `lcars-theme` → `lcars-theme-colours` →
`styles.scss`. Inside `styles.scss` the feature partials are `@use`d at the
top, so **`styles.scss`'s own rules win a specificity tie against a feature
partial**. Put a global override in `styles.scss` proper, not in a partial.

`stylePreprocessorOptions.includePaths` is set to `src/styles`, so a component
stylesheet imports by name and never by relative path:

```scss
@use 'lcars-variables' as vars;
@use 'lcars-mixins' as mixins;
@use 'lcars-tabs' as tabs;
```

---

## Colour

### The SCSS palette

`_lcars-variables.scss` is the single place any LCARS colour is written down:
`$lcars-sunflower`, `$lcars-perano`, `$lcars-bluey`, `$lcars-orange`,
`$lcars-green`, `$lcars-violet`, `$lcars-cardinal`, `$lcars-cool`, `$lcars-gold`,
`$lcars-tangerine`, `$lcars-red`, `$lcars-sky`, plus `$lcars-c47` / `$lcars-c48`.

It also holds the structural colours (`$lcars-black`, `$lcars-white`,
`$lcars-grey-bg`, `$lcars-grey-border`, `$lcars-grey-light`), the raised-surface
set used by cards and list rows (`$lcars-card-surface`,
`$lcars-card-surface-hover`, `$lcars-card-border` — deliberately stronger than
`$lcars-grey-bg`, which is too faint once a card carries controls of its own),
the career and faction colours, the STO item-rarity colours, and
`$font-antonio`.

### Colour classes in templates

`lcars-theme-colours.scss` emits, for every LCARS colour name:

- `.<name>` — background colour (e.g. `class="lcars-btn sunflower"`)
- `.go-<name>` — text colour (e.g. `class="go-mars"`)
- `.oc-<name>::before` — background on the element's `::before`

Both are `!important`, which is what lets a single class recolour a button, a
select container or a bar without a component rule.

The colour-variant classes on `.lcars-btn`, `.lcars-input-container`,
`.lcars-select-container` and `<app-stat-info-card>` take the same names, so
`sunflower` means the same thing wherever it is written.

### Colour at runtime

`_lcars-palette-properties.scss` publishes the *content* subset of the palette
as CSS custom properties (`--lcars-sunflower`, `--lcars-green`, …). Custom
Tracking colour fields store a token such as `LCARS_SUNFLOWER` rather than a
hexadecimal, and these properties are what resolve one in the browser — so
adjusting the palette adjusts every value already recorded against it, and the
backend never serves a colour of its own.

Structural colours are deliberately absent from that map: offering them as
content colours would let a user make their own content invisible.

### Rarity

`_sto-rarity-colours.scss` emits `--sto-rarity-<slug>` properties plus two
helpers per slug (`common`, `uncommon`, `rare`, `very-rare`, `ultra-rare`,
`epic`):

- `.rarity-<slug>` — exposes `--sto-rarity-color` to the element and its
  descendants, to consume against any property.
- `.go-rarity-<slug>` — colours text directly, matching the `.go-*` convention.

---

## Element vocabulary

### Bars and section headings

| Class | What it is |
|---|---|
| `.lcars-text-bar` | The standard section heading: a bar with rounded end caps, carrying its title in a black cut-out `<span>`. |
| `.lcars-text-bar.small-lcars-bar-gap` | Same bar with a tighter top margin, for bars stacked one under another. |
| `.lcars-text-bar .cta-icon` | A single action pinned to the bar's right-hand end, on its own black cut-out. |
| `.lcars-text-bar .lcars-bar-actions` | A group of actions at that end — reorder arrows, edit, delete, collapse — on the same cut-out, so a bar with one action and a bar with five read as the same shape. |
| `.lcars-text-bar .title-with-badge` + `.header-count-badge` | Heading with a count pill, e.g. "Captain List (3)". One or two digits keep the round badge; three or more grow it sideways into a pill. |
| `.lcars-bar` + `.lcars-bar-inner` | The plain divider bar. Closes the alert-message components. |
| `.lcars-bar-slice-top` / `.lcars-bar-cutout` / `.lcars-bar-slice-bottom` | Decorative slices from the vendored theme. |
| `.the-end` | Pushes bar content to the right-hand end. |

Prefer `<app-collapsible-section>` over hand-writing a bar plus a caret — it
owns the ARIA wiring.

### Buttons

| Class | What it is |
|---|---|
| `.lcars-btn` (+ a colour class) | The standard pill. 60px tall, fully rounded, uppercase, label bottom-right. Works on `<button>` and `<a>` alike — the rule restates weight and tracking so both look identical. |
| `.lcars-btn-auto` | The same pill sized to its own label rather than a fixed 150px minimum. Named as `button.lcars-btn-auto` too, so it outranks the base rule and keeps its wide left gutter. |
| `.full-width-btn-link` | Full-width pill for a sidebar stack; used for both links (navigation) and buttons (actions). |
| `.buttons` | The sidebar stack itself — a column of `.full-width-btn-link`s. `.buttons.filter-buttons` adds the `.filter-btn` / `.filter-btn.active` treatment. |
| `.buttons-row` | An inline, wrapping, centred row of pill links. Also handles the case where the row is a `<nav>`, which the LCARS frame would otherwise cap at the sidebar's width. |
| `.buttons-container` | Right-aligned row for a form's actions. |
| `.submit-button` | A `.lcars-btn` with form-action margins. |
| `.submitting` | Animated progress stripe on a button while its request is in flight. Applies while disabled too. |
| `.cta-icon` | A bare icon control. Perano, going sunflower on hover, scaling slightly. Resets every global `button` style when it is on a `<button>`, and dims to 35% with no hover growth when disabled. |
| `.cta-icon.delete-icon` | Same, but red on hover. |
| `.lcars-pagination` | Previous/next pager beneath a list. |

The left padding on every pill (25px, or 65px on `.lcars-btn-auto`) matches the
pill's own radius: labels are right-aligned, so without it a long label runs out
through the rounded edge.

### Fields

**`.lcars-input-container`** — the standard text field. A coloured label block
above a dark input body, closed with a coloured bottom border:

```html
<div class="lcars-input-container sunflower">
  <label for="handle">Handle</label>
  <input id="handle" type="text" formControlName="handle" />
  @if (form.controls.handle.touched && form.controls.handle.invalid) {
    <div class="field-error">Handle is required</div>
  }
</div>
```

The colour variant sets `--lci-color`; the label background and the bottom
border both read it. Handles `input`, `textarea`, number inputs (spinners
removed) and date inputs (dark colour scheme, gold accent). A `.field-error` as
the last child rounds off the bottom corners.

**`.lcars-select-container`** — the standard chooser. A fully rounded coloured
block holding a `.select-label` and a native `<select>` with a custom SVG arrow;
the same colour variants apply.

**`.field-picker`** — a field whose value is chosen in a dialog rather than
typed (a recipient, a featured work). It sits inside a `.lcars-input-container`
where an input would and reads as one. It shows the *name* of the thing chosen;
the identifier stays in the form and out of sight. `.field-picker__btn` keeps
its label on one line.

**`.filter-section`** — the compact filter block in a sidebar:
`.filter-input`, `.filter-select`, `.clear-filters-btn`. Smaller and squarer
than the main field styles on purpose.

**Bare form scaffolding** — `.form-container`, `.form`, `.form-group` and the
plain `input` rule in `styles.scss` are the pre-LCARS fallback still used by the
auth pages. New forms should use `.lcars-input-container` instead.

> **Not global:** `.form-row`, `.field-hint` and `.compact` are re-declared per
> feature (seven and three places respectively). They are a convention, not a
> shared rule — copy the neighbouring feature's definition rather than assuming
> one exists.

### Tabs

`@include tabs.lcars-tab-strip($min-width: 140px)` emits the whole strip:
`.lcars-tabs`, `.lcars-tab`, `.lcars-tab.active`, `.lcars-tabs-filler`, the rule
that closes it, and the wrapping behaviour. It works for `button` tabs (panels
swapped in place) and `a` tabs (each section its own route), and never scrolls
sideways — a strip that will not fit grows another row, because a tab hidden
behind an edge is a section nobody knows is there. Mark the current tab
`active`.

Used by the character detail page, the community tabs, the Storytime policy
header and story detail, the Storytime Markdown field, and Custom Tracking.

A strip does not have to switch whole sections: `app-storytime-markdown-field`
uses one to put Edit and Preview over a single textarea, which is the smallest
thing the mixin is worth reaching for. Keep the hidden panel in the page
(`[hidden]`) rather than removing it when it holds something a person is part way
through — a textarea taken out of the page loses its caret, its scroll position
and every undo step behind it.

### Cards and panels

| Mixin | Shape |
|---|---|
| `mixins.lcars-card` | The base raised surface: faint background, hairline border, 10px radius, inset highlights, and a 2px lift on hover. |
| `mixins.lcars-panel-card($colour)` | The panel card — a coloured spine down the left and a tinted gradient body. |
| `mixins.lcars-panel-card-heading($colour)` | The solid block across its top. |
| `mixins.lcars-panel-card-name` | The name on that block: Antonio, uppercase, black, ellipsised so a long title shortens rather than growing the bar. |
| `mixins.lcars-panel-card-body` | What sits under the name. |
| `mixins.lcars-panel-card-main` | Body and controls side by side. |
| `mixins.lcars-panel-card-controls` | Controls in their own darkened strip at the end of the row, so pressing one is never mistaken for opening the thing the panel is about. |
| `mixins.lcars-panel-card-marks` / `-badge` | What the bar says besides the name, at its right-hand end. |
| `mixins.lcars-panel-surface` | The surface a block of a feature sits on, beneath its heading bar. |

The panel-card family is shared deliberately: a captain card on the dashboard, a
panel in Storytime and a field in the Custom Tracking builder are all the same
shape, learned once.

`_notification-card.scss` holds the notification anatomy — a severity-tinted
left edge and a matching header bar — shared by the user inbox, the admin sent
list, banners, and (via `news.news-category-tint()`) the news card and the news
admin list. `_news-colours.scss` is the single source of truth for the news
category accents.

`mixins.lcars-icon-button($base, $hover)`, `mixins.lcars-label`,
`mixins.lcars-value`, `mixins.lcars-info-grid($cols)` and `mixins.lcars-badge`
cover the smaller pieces.

### Lists and page layout

| Class / mixin | What it is |
|---|---|
| `.accounts-grid` | Vertical card list (STO accounts). |
| `.characters-grid` | Single-column card grid (captains). |
| `.member-card-grid` | Responsive card grid; cards stretch so a row is uniform height whatever mix of badges and actions each carries. |
| `.info-grid` / `.info-item` (`.label`, `.value`) | The label-over-value detail grid. |
| `.lcars-empty-state` | Italic, dimmed copy for a list with no rows. |
| `.error-container` | Column wrapper for a page's error messaging. |
| `.column-container` | Narrow centred column (max 400px) with bar and button spacing. |
| `.flexbox` / `.col` / `.col.right` | The vendored theme's simple column layout. |
| `registry.registry-two-column($container, $main, $side)` | The two-column page shell shared by every registry page, matching the dashboard's account pages. Collapses at 768px. |
| `registry.registry-detail-grid` | The label/value grid for registry detail panels. One pair per row by design — these panels sit in columns of very different widths. |

### Badges and status

`.faction-badge` (`.federation` / `.klingon` / `.undecided`),
`.filter-results-badge`, `.header-count-badge`, and `mixins.lcars-badge` for
anything new.

### Utilities

| Class | Effect |
|---|---|
| `.sr-only` | Visually hidden, still read by screen readers. |
| `.lcars-flex-left` / `-center` / `-right` | `justify-content`. |
| `.lcars-self-left` / `-center` / `-right` | `align-self`. |
| `.go-center` / `.go-left` / `.go-right` | Text alignment (vendored theme). |
| `.lcars-number-highlight` | Bold sunflower readout for a number. Inherits its colour inside a stat card, where the ground is light. |
| `.privacy-blur` | Blurs personal data while Privacy Mode is on. |
| `.blink` / `.blink-slower` / `.blink-faster` | Attention animations; the alert-message components expose this as `blinkMessage`. |
| `.uppercase`, `.strike`, `.nomar`, `.border`, `.indent` | Vendored theme text helpers. |
| `i.ext-link` | External-link icon spacing. |
| `ul.no-bullets` | Unbulleted list. |

---

## Shared components

Standalone Angular components in `src/app/shared/components/` (plus
`src/app/shared/alert-panel/`). Counts below are template usages at time of
writing, as a guide to how load-bearing each one is.

### Status and feedback

| Component | Inputs | Notes |
|---|---|---|
| `<app-lcars-error-message>` (73) | `title` (`'Red Alert'`), `message`, `blinkMessage` | Bar + body + closing bar. Title in `go-mars`. The default error surface everywhere. |
| `<app-lcars-success-message>` (11) | `title`, `message`, `blinkMessage` | Title in `go-c60` (green). |
| `<app-lcars-warning-message>` (5) | `title` (`'Yellow Alert'`), `message`, `blinkMessage` | Title in `go-october-sunset`. **Renders `message` as HTML** (`innerHTML`), unlike the other three — never pass unsanitised user input. |
| `<app-lcars-information-message>` (6) | `title`, `message`, `blinkMessage` | Neutral bar colour. |
| `<app-loading-bar>` (72) | `loadingText` (`'Loading'`) | Starfleet emblem plus an animated text bar. The standard in-flight state. |
| `<app-alert-panel>` (1) | `state` (`'red' \| 'yellow' \| 'green' \| 'blue' \| 'grey'`), `title`, `subtitle`, `ariaLive`, `ariaLabel` | The full-width bridge alert panel. Sized entirely in container-query units, so it scales with its container rather than the viewport. `AlertPanelShowcaseComponent` renders all five states side by side. Currently used only by the service-interruption page. |

### Layout

**`<app-collapsible-section>`** (6) — an LCARS heading bar and the content
beneath it, which the reader can fold away.

| Input | Type | Notes |
|---|---|---|
| `heading` | `string` (required) | Shown in the bar. |
| `barClass` | `string` | Classes for the bar itself — `small-lcars-bar-gap` where sections stack. |

Sections open expanded: a reader arriving at a page wants to read it, not open
it first. The component owns the caret button, the icon swap and the
`aria-expanded` / `aria-controls` pairing, which is why this is a component
rather than repeated markup.

### Cards

Each card takes a view model the calling page builds, so the card itself knows
nothing about where the data came from, and each reports which action was
pressed rather than performing it — confirmation, reloading and error handling
stay on the page.

| Component | Input | Output | Shared by |
|---|---|---|---|
| `<app-account-card>` (2) | `vm: AccountCardVm`, `privacyMode` | `action: string` | Dashboard account list and the public registry. |
| `<app-character-card>` (2) | `vm: CharacterCardVm` | `action: string` | Account detail page and the registry. Owns its broken-image fallback. |
| `<app-member-card>` (2) | `vm: MemberCardVm`, `isActing` | `action: string` | Registry listings and the friends list. |
| `<app-news-card>` (2) | `post: NewsPost` | — | Public news feed. Category-tinted via `news-category-tint()`. |

The view-model interfaces (`account-card.model.ts`, `character-card.model.ts`,
`member-card.model.ts`) are the contract — `actions` is empty for read-only
contexts such as the registry, which is the whole mechanism by which one card
serves both an owner and a visitor.

An `AccountCardAction` may set `active` when it toggles rather than fires once,
as the account pin does. The card then adds `.cta-icon--active` and sets
`aria-pressed`, so the state is conveyed by more than colour. Leave `active`
unset for a one-shot action: no `aria-pressed` attribute is rendered at all,
rather than a misleading `false`.

### Sorting and filtering an account list

Two pages list STO accounts — the owner's dashboard and a member's public
registry profile — and both offer the same side-column Filters and Sort panels,
shown only once the list holds more than one account. The rules live in
`shared/utils/account-list.utils.ts`: each page projects its own model onto the
neutral `AccountSortFields` and `AccountFilterFields` shapes, then shares
`matchesAccountFilters`, `sortAccounts`, `countActiveAccountFilters`,
`buildAccountSearchHaystack` and `buildAccountFilterOptions`.

Where the ordering happens differs, and deliberately so:

| Page | Ordering | Filtering | Why |
|---|---|---|---|
| Dashboard accounts | API (`sortBy` / `sortOrder` query parameters) | Client | The accounts are their own request, so the API can order them without refetching anything else. |
| Registry profile | Client | Client | The accounts arrive embedded in the profile payload, so ordering them server-side would mean refetching the whole public profile to move a few cards. |

The registry offers a reduced set of controls, because it is told less: no
ordering by endeavour nodes and no pinned-only filter, since neither endeavour
progress nor an owner's pins are ever published. Its platform and launcher
options are derived from the names present on the accounts on show, as it has no
lookup table to draw on.

**`<app-stat-info-card>`** (2) — a split stat tile: label and value on the left,
a large watermark icon bleeding off the bottom-right, optional CTA link along
the bottom.

| Input | Type | Notes |
|---|---|---|
| `label` | `string` | |
| `value` | `string \| number` | Rendered with `.lcars-number-highlight`. |
| `icon` | `string` | Font Awesome class, e.g. `fas fa-users`. |
| `color` | `string` | LCARS colour name; sets the card background. Default `sunflower`. |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | Caps the width (140/200/280/360px). Omit for fluid. |
| `ctaText`, `ctaLink` | `string`, `string \| unknown[]` | Both required for the CTA to render. |

The card body is a light LCARS colour, so its text is black — this is the one
place `.lcars-number-highlight` gives up its sunflower.

### Small display components

| Component | Inputs | Notes |
|---|---|---|
| `<app-entity-avatar>` (3) | `src`, `alt` (required), `size` (`100 \| 300`) | Profile picture with a size-matched placeholder fallback. Resets its failure flag when `src` changes. Replaces the open-coded `<img>` plus `(error)` handler pages used to repeat. |
| `<app-endeavour-rank-badge>` (3) | `totalNodes`, `size` (`'default' \| 'small'`) | Zero-padded four-digit rank readout. `small` rescales through host CSS variables rather than a second stylesheet. |
| `<app-smart-chart>` (1) | `data: ChartDataItem[]`, `threshold` (5), `mode` (`'pie' \| 'donut' \| 'bar' \| 'auto'`) | Signal inputs. Switches between an SVG pie/donut and a bar chart on the number of data points; every segment path, bar width and colour class is computed once in a `computed`. Falls back to `<app-lcars-information-message>` when there is no data. |

### Feature locks

Both render in place of a character progress tracker and always offer a way back
to the captain edit form — the values they gate are user-entered, so the lock is
never treated as final.

| Component | Inputs |
|---|---|
| `<app-lcars-level-lock>` (2) | `featureName`, `requiredLevel`, `currentLevel`, `characterHandle`, `editLink` |
| `<app-lcars-allegiance-lock>` (1) | `featureName`, `currentAllegiance`, `characterHandle`, `editLink` |

The allegiance lock exists because Diplomacy is earned Federation-side and
Marauding Klingon-side, so an "Undecided" captain cannot be shown a catalogue
that is true for them.

### Dialogs

Opened through `MatDialog` rather than placed in a template, so they have no
usage count.

**`ConfirmDialogComponent`** — the LCARS confirmation dialog. Takes
`ConfirmDialogData` (`title?`, `message`, `confirmText?`, `cancelText?`) and
closes with `true` / `false`. **Every destructive confirmation goes through
this** — news, notification and banner deletes included. Do not hand-roll a
`confirm()`.

**`LcarsSearchDialogComponent<T>`** — a paginated search-and-select dialog.
Callers supply `LcarsSearchDialogData<T>`:

| Field | Purpose |
|---|---|
| `title` | Dialog heading. |
| `searchFn(term, page)` | Returns `Observable<SearchPage<T>>`. Wraps whatever endpoint suits. |
| `resultLabel(item)` | Primary label for a row. |
| `resultSublabel?(item)` | Optional second line. |
| `resultFacts?(item)` | Short label/value facts under a result, to tell lookalike rows apart. The caller writes each value the way it should read, dates included. |
| `pageSize` | Results per page (5). |
| `privateTerm?` / `privateSublabel?` | Marks the search term or the sublabel as personal data, so Privacy Mode blurs it. |

Selecting a row closes with that item; Cancel closes with `undefined`. Pairs
with the `.field-picker` styling above.

**`RefreshSessionDialogComponent`** — the pre-expiry session warning, with a
countdown recomputed from the stored expiry each tick rather than decremented,
so it stays accurate in a throttled tab. It calls `detectChanges()` itself
because the CDK overlay it renders inside is OnPush.

---

## LCARS toggles

Three toggle components, all functionally equivalent: each wraps a boolean and
integrates with reactive forms via `ControlValueAccessor`. Choose on available
space and how much visual weight the toggle should carry.

All three extend `LcarsToggleBase` (`shared/components/lcars-toggle-base.directive.ts`),
which holds `checked`, `disabled`, the `ariaLabel` input, `toggle()`, and the
whole `ControlValueAccessor` implementation including the `markForCheck()` calls
that make it work under OnPush. A new toggle style should extend it too rather
than reimplement the accessor.

### Common API

```html
<!-- Reactive forms -->
<app-lcars-toggle-* formControlName="myBoolField"></app-lcars-toggle-*>

<!-- Template-driven -->
<app-lcars-toggle-* [(ngModel)]="myBoolValue"></app-lcars-toggle-*>
```

All three support `setDisabledState`, called automatically by Angular when the
control is disabled.

### Option A — Pill (`app-lcars-toggle-pill`)

`src/app/shared/components/lcars-toggle-pill/`

A single pill-shaped button matching the width of its label. Changes colour when
toggled. Mirrors the shape language of the `lcars-btn` navigation buttons.

| State | Background | Text |
|---|---|---|
| Off | `$lcars-cardinal` (red) | White |
| On | `$lcars-green` (green) | Black |

| Input | Type | Description |
|---|---|---|
| `label` | `string` | Button label. Renders on one line — no wrapping. |
| `ariaLabel` | `string` | Overrides the accessible label if different from `label`. |

```html
<app-lcars-toggle-pill
  formControlName="lifetimeSubscription"
  label="Lifetime Subscription"
  ariaLabel="Lifetime Subscription">
</app-lcars-toggle-pill>
```

Notes:

- Sizes to its content (`width: max-content`), so no fixed widths are needed.
- Left padding is intentionally larger than right (28px vs 22px), for the same
  reason `.lcars-btn` has a wide left gutter: the text is bottom-right aligned
  against a rounded left edge.
- The default off colour is red, which reads as "inactive/disabled" — consider
  whether that framing fits your field before using this component.
- **No current usages.** Kept as a documented option.

### Option B — Delta indicator (`app-lcars-toggle`)

`src/app/shared/components/lcars-toggle/`

A compact inline toggle: a Star Trek delta insignia acting as a status
indicator, with the label immediately to its right, the whole thing one button.
Takes the least horizontal space of the three, and is the toggle the app
actually uses (14 usages — Storytime, Custom Tracking, the dashboard forms).

| State | Delta icon | Label text |
|---|---|---|
| Off | Dim white (15% opacity) | Dim white (30% opacity) |
| On | `$lcars-green` with glow | Bright white (80% opacity) |

| Input | Type | Description |
|---|---|---|
| `label` | `string` | Label text displayed next to the icon. |
| `ariaLabel` | `string` | Overrides the accessible label if needed. |

```html
<app-lcars-toggle
  formControlName="publiclyVisible"
  label="Publicly Visible"
  ariaLabel="Publicly Visible">
</app-lcars-toggle>
```

Notes:

- Requires the **Font Awesome Kit**: the delta uses the custom kit class
  `fa-kit fa-star-trek-delta`. The kit is subsetted, so verify any icon change
  against the running app — an unlisted icon renders as nothing at all while the
  component keeps working.
- The glow is a CSS `drop-shadow` filter on the `<i>`, not a `box-shadow`.
  `box-shadow` does not follow the icon's shape; `drop-shadow` does.
- Label uses `white-space: nowrap`.

### Option C — Selector pair (`app-lcars-toggle-selector`)

`src/app/shared/components/lcars-toggle-selector/`

Two adjacent pill segments with a 2px gap. One is always active (coloured), the
other always dim; clicking either sets the value directly. For when off and on
have distinct named meanings ("PRIVATE" / "PUBLIC").

| Segment | Active background | Active text | Inactive |
|---|---|---|---|
| Off (left) | `$lcars-cardinal` (red) | White | Dark, dim |
| On (right) | `$lcars-green` (green) | Black | Dark, dim |

| Input | Type | Default | Description |
|---|---|---|---|
| `offLabel` | `string` | `'OFFLINE'` | Label for the left (false) segment. |
| `onLabel` | `string` | `'ACTIVE'` | Label for the right (true) segment. |
| `ariaLabel` | `string` | `''` | Accessible label for the `role="group"` wrapper. |

```html
<app-lcars-toggle-selector
  formControlName="publiclyVisible"
  offLabel="PRIVATE"
  onLabel="PUBLIC"
  ariaLabel="Publicly Visible">
</app-lcars-toggle-selector>
```

Notes:

- Both segments are always visible and coloured — there is no neutral state.
- The left segment rounds only its left edge, the right only its right. The 2px
  gap separates them while keeping them grouped.
- Clicking the already-active segment does nothing (guarded in `select()`).
- `role="group"` on the wrapper with `aria-pressed` per button is the correct
  ARIA pattern for a binary segmented control.
- **No current usages.** Kept as a documented option.

### Choosing a toggle

| Situation | Recommended |
|---|---|
| Tight on horizontal space, subtle indicator preferred | Option B (delta) — and the house default |
| Binary toggle where off/on have distinct named states | Option C (selector pair) |
| Single prominent toggle that needs to command attention | Option A (pill) |

---

## Conventions

Every shared component:

- Is **standalone**. Seven declare `ChangeDetectionStrategy.OnPush` — the three
  toggles, `endeavour-rank-badge`, `smart-chart`, `lcars-search-dialog` and
  `alert-panel`. The rest still run default change detection; new components
  should use OnPush.
- Keeps presentation and action apart — a card emits which action was pressed
  and the page performs it.
- Imports SCSS by name (`@use 'lcars-variables' as vars;`), never by relative
  path.

When testing them, two things bite often enough to be worth repeating here:

- Arrange mocks **before** the first `detectChanges()`. A later one will not
  re-render a getter-driven `@if`.
- With OnPush, click the real control rather than calling `setValue` — otherwise
  the bindings stay stale.

Angular templates are only type-checked by `ng build`, never by Jest, so run a
build after changing a template's bindings.
