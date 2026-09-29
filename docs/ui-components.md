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
| Feature partials | `src/styles/_storytime.scss`, `_custom-tracking.scss`, `_help.scss`, `_fleet-community.scss` | One partial per feature whose pages are built from the same handful of shapes. Every rule scoped by the feature's class prefix (`storytime-`, `custom-tracking-`, `help-`, `fleet-community-`). |
| Rendered Markdown | `src/styles/_markdown.scss` | The classes both Markdown renderers emit for the site's own constructs (`.sto-indent`, `.sto-spacer`). Global rather than per feature: the same writing is shown on a News post, in a Chapter and in the editor preview beside it, and `[innerHTML]` content never carries a component's encapsulation attribute anyway. |
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
header and story detail, the Storytime Markdown field, Custom Tracking, and a
Fleet's sections (`app-fleet-tabs`).

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
| `.page-subject-row` | The line under a page heading that names the account or captain the page is about, with the quick-switch control at the end of it. |
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

**`StoSwitcherDialogComponent`** — the quick switcher: every account the owner
has with every captain on it, in one flat list, and one click to any of them.
It fetches its own list (`StoAccountService.getSwitcherList()`, backed by
`GET /account/switcher`) each time it opens rather than holding one, so it
never offers a roster the dashboard behind it has already left behind. Takes
`StoSwitcherDialogData` (`currentAccountId`, `currentCharacterId`) and closes
with a `StoSwitcherSelection` (`accountHandle`, `characterHandle`) or
`undefined`.

Rows are ordered the way the dashboard's own lists order them — pinned first,
then by handle. An account with no captains is still listed: it is somewhere to
switch to. The entry being read is marked and disabled; on a captain's page the
captain is that entry and the account above them stays reachable.

A host that sizes `.cta-icon` in its **own** scoped stylesheet will not size
the switcher: view encapsulation stops that rule at the component boundary, so
the control keeps whatever it inherits and ends up visibly smaller than the
icons beside it. Size the `app-sto-switcher-button` host element instead —
it belongs to the host's template, and `font-size` inherits through the
boundary. Hosts that rely on the global `.cta-icon` rules need nothing.

Do not open it directly. **`StoSwitcherButtonComponent`**
(`<app-sto-switcher-button>`) is the control every page uses: it takes
`currentAccountId` / `currentCharacterId`, opens the dialog and navigates to
whatever comes back. It is on the account and captain detail pages, the
endeavour page, every progress tracker, and the Your Accounts list — and
deliberately not on the add/edit forms, where switching away would fight the
unsaved-changes guard.

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

## Fleet Community

The Fleet system is built from the vocabulary above rather than from a language
of its own: `.lcars-btn` for every button, `.lcars-input-container` for every
field, `lcars-tab-strip` for every strip of sections, `ConfirmDialogComponent`
for every destructive confirmation, and the four alert components for state.
What follows is only what Fleet adds.

### Colour

**The whole feature is sky**, the way Custom Tracking is tangerine and the help
section is perano. Community, Fleet and Armada are *not* three colours: they
are told apart by a label and an icon, which leaves the palette free to mean
something — a Fleet that is recruiting, closed or disputed, an upload that has
passed or been refused — and keeps the distinction legible to a reader who
cannot separate two mid-tone blues.

`_fleet-community.scss` names every colour from `lcars-variables`. No Fleet
stylesheet writes a hexadecimal.

### Layout

`src/styles/_fleet-community.scss`, scoped `fleet-community-`. It holds what a
*page* writes in its own template, which a component's encapsulated styles
cannot reach:

| Class | What it is |
|---|---|
| `.fleet-community-page` | The page column, matching the shell's own padding. |
| `.fleet-community-grid` | The listing grid for scope cards. Cards stretch, so a row is one height; one column below 480px. |
| `.fleet-community-empty` | What a listing says when it holds nothing. An empty directory is a normal state here, not a fault. |
| `.fleet-community-form-row` | A row of fields that becomes a column when two no longer fit. |
| `.fleet-community-field-hint` | The sentence under a field saying what it means. Not an error — that is `.field-error`, which the input container already styles. |
| `.fleet-community-form-actions` | The row a form's buttons sit in; wraps rather than shrinking a pill below its label. |
| `.fleet-community-filter-row` | The row a listing's own controls sit in — a day, a search, a rank, a zone. |
| `.fleet-community-table` | A table of figures: the roster, its history, every report, an import's rows. See below. |
| `.fleet-report-notice` | A sentence about a report or section as a whole: what it covers, what it hides. |
| `.fleet-report-note` | A second line under a cell's value, saying something about it — partial, excluded, across a gap. |

**Tables.** The roster, its history and the reports are rows of figures, and a
real table is the honest shape for them: a reader compares a column down, which
cards do not let them do. Header cells are Antonio in sky; a figure's cells take
`.fleet-community-table__number`, right-aligned in tabular numerals so the
digits line up; a sortable header wraps its label in a
`.fleet-community-table__sort` button, with `aria-sort` on the `th`. Below
720px there is no room for the columns and a page must never scroll sideways,
so each row becomes a block of labelled lines: **every `td` carries its
column's name in `data-label`**, which the narrow layout writes before the
value, and the header row is hidden from sight but kept for a screen reader. A
table without `data-label` on every cell reads as a column of unlabelled
numbers on a phone.

