# UI Components

Custom shared components used throughout the frontend. These are all standalone Angular components that live in `src/app/shared/components/`.

---

## LCARS Toggle Components

The app provides three toggle components, each implementing a different visual style aligned with the LCARS (Library Computer Access/Retrieval System) aesthetic from Star Trek. All three are functionally equivalent — they wrap a boolean value and integrate with Angular reactive forms via `ControlValueAccessor`.

Choose based on the available space and how much visual weight you want the toggle to carry.

### Common API

All three components share the same form integration pattern:

```html
<!-- Reactive forms -->
<app-lcars-toggle-* formControlName="myBoolField"></app-lcars-toggle-*>

<!-- Template-driven -->
<app-lcars-toggle-* [(ngModel)]="myBoolValue"></app-lcars-toggle-*>
```

All three support `setDisabledState` (called automatically by Angular when the form control is disabled).

---

### Option A — Pill (`app-lcars-toggle-pill`)

**File:** `src/app/shared/components/lcars-toggle-pill/`

A single pill-shaped button matching the width of its label. Changes color when toggled. Mirrors the shape language of the existing `lcars-btn` navigation buttons.

| State | Background | Text |
|---|---|---|
| Off | `$lcars-cardinal` (red) | White |
| On | `$lcars-green` (green) | Black |

**Inputs:**

| Input | Type | Description |
|---|---|---|
| `label` | `string` | Button label text. Renders on one line — no wrapping. |
| `ariaLabel` | `string` | Overrides the accessible label if different from `label`. |

**Usage:**

```html
<app-lcars-toggle-pill
  formControlName="lifetimeSubscription"
  label="Lifetime Subscription"
  ariaLabel="Lifetime Subscription">
</app-lcars-toggle-pill>
```

**Notes:**

- The pill sizes to its content (`width: max-content`), so no fixed widths are needed.
- Left padding is intentionally larger than right (`28px` vs `22px`) to account for the pill's rounded left edge and give the text breathing room.
- Text is bottom-right aligned (`align-items: flex-end; justify-content: flex-end`) to match the LCARS button aesthetic.
- The default off color is red (cardinal), which reads as "inactive/disabled" — consider whether that framing fits your field before using this component.

---

### Option B — Delta Indicator (`app-lcars-toggle`)

**File:** `src/app/shared/components/lcars-toggle/`

A compact inline toggle: a Star Trek delta insignia icon on the left acts as a status indicator, with the label text immediately to its right. The whole thing is a single button. Takes the least horizontal space of the three.

| State | Delta icon | Label text |
|---|---|---|
| Off | Dim white (15% opacity) | Dim white (30% opacity) |
| On | `$lcars-green` with glow | Bright white (80% opacity) |

**Inputs:**

| Input | Type | Description |
|---|---|---|
| `label` | `string` | Label text displayed next to the icon. |
| `ariaLabel` | `string` | Overrides accessible label if needed. |

**Usage:**

```html
<app-lcars-toggle
  formControlName="publiclyVisible"
  label="Publicly Visible"
  ariaLabel="Publicly Visible">
</app-lcars-toggle>
```

**Notes:**

- Requires the **Font Awesome Kit** to be loaded. The delta icon uses the custom kit class `fa-kit fa-star-trek-delta`. If the kit fails to load (e.g. in a local environment where the kit ID is not set), the icon will not render but the component will still function.
- The glow effect is a CSS `drop-shadow` filter on the `<i>` element, not a `box-shadow`. This is intentional — `box-shadow` does not follow the icon's shape; `drop-shadow` does.
- Label uses `white-space: nowrap` to prevent line breaks.

---

### Option C — Selector Pair (`app-lcars-toggle-selector`)

**File:** `src/app/shared/components/lcars-toggle-selector/`

Two adjacent pill segments (left and right, connected with a 2px gap). One segment is always "active" (colored), the other is always dim. Clicking either segment sets the value directly. Useful when the off and on states have distinct named meanings (e.g. "PRIVATE" / "PUBLIC").

| Segment | Active background | Active text | Inactive |
|---|---|---|---|
| Off (left) | `$lcars-cardinal` (red) | White | Dark, dim |
| On (right) | `$lcars-green` (green) | Black | Dark, dim |

**Inputs:**

| Input | Type | Default | Description |
|---|---|---|---|
| `offLabel` | `string` | `'OFFLINE'` | Label for the left (false/off) segment. |
| `onLabel` | `string` | `'ACTIVE'` | Label for the right (true/on) segment. |
| `ariaLabel` | `string` | `''` | Accessible label for the `role="group"` wrapper. |

**Usage:**

```html
<app-lcars-toggle-selector
  formControlName="publiclyVisible"
  offLabel="PRIVATE"
  onLabel="PUBLIC"
  ariaLabel="Publicly Visible">
</app-lcars-toggle-selector>
```

**Notes:**

- Both segments are always visible and colored — one active, one dim. There is no "neutral" state.
- The left segment gets a rounded left edge only; the right segment gets a rounded right edge only. The 2px gap between them is intentional — it gives the segments visual separation while keeping them clearly grouped.
- Clicking the already-active segment does nothing (guarded in `select()`).
- The `role="group"` on the wrapper and `aria-pressed` on each button are the correct ARIA pattern for a binary segmented control.

---

## Choosing a component

| Situation | Recommended |
|---|---|
| Tight on horizontal space, subtle indicator preferred | Option B (delta) |
| Binary toggle where off/on have distinct named states | Option C (selector pair) |
| Single prominent toggle that needs to command attention | Option A (pill) |

---

## Shared implementation details

All three components:

- Are **standalone** with `ChangeDetectionStrategy.OnPush`.
- Implement `ControlValueAccessor` using `forwardRef` and `NG_VALUE_ACCESSOR`.
- Call `cdr.markForCheck()` in `writeValue` and `setDisabledState` to work correctly with OnPush.
- Use `role="switch"` (Options A and B) or `role="group"` + `aria-pressed` (Option C) for accessibility.
- Import `$lcars-variables` via the project-wide SCSS include path (`src/styles`) — no relative path needed.
