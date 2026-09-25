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

**`<app-fleet-tabs>`** — the strip along the top of every page of a Fleet
with a roster: Overview for anybody; Roster and History for `roster.view`
holders; Reports for anybody the server shows a report to; Investigate for
whoever imports or investigates its rosters. It takes a `FleetTabsVm`, which
`fleetTabsVmOf(resolved)` builds from the resolved Fleet and returns null for a
Fleet with no sections — one no Community holds, or on a platform the game
writes no roster export on — so such a Fleet draws no strip.

Every tab but Reports is decided by the reader's capabilities. Reports asks the
server once per Fleet which reports the reader sees, because a report's
audience can make it public, and draws no tab when none is shown or the answer
fails, rather than one leading to a page that cannot be read. Pages beneath a
section — an import under Investigate, a member under History — sit beneath
its address, so its tab stays lit on them.

**`FleetSectionPageDirective<T>`** (`src/app/fleet/scope/`) — the half of a
section page that every one repeats. It resolves the Fleet the address names,
tells a Fleet that does not answer (`MISSING`), a request that failed
(`ERROR`) and a section the reader may not open (`NOT_PERMITTED`) apart, and
only then calls the page's `load(section, query, params)`. A page declares
`_requiredCapabilities`, any one of which opens it — empty where the server
decides, as on Reports — and its `notPermittedMessage`. Each navigation is
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