A note in a cell is a `span.fleet-report-note`, which is a block of its own.
Two sit on separate lines on screen but run together in `textContent`, so a
spec asserts each note element rather than the cell's text.

`.form-row`, `.field-hint` and `.compact` are a per-feature convention rather
than a global rule, which is why Fleet declares its own rather than assuming
one exists.

### Components

Fleet's own components live in `src/app/fleet/components/`. All are standalone
and OnPush, and the cards emit an action rather than performing one.

**`<app-fleet-page-shell>`** — the chrome every Fleet page sits in: its tab
strip, its heading, the line naming what the page is about, and whichever of
loading, failed or ready it is in.

| Input | Type | Notes |
|---|---|---|
| `heading` | `string` (required) | Rendered as the page's `<h1>`. |
| `subject` | `string \| null` | The Community or Fleet the page is about, under the heading. A name, never an identifier. |
| `tabs` | `readonly FleetShellTab[]` | `{ link, label, exact }`. Link tabs, because each Fleet section is its own route. Omit for a page with no sections — a strip of one tab says nothing. |
| `tabsAriaLabel` | `string` | Default `'Fleet sections'`. |
| `isLoading`, `loadingText` | `boolean`, `string` | Swaps the content for `<app-loading-bar>`, keeping the heading. |
| `errorMessage` | `string \| null` | Swaps the content for `<app-lcars-error-message>`, which renders **text**. |

Holding the three states here is the point: a dozen Fleet pages each writing
their own `@if (isLoading)` is a dozen chances for one to show a heading above
an empty page, or leave a stale list under an error.

The projected content is instantiated by the page whether or not the shell is
showing it, so do not rely on the shell to delay a child's initialisation —
only its rendering.

**`<app-fleet-tabs>`** — the strip along the top of every page of a Fleet a
Community holds: Overview, News, Activity and Events for anybody (News from
FC-027, Activity from FC-029, Events from FC-030); Roster
and History for `roster.view`
holders; Reports for anybody the server shows a report to; Holdings for
anybody (FC-023); Investigate for whoever imports or investigates its rosters;
Recruitment for whoever holds `applications.view`, `applications.decide`,
`recruitment.manage` or `members.manage`; Manage for its Owner and Admins
(FC-022). It takes a `FleetTabsVm`, which `fleetTabsVmOf(resolved)`
builds from the resolved Fleet and returns null for a Fleet no Community holds,
so such a Fleet draws no strip.

On a platform the game writes no roster export on, `providesRoster` is false:
the roster, history and investigation tabs are not offered, and News,
Activity, Events, Reports, Holdings, Recruitment and Manage still can be
(FC-021, FC-030). Every reader has News, Activity, Events and Holdings as well
as the Overview, so the strip is always drawn.

Every tab but Reports is decided by the reader's capabilities. Reports asks the
server once per Fleet which reports the reader sees, on every Fleet, since
holdings are public and read from the Fleet's own records (FC-030). It draws
no tab when none is shown or the answer fails, rather than one leading to a page that cannot be read. Pages beneath a
section — an import under Investigate, a member under History — sit beneath
its address, so its tab stays lit on them.

**`FleetSectionPageDirective<T>`** (`src/app/fleet/scope/`) — the half of a
section page that every one repeats. It resolves the Fleet the address names,
tells a Fleet that does not answer (`MISSING`), a request that failed
(`ERROR`) and a section the reader may not open (`NOT_PERMITTED`) apart, and
only then calls the page's `load(section, query, params)`. A page declares
`_requiredCapabilities`, any one of which opens it — empty where the server
decides, as on Reports — and its `notPermittedMessage`. A section about the
roster answers `MISSING` on a Fleet with no roster export; a recruitment page
sets `_needsRoster = false`, since a console Fleet recruits too. Each navigation is
caught on its own, so a failure on one address does not leave the page unable
to show the next, and `reload()` reads the section again at the same address.

What a reader chooses on a section page — an export, a page, an ordering, a
span, a filter — **lives in the address**, so a view can be bookmarked, shared
with another member and reached with the back button. A page changes the
query with `queryParamsHandling: 'merge'`, dropping what the change makes
stale: a new span drops the export the detail was drawn at.

**`<app-fleet-scope-badge>`** — says whether something is a Community, a Fleet
or an Armada, and on which platform.

| Input | Type | Notes |
|---|---|---|
| `scope` | `FleetScopeType` (required) | `COMMUNITY`, `FLEET` or `ARMADA`. |
| `platform` | `string \| null` | Sits in its own darkened half. A Community spans every platform and so has none. |

**`<app-fleet-scope-card>`** — a Community, Fleet or Armada in a listing. Takes
`FleetScopeCardVm`, emits `action: string`, and disables every button while
`isActing`.

The card exists to make two registrations of one name tellable apart. Anybody
may register a Fleet and nothing proves they run it, so the card shows the
Community that registered it, the platform, the exact name and when its roster
was last seen. **The name is rendered exactly as recorded** — two Fleets whose
names differ only in their spacing are two Fleets, and a directory that tidies
them is a directory in which one cannot be found.

Every field of the view model is text the card renders as text. A Fleet name
comes from a CSV somebody uploaded, so nothing in it may reach a component that
renders HTML.

`FleetScopeCardStatus` is its own field rather than a colour on the card: the
card's colour says which feature this is, and the pill says what state the
Fleet is in (`recruiting` green, `closed` grey, `disputed` tangerine).

`lastObservedLabel` is a formatted string, not a date. Deciding which timezone
a moment is written in belongs to the page, which knows whether it holds an
instant — rendered through `AppDatePipe` — or a day somebody typed, which is
never re-zoned at all.

### Recruitment

Recruitment (FC-021) lives in `src/app/fleet/recruitment/`. Every request goes
through `FleetRecruitmentService`, and every refusal is shown with
`recruitmentRefusalOf(error, fallback)`: the server's own sentence for a 400,
403, 404 or 409 — a requirement not met, a form that changed, somebody already
a member — and the page's words for anything else.

**`<app-fleet-recruitment-panel>`** — on a Fleet's page, beneath the follow
control, for an active Fleet a Community holds. It reads how the Fleet recruits
itself, says what the state means, lists the requirements, and offers the
reader what they may do: join an `OPEN` Fleet with one of their Characters on
its platform, apply to an `APPLICATION` one on a page of its own, accept or
decline an open invitation, or leave. It raises `changed` after a join,
acceptance or decline, so the page reads their standing and tabs again. Leaving
instead takes the reader to their own applications, saying so: a Fleet only its
Community can see is gone from them once they leave it. An open invitation shows
the invitee such a Fleet until they answer it.

A Character is chosen from the reader's own accounts on the Fleet's platform
(`recruitmentCharactersOf`). Level and faction are the server's to check.
Whenever somebody joins or is accepted, the page says the site cannot invite
anybody in game (`IN_GAME_INVITE_NOTE`).

The **Recruitment** tab is a hub like Investigate: Applications and Invitations
for `applications.view`, Members for `members.manage`, Settings for
`recruitment.manage`, each its own address below `…/recruitment`. Deciding an
application and sending an invitation take `applications.decide`. A decision
and a settings save send the revision or version they read, and a refusal
because somebody else got there first reads the page again beneath the
server's message.

**Members** (FC-036): each member offers Suspend… (or Reinstate… once
suspended) beside Remove…. Each asks for a reason in the same inline form,
worded for what it does. A suspended member shows as Suspended, with the
reason; they are told they are suspended, never why, and "Member since" is when
they joined. A refusal is titled by what was refused ("Not suspended").

The applicant's side is **`/fleets/applications`**: their applications with
each decision and its reason, their open invitations, and withdrawing one
still waiting. It is linked from the dashboard and from a Fleet's page while an
application waits. An accepted application whose membership has since ended
says whether they left or were removed, and a Fleet they can no longer see is
named without a link.

A Fleet proposal that recruitment raised on a Character's page says how the
Character came in — an application, an invitation or a join
(`RECRUITED_BY_LINES`) — before asking the owner to confirm it once they are
in the Fleet in game. The panel's note and the Yes button follow what raised
the proposals waiting: a roster match asks whether the listed Captain is this
one, while a recruited one asks whether the Character is in the Fleet in game
(`PROPOSALS_ROSTER_NOTE`, `PROPOSALS_RECRUITED_NOTE`, `PROPOSALS_MIXED_NOTE`).
A recruited proposal the server withdrew when the Fleet membership ended
(`WITHDRAWN`) is not shown.

### Governance

Who governs a Community, Fleet or Armada (FC-022, FC-025) lives in
`src/app/fleet/governance/`.
Every request goes through `FleetGovernanceService`, and a refusal is shown
with `recruitmentRefusalOf`, as recruitment's are.

The pages are the same at every level: `GovernancePageDirective` reads the
address, resolving an Armada when the route says it governs one, a Fleet when
it names a platform and the Community otherwise, and tells absent, failed and
not permitted apart. Each lives below the scope's **Manage** hub
(`FLEET_LINKS.communityManage`, `FLEET_LINKS.fleetManage`,
`FLEET_LINKS.armadaManage`):

| Page | Address | Who opens it |
|---|---|---|
| Manage hub | `…/manage` | The Owner and Admins; on a Community, a site administrator too |
| Roles | `…/manage/roles` | The Owner changes it; Admins read it |
| Delegation | `…/manage/delegation` | The Owner changes it; Admins read it |
| History | `…/manage/history` | The Owner and Admins |
| Ownership | `communities/:slug/manage/ownership` | The Community's Owner |
| Site administration | `communities/:slug/manage/dispute` | A site administrator |

A Fleet's **Manage** tab is offered to its Owner and Admins (`roles` on the tab
strip's view model). A Community's page offers **Manage** among its actions to
the same people and to a site administrator.

Roles are appointed from the scope's members, one each: somebody holding a role
is not offered again until it is withdrawn. Delegation ticks what every Officer
holds and grants or denies one capability to one person; the Owner is never
offered, since they hold everything. A reason is asked for wherever something
is taken away — withdrawing a role, unticking an Officer capability, a denial,
clearing a grant, closing — and is optional otherwise. Capabilities are named
with `capabilityNamer(delegable)`, and History reads each change as a sentence
with `describeGovernanceAction`.

**`<app-governance-close-dialog>`** — opened through `MatDialog` by the hub and
by the site administration page. Closing cannot be undone, so the reader types
the name back as well as a reason; the name is compared with its edge spaces
trimmed. It closes with `{ reason }`, or nothing when kept open.

**Site administration** (FC-036) adds, on the dispute page:

- **Its Fleets and Armadas**, each with every other registration of its exact
  name on its platform, private ones included: Community, its Owner, when
  registered, last import, members and who may see it. A note above them says
  STO Info cannot tell who leads a Fleet in the game, and none is shown as the
  real one.
- **Suspend… / Reinstate… and Close…** on each, and Suspend… / Reinstate… for
  the Community itself. Suspending and reinstating ask for a reason in
  **`<app-governance-reason-dialog>`**; closing uses the close dialog with the
  Fleet's or Armada's name.
- **Look into its imports…** on each Fleet: the reason dialog asks for a
  purpose of 10 to 500 characters, and the page then goes to the Fleet's
  Investigate pages, open to that administrator, read-only, for 24 hours.

History reads a suspension and a reinstatement as sentences too.

**`<app-ownership-offer-panel>`** — on a Community's page, for an Admin of an
open Community. It reads where ownership stands and shows nothing unless the
open offer is to the reader. Accepting asks first; declining does not, since
the Owner can offer it again. The page is not read again afterwards: that would
draw the panel afresh and lose what it says about the answer.

Confirmations built from names somebody chose escape them with `escapeHtml`
before they reach the dialog's markup.

### Holdings

A Fleet's holdings (FC-023) live in `src/app/fleet/holdings/`, behind
`FleetHoldingsService`. **`<app-fleet-holdings>`** is the Holdings tab, a
`FleetSectionPageDirective` page open to anybody who may see the Fleet, signed
out included, on every platform.

Each of the seven holdings in the catalogue is drawn with its own track first,
then its departments, as "2 of 5" and when each was last recorded, and says
which STO Wiki page and edit date its tiers come from. A track never recorded
reads as tier 0. When the server says the reader may record (`mayRecord`),
each holding offers **Record…**, which opens a form for that holding alone: a
select per track at its tier now, and an optional reason. **Record** stays
disabled until a tier changes, and only the tracks that changed are sent; a
tier may go down to put a mistake right.

The history beneath is the server's, newest first, paged by `?page=` as the
roster history is. Each change reads as one line, "Fleet Starbase: Starbase
1 → 2, Military 3 → 0.", with its reason, and names who recorded it only when
the server says the reader is shown recorders (`recordersShown`).

Because holdings and news are public, every registered Fleet's tab strip has
at least the Overview, News and Holdings, and the strip is always drawn.

### Armadas

How Fleets sit in an Armada (FC-024 to FC-026) lives in
`src/app/fleet/armadas/`, behind `FleetArmadaService`. Reading works signed
out; every change needs an account, and a refusal is shown with
`recruitmentRefusalOf`, as recruitment's are.

**`<app-armada-tree>`** — an Armada's shape as nested lists: the Alpha, or
"Empty" while the slot stands empty, then each Beta with its Gammas beneath
it. Lists rather than a drawing, so a keyboard, a screen reader and a phone
all follow the hierarchy the same way. Each Fleet says its position and when
it took it, and links to its page. A Fleet the reader may not see keeps its
place without its name or a link. With `manageable`, each Fleet the reader
may see offers **Move…** and **Remove…**, raised as `move` and `remove` for
the page to answer.

Two Fleets in one list with the same name get their Community's name after
it (`fleetNamer`); one Fleet named twice, as in a history, is still one Fleet.
The position and the name are separate spans kept apart by `&ngsp;`, so they
read as two words, not only look like them.

**`<app-armada-panel>`** — the tree on an Armada's page. A manager
(`armada.manage` at an open Armada) moves a Fleet or takes it out, each with
a reason; a Gamma needs the Beta it goes under, and a Beta that stops being
one needs every Gamma under it moved under another Beta, made a Beta or taken
out too. Taking a Fleet out asks first. A manager is also pointed at any
requests waiting.

**`<app-fleet-armada-panel>`** — on a Fleet's page: which Armada it is in and
where. Its `armada.request` holders ask to join one of the Armadas it could,
with an optional message; withdraw the request; see how the last one was
answered and why; and take the Fleet out, with a reason and after confirming.
A Beta with Gammas under it is told it cannot leave until an Armada manager
moves them.

**`<app-community-structure-panel>`** — on a Community's page: each open
Armada as a tree, then the Fleets in none. Neither the panel nor the Fleet
one shows anything when it cannot be read, since neither is what the page is
for.

An Armada's pages have their own strip, **`<app-armada-tabs>`**: Overview,
News, Activity and History for anybody, Requests for `armada.manage` holders, Manage for its Owner
and Admins. **`ArmadaSectionPageDirective<T>`** is the Armada's
`FleetSectionPageDirective`, for its two section pages:

| Page | Address | Who opens it |
|---|---|---|
| History | `…/armadas/:platform/:slug/history` | Anybody who may see the Armada; who made each change and why, its members only |
| Requests | `…/armadas/:platform/:slug/requests` | `armada.manage` holders |

Both page by `?page=`, and Requests filters by `?status=`, open by default.
Approving asks where the Fleet goes; rejecting asks why, which the requesting
Fleet is shown.

Its Manage pages are the governance pages, told by their route's
`data.governs: 'ARMADA'` that the scope is an Armada. There is no closing
there: an Armada is closed from its Community.

### News

A Community's, a Fleet's and an Armada's own news (FC-027) lives in
`src/app/fleet/news/`, behind `FleetNewsService`. The posts are the site's
news table's, so the body is Markdown shown through the same `markdown` pipe
as the site's News; nothing a post can carry is more than the site's own
news can.

The pages are the same at three kinds of address, and resolve their scope as
the Manage pages do: **`FleetNewsPageDirective<T>`** extends
`GovernancePageDirective<T>`, so an Armada's pages are told so by
`data.governs: 'ARMADA'`, and a Community's by having no platform in the
address.

| Page | Address | Who opens it |
|---|---|---|
| News | `…/news` | Anybody who may see the scope; which posts, and drafts for its news writers, is the server's answer |
| A post | `…/news/:postSlug` | Anybody it is published to; a draft, its news writers |
| Write a post | `…/news/write` | `news.write` holders, while the scope is open |
| Edit a post | `…/news/:postSlug/edit` | `news.write` holders, while the scope is open |

`…` is a Community's, a Fleet's or an Armada's own address. `write` is a
literal no post's address can be, and its route comes first.

**The list** searches titles and summaries, pages, and for news writers
switches between published posts and drafts. All three are in the address
(`?q=`, `?page=`, `?status=DRAFT`), so each is a link of its own.

**A post** shows its cover, who wrote it — linking their profile only where
the server says the reader may open it — and who it is for, in words for the
kind of scope (`fleetNewsAudienceLabel`). A news writer edits, publishes,
unpublishes and deletes it while the scope is open, and deletes a draft after
it closes. A site administrator who writes no news there may unpublish or
delete it. Unpublishing and deleting ask first, through the shared LCARS
confirmation.

**The editor** takes a title, an optional summary, the audience and the
body, with a preview. A new post is saved as a draft or published straight
away; a new draft opens in the editor again, since a cover needs the post to
exist. The cover goes through `<app-fleet-image-crop-dialog>` like a banner,
as the `COVER` slot of a `NEWS_POST` target, and is shown once the scanner
has cleared it. Reading the post again after a cover changes keeps what has
been typed.

A Fleet's and an Armada's strips have a **News** tab, after Overview. A
Community page has no strip, so **`<app-fleet-news-latest>`** shows its
latest three posts and the way to the rest, and offers its writers a new
post.

### Activity

A Community's, a Fleet's and an Armada's activity, and each member's own
(FC-029), live in `src/app/fleet/activity/`, behind `FleetActivityService`.
The server writes each item as a sentence and decides which the reader sees,
asking afresh each time, so the pages only draw what they are given.

**`<app-fleet-activity-feed>`** draws a feed. Its `source` is a scope's feed
(`{ kind: 'SCOPE', target }`) or the reader's own (`{ kind: 'MINE' }`), and a
new source starts it again. Each item is its sentence, linking where the
server says to read more, and when it happened. `showScope` names each item's
Community, Fleet or Armada, for a feed gathering several. `latest` shows only
that many, with `allLink` leading to the rest; otherwise **Older** reads the
next page, held while one is being read, until there are none. A feed that
cannot be read says so rather than that nothing has happened.

| Page | Address | Who opens it |
|---|---|---|
| Activity | `…/activity` | Anybody who may see the scope; which items is the server's answer |

It resolves its scope as the News pages do, and draws the scope's strip. A
Fleet's and an Armada's strips have an **Activity** tab, after News. A
Community page has no strip, so its Overview shows the latest five items and
the way to the rest. The Dashboard's Fleets page shows **Your Fleet
activity**: the Communities the member follows and the Fleets and Armadas they
belong to, each item naming its scope.

### Events

A Community's, a Fleet's and an Armada's events (FC-030) live in
`src/app/fleet/events/`, behind `FleetEventsService`. The pages are the same at
three kinds of address and resolve their scope as the News pages do, through
**`FleetEventsPageDirective<T>`**, which also carries their links, the wording
of audiences for the kind of scope, and a change's running and refusal.

| Page | Address | Who opens it |
|---|---|---|
| Calendar | `…/events` | Anybody who may see the scope; which events is the server's answer |
| An event | `…/events/:eventId` | Anybody it is shown to |
| An occurrence | `…/events/:eventId/occurrences/:occurrenceId` | Anybody it is shown to |
| New event | `…/events/new` | `events.manage` holders, while the scope is open |
| Change an event | `…/events/:eventId/edit` | `events.manage` holders, while the scope is open |

`new` is a literal no event's ID can be, and its route comes first.

**Every time says its zone.** **`<app-fleet-event-when>`** writes an
occurrence in the reader's own zone, as every instant on the site is, and
always gives the event's clock beside it. It reads "(Europe/London time)"
where the two agree, and otherwise "your time" with the event's time, zone and,
where it differs, day. The calendar names the reader's zone too.

**The calendar** is a month grid, or an agenda by default on a narrow screen.
The view and the month are in the address (`?view=`, `?month=`), so each is a
link. It reads a week either side of the month and lays each occurrence on the
day it starts in the reader's zone. Its event managers are offered a new event
while the scope is open.

**An event** gives its rule in words (`fleetEventRuleOf`), who it is for,
places, link and description, and the next ten occurrences:

- **Answering.** **`<app-fleet-event-answer>`** answers each occurrence ahead,
  as one of the reader's own Characters on any account if they choose, and
  says what the answer means: a place, the waitlist and how far along, or no
  place.
- **Reminders.** Ticking leads and saving asks for reminders; unticking every
  one stops them.
- **Managing.** Managers change it from now on, cancel it, cancel or move one
  occurrence on the event's clock, and read the change log on asking.
  Cancelling asks first.

**An occurrence** shows its counts, who answered for the scope's members, and
the reader's own recorded attendance. Once it has started, managers get the
attendance sheet: everybody who answered, then the scope's members, found by
name, each recorded as came or did not come.

**The editor** takes the title, Markdown description, link, audience (with
Fleets and roles when chosen), the zone (the Community's own by default), the
rule, start, length, places and end. **Show what it comes to** asks the server
for the next year, flagging every occurrence the clocks move and every month a
monthly day skips, before anything is saved.

A Fleet's and an Armada's strips have an **Events** tab, after Activity. A
Community page shows its next five in **`<app-fleet-events-upcoming>`**, with
a link to the calendar. The Dashboard's Fleets page shows **Your upcoming
events**: the reader's own next thirty days, each naming its scope.

### Chat

Chat's page is `/chat` (FC-033), signed in only, built on the live connection FC-032 added,
`ChatSocketService`. Everything is in `src/app/fleet/chat`, and the protocol is in the backend's
`docs/fleet-chat.md`.

**The page** (`ChatPageComponent`):

- **The list.** Every channel the reader may read, by Community, Armada and Fleet (each scope's
  name linking to its page, a role-limited channel saying who it is for), then Direct messages.
  The open place sits beside the list. Below 720px the two are stacked, one at a time, and the
  open place has an "All chats" button back.
- **Addresses.** One route matcher keeps one page for every address, so moving between places
  keeps the list and the connection:
  - `/chat` and `/chat/channels/:id` or `/chat/direct/:id` say what is open;
  - `/chat/fleets/:id`, `/chat/armadas/:id` and `/chat/communities/:id` open that scope's first
    channel, replacing the address;
  - a place the list does not hold says so, with the way back.
- **The connection.** A banner says when it is reconnecting, when five other tabs pushed this one
  out ("Use chat here" opens it again), or when the session ended.
- **Custom channels.** A scope's moderators add them ("Add channel"), and change or archive each.
  Changing opens `ChatChannelDialogComponent`: a name, who reads it, and who posts, never looser
  than reading. Archiving asks first with the LCARS confirmation.
- **Transcripts** (FC-035). Where the reader may export (`mayExport`), each channel has an export
  button. It opens `ChatTranscriptDialogComponent`:
  - From and To, in the device's time, defaulting to the last day and bounded to the last seven
    days (ten minutes' grace, for a clock a little behind the server's);
  - a purpose of 10 to 500 characters.
  - "Your transcripts" then lists what they asked for in the last day, with its status, range and
    message count, and Download while it is ready and within its day. The download is fetched with
    the reader's token and saved as `chat-<channel>-<date>.txt`.
  - An in-app notice says when one is ready. Refresh reads the list again; the page does not poll.

**One place** (`ChatConversationComponent`):

- **Messages as text.** Every message is written as text, never markup, in compact rows: the time
  in the reader's zone (the full date in its tooltip and `datetime`), the author in sky, then the
  text. The same author within five minutes drops the name. A day starts with a divider, and the
  reader's own messages carry a sky bar on the left.
- **Mentions** are marked only for the people the server says a message mentions.
- **Replies** show a one-line quote of what they answer, or "Earlier message" once it is gone or
  older than four hours. Clicking the quote scrolls to the message when it is on screen.
- **Moving through time.** "Load earlier" reads back to the four-hour edge, where the top says
  "Chat keeps the last four hours here." New messages keep the log at the bottom. While the reader
  is scrolled up, a button counts what arrived.
- **The composer.** Enter sends and Shift+Enter starts a new line. A counter appears from 1,800
  characters of the 2,000. Typing `@` opens the list of people who can read the place: arrows move
  through it, Enter or Tab picks, Escape closes it. Reply starts a reply, and Escape stops it. A
  message shows as "Sending…" until the server has it, or "Not sent" with the reason, "Try again"
  and "Discard".
- **Deleting.** Reply and Delete appear on hover and focus, and always on a touch screen. Deleting
  one's own message asks first. A moderator's Remove asks why, in `ChatRemoveDialogComponent`.
- **Reporting** (FC-035). Report appears on others' messages where the reader may report
  (`mayReport`), and always in a conversation. `ChatReportDialogComponent` takes a reason from the
  member reports' list, with details that "Something else" needs. The reader is thanked ("Thanks,
  a site admin will look at it.") or told they already reported it, and never told the outcome.
- **Blocks** (FC-034). A message from somebody across a block reads "Message from a member you
  can't see", with no name and nothing to do.
- **Typing** (FC-034). A line under the log says who is writing: one name, two, or "several
  people". A writer drops off five seconds after their last signal, or when their message arrives.
  The reader's own signal goes only while they share their typing (Settings).
- **Access.** The log is an ARIA log. The composer is a combobox with its list, so the whole page
  works from the keyboard.
- **Its own life.** It joins its place when shown and leaves it when changed or destroyed. No
  subscription or timer outlives it.

**The ways in:**

- a Chat door at the end of each Fleet's and Armada's strip, for its members and role holders;
- a Chat door at the end of the Community strip, for anybody signed in;
- "Open chat" on the dashboard's Fleets page;
- a Message button on a friend's profile, which opens the conversation by the friendship.

Each is offered only while chat is switched on.

**Across the site** (FC-034):

- **Staying connected.** `ChatSessionService` keeps the socket open in every signed-in tab while
  chat is on, and `AppComponent` starts it. Being online means having STO Info open.
- **Toasts.** `<app-chat-toasts>`, in the app shell, shows a toast for a direct message or a
  mention of the reader, unless that place is open. It gives who and where, never the text, lasts
  eight seconds, and links to it.
- **Presence.** `ChatPresenceService` asks who is online every minute while shown, and only while
  chat is on. It shows:
  - a dot beside each friend in the chat page's Direct messages;
  - an Online badge on a friend's card (`withPresence`);
  - an Online chip beside a member's name on their profile.
  - The server answers only for people the reader may see.
- **Settings.** Presence visibility, appearing offline, typing, and the mention, reply and direct
  message notices show while chat is on. The roster timezone and the other Fleet notices show
  while Fleet is on.

**Linked queues and holds** (FC-036), in `src/app/admin/moderation-admin`:

- A chat report says how many open member reports there are about its author,
  linking to Reported Officers; a member report says how many open chat
  reports there are about the member, linking to Chat Reports. The Admin page's
  Community heading carries both queues' open count.
- A chat report offers **Hold this evidence…** once its evidence is shown, and
  says when it is held; each report offers holding its author's messages, and
  each member report holding the member's. Each asks for a reason.
- **`/admin/holds`**, "Moderation Holds" (`ModerationHoldListComponent`): holds
  in force first, then released or all. Each shows whose, why, its owner and
  review date, flagged when due.
  - **Read what it keeps** asks for a purpose each time, then shows the
    messages newest first, with where each was, deleted text marked, and
    Earlier for the page before.
  - Its log lists every placing, extension, release and reading with its
    reason or purpose.
  - **Extend** (`ModerationHoldExtendDialogComponent`) takes a review date up
    to 180 days ahead and a reason. **Release** takes a reason.
  - A hold in force also shows when STO Info will release it automatically
    unless somebody extends it: 14 days after its review date (FC-037).
    STO Info's own steps show in the log as automatic: telling the owner,
    warning every site admin, and the release. A hold STO Info released
    names nobody as having released it.
- **`/admin/fleet-investigations`**, "Fleet Investigations": every site
  administrator's look into a Fleet, newest first, with its purpose, linking to
  the Fleet while it is open.
**The site admins' queue** (FC-035): `/admin/chat-reports`, "Chat Reports" on the Admin page, in
`src/app/admin/moderation-admin` (`ChatReportAdminListComponent`):

- Open reports first, oldest first, twenty a page. The filter offers open, actioned and dismissed.
- Each says whose message, the reason and details, where it was (scope and channel, or "Direct
  message"), and who reported it.
- "Show evidence" reads the report once and shows the twenty messages before it, oldest first,
  with the reported one marked. A message deleted before the report shows as such.
- Resolve and Dismiss take a note (`ChatReportDecisionDialogComponent`), required since FC-039:
  it is the decision's reason in the site admin log. Remove the message asks why, as a
  moderator's removal does, and keeps the evidence as it was.

**The connection, `ChatSocketService`:**

- **Opening.** The socket opens when a page first joins a place or sends, WebSocket only, at the
  API's origin on `/chat/socket`. The access token goes in the first message, never in the
  address, and a fresh one follows a minute before it runs out.
- **Status.** `status` is a signal:
  - `idle`, `connecting`, `online` or `offline` (reconnecting);
  - `signedOut` when there is no session;
  - `replaced` when five other tabs pushed this one out. It then waits to be asked again.
- **Reading.** `join(place)` gives the latest page. After that, each new message comes once
  through `messages$`, however often the server sends it. `deleted$` and `removed$` say what was
  deleted, and which places may no longer be read. `leave(place)` stops.
- **Sending.** `send(place, body)` picks a client ID and sends again with the same ID until the
  server acknowledges the committed message. A dropped connection neither loses nor doubles it. A
  refusal comes back as a `ChatSocketError` with the server's status: 403, 404 or 429.
- **Reconnecting.** On every reconnect, to whichever instance, it joins each place again from the
  last message it holds. Anything missed comes through `messages$`, and a place it may no longer
  read through `removed$`.

### Upload and scan state

**`<app-asset-scan-status>`** lives in `src/app/shared/components/`, not in the
Fleet folder, because every upload in the application moves onto these states:
a Fleet roster CSV, a captain's portrait and a Storytime cover are the same
five states and a reader should not learn them twice.

| Input | Type | Notes |
|---|---|---|
| `state` | `AssetScanState` (required) | `UPLOADING`, `AWAITING_SCAN`, `SCANNING`, `AVAILABLE`, `REJECTED`. |
| `fileName` | `string \| null` | Rendered as text; a filename is something somebody chose. |

The wording lives in `shared/constants/asset-scan.constants.ts`. Each state
carries a label, an icon, a colour and — while it is still moving — a progress
bar, so the state is said four ways and never by colour alone. The bar stops
sweeping under `prefers-reduced-motion` rather than disappearing, because it
still means the upload has not finished.

**A rejection never says what was found.** Naming the signature that matched
tells somebody probing the scanner exactly what got through; the copy says the
file was refused, that nothing already in place has changed, and stops.

### Reports

Each of a Fleet's reports is its own view component under
`src/app/fleet/fleet-reports/`, fed the report the page read. The page draws
the choice of report, the span in whole days of the reader's own timezone, the
revision and exports the report covers, and the CSV download; the view draws
the report's tables and its chart.

- **A hidden figure is `< 5`.** In an aggregate view the server sends null for
  a count or total it hid, and `reportFigure` writes it as the CSV does, by the
  report's `minimumCohort`. A contribution total arrives as a decimal string and
  is written through `BigInt`, since it can exceed what a number holds.
- **A hidden figure is not drawn.** `reportChartOf` leaves it out of the
  `SmartChart` — a bar of nought would say there was nothing, and a bar of any
  height would say how much — and the view says how many it left out.
- **Nothing is dated more exactly than its exports.** An interval is written as
  the two exports it lies between, and nothing is spread over the days between.
- **The CSV is fetched, then saved.** It is read with the reader's token, which
  a plain link cannot carry, and handed over with `saveFile`, named by the
  Fleet, the report and the day, since the browser cannot read the
  `Content-Disposition` the server set across origins.

Attendance, recruitment and holdings (FC-030) are read from the Fleet's own
records, not its roster. They have no revision or exports, so the page says
their span instead and offers the last twelve months as the span to go back
to. `recordHeaderOf` tells them apart from the roster's reports. The page
opens on every Fleet, console ones included (`_needsRoster` is false), and a
roster report on a Fleet without one is simply not offered.

- **`<app-attendance-report>`**: each occurrence of the Fleet's own events,
  going, came, did not come and the rate, with the totals; and each person,
  for the Owner and Admins alone.
- **`<app-recruitment-report>`**: month by month and route by route, the
  outcomes and the median days to a decision. Never a name.
- **`<app-holdings-report>`**: every tier a track moved, newest first.

Who may see attendance is worded per report (`fleetReportAudienceLabel`): its
members see counts only, where the roster's members see a report in full.

### Corrections

The pages an investigator changes the roster from — rank order, conflicting
exports, an import's corrections and rows — share a shape:

- **A reason, given once** for whichever change it is, capped at the server's
  500 characters, with the button disabled until it is given.
- **No confirmation dialog.** Each change can be undone by another and is
  logged with who made it and why (Steve's decision of 25 September 2026).
  Deleting is different, and still takes `ConfirmDialogComponent`.
- **The server's own words** for a refusal it understood — a 409, or a 400
  naming what it would not take — through `app-lcars-error-message`, and a
  general sentence for anything else. A refusal keeps what was typed.
- **Read again afterwards**, recorded or refused: either way, what the page
  showed is no longer how things stand. A change made to something another
  investigator changed meanwhile is refused and the page reads it again.
- **The history of changes** is listed beneath, newest first, naming an
  account since closed as such.

### Warnings and user text

`<app-lcars-warning-message>` renders its message as HTML. Fleet text — a Fleet
name, a filename, an import error, a chat report — comes from somebody else, so
it goes to the error or information components, which render text. This is the
one rule in the feature that a reviewer should check by reading rather than by
looking.

---

## Conventions

Every shared component:

- Is **standalone**. Ten declare `ChangeDetectionStrategy.OnPush` — the three
  toggles, `endeavour-rank-badge`, `smart-chart`, `lcars-search-dialog`,
  `alert-panel`, `refresh-session-dialog`, `feature-unavailable` and
  `asset-scan-status`. The rest still run default change detection; new
  components should use OnPush, as every Fleet component does.
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
