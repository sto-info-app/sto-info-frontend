# Custom Tracking (frontend)

Custom Tracking lets a signed-in user define their own sections, tabs and
fields once for all of their STO Accounts, or once for all of their STO
Characters, and then record a separate value for each Account or Character.

Definitions are built in **Settings** and nowhere else: what to record, in what
order and who may see it are decisions about every record at once.

Values may be recorded from two places, using one editor. Settings offers the
editor with a chooser for picking a record; an Account or Character detail page
offers the same editor with the record it is already about handed in, so the
fields, the required check and the whole-record save behave identically either
way.

The backend contract, including the field catalogue, the limits and the
visibility rules, lives in `docs/custom-tracking.md` in the backend repository.
This document covers only what is specific to the interface.

## Where things live

```text
src/app/dashboard/settings/custom-tracking/
├── custom-tracking.service.ts             the API client
├── custom-tracking-settings.component     the page, its gate and its panels
├── custom-tracking-agreement/             the content agreement gate
├── values/
│   ├── custom-tracking-values.component        the value editor
│   ├── custom-tracking-value.utility           form to answer and back
│   ├── custom-tracking-value-form.factory      the controls one field needs
│   ├── custom-tracking-value-field/            one field, drawn for its type
│   ├── custom-tracking-image-value/            the picture on an image field
│   └── custom-tracking-image-dialog/           choosing and cropping one
└── definitions/
    ├── custom-tracking-definitions.component   the builder
    ├── custom-tracking-field-settings.*        which settings each type has
    ├── custom-tracking-definition-filter.*     search across the hierarchy
    ├── custom-tracking-deletion-message.*      what a confirmation says
    ├── custom-tracking-reordering.*            moving and dragging
    ├── custom-tracking-reorderable.directive   one row of an orderable list
    ├── custom-tracking-group-panel/            a section or a tab
    ├── custom-tracking-group-form/             the form behind either
    ├── custom-tracking-field-panel/            one field, summarised
    ├── custom-tracking-field-form/             the form behind a field
    ├── custom-tracking-options-editor/         the answers a choice offers
    └── custom-tracking-reorder-controls/       move up and move down
src/app/dashboard/custom-tracking/
└── custom-tracking-owner-panel/           the block on an owner's own pages:
                                           what is recorded, or the editor
src/app/shared/custom-tracking/
├── custom-tracking-configuration.service  the served configuration, cached
├── custom-tracking-display.models         one shape both audiences are drawn from
├── custom-tracking-display.builder        owner record or projection into it
├── custom-tracking-display.utility        how each type is written out
├── custom-tracking-time.utility           timezones, instants and video addresses
├── custom-tracking.testing                fixtures the specs share
├── custom-tracking-display/               sections, tabs and their fields
└── custom-tracking-display-field/         one field's answer, read-only
src/app/models/custom-tracking.models.ts
src/app/shared/a11y/roving-tabs.utility.ts     arrow keys along a tab row
src/app/shared/guards/unsaved-changes.guard.ts leaving with work in hand
src/app/shared/media/youtube-embed.utility.ts  the only route to an iframe source
src/styles/_custom-tracking.scss
```

The route is `/dashboard/settings/custom-tracking`, reached from a Custom
Tracking panel on the Settings page.

## One partial, not a stylesheet per component

Every class the feature uses is defined in `src/styles/_custom-tracking.scss`
and prefixed `custom-tracking-`, the same arrangement Storytime uses. The
builder, the value editor and the detail pages are built from the same handful
of shapes — a heading bar, a list of what is inside it, a form, a row of
badges — and holding them together is what keeps them recognisably one thing.

The feature defines no buttons or fields of its own. A button is `.lcars-btn`
with a colour class, a text field is `.lcars-input-container`, a chooser is
`.lcars-select-container` and a switch is `<app-lcars-toggle>`.

## The whole scope is loaded at once

The builder reads `GET /custom-tracking/scopes/:scope/definitions`, which
returns every section with its tabs and their fields.

That is what the search box searches. A search able to see only the branches
somebody had already opened would quietly miss what it was asked for, and the
user would conclude the field had gone. Counting and reordering are done
against that same whole hierarchy rather than against whatever a search is
currently showing, so moving the second of two visible tabs in a section that
really holds nine cannot send an order describing nothing.

Every change is sent and the hierarchy is then read again rather than patched
in place. The server renumbers orders, refuses duplicate names and normalises
configuration, so what it says afterwards is what is true.

## A record is loaded whole and saved whole

The value editor reads
`GET /custom-tracking/scopes/:scope/targets/:targetId/record`, which answers
with the definitions applying to that Account or Character _and_ what has been
recorded against them. They travel together so the form cannot be drawn from
one version of the hierarchy and filled from another.

Saving sends every field the form draws in one `PUT` to the same address. The
rule that a required field must be answered is a statement about the record
rather than about one control: saving field by field would let a record come to
rest half-written, which is the state that rule exists to prevent. The server
writes it in one transaction, so a refusal anywhere leaves everything as it
was. The response is the record as it now stands, and it is what the form is
redrawn from — asking for it again would be a second request for something
already in hand.

The required check is made here as well, before anything is sent, so somebody
is told _which_ fields are missing rather than having a save refused.

### Pictures are the exception

A picture never travels in a record. It arrives as an upload and is checked as
bytes before anything is stored, so it lands the moment it is uploaded and the
record save neither adds one nor takes one away. Accepting an image identifier
in a value would let a caller point a field at any picture in the account,
which is why the server refuses one outright.

The cropper is locked to the shape the field was configured with, and the
shape, the minimum size, the encoding and the delivery variant all come from
`GET /custom-tracking/configuration`. The description is asked for in the
cropper, because that is the one moment somebody is certainly looking at the
picture.

### Absence is not the same as an empty answer

Every control distinguishes "no answer" from an answer that happens to be
empty, zero or false, because the server stores the two differently and a
reader sees different things.

Emptying a box clears the answer. Where a control cannot be emptied — a switch,
a tick box — what it is set to and whether it has been set are held in separate
controls, and a "Leave unanswered" button takes the answer away without
recording a `no`. A slider is answered through the exact-value box beside it,
which can be emptied.

## Unsaved work is not thrown away quietly

A half-filled record is work. Changing scope, changing record and leaving the
route all ask first, through one shared confirmation
(`shared/guards/unsaved-changes.guard.ts`) so the question is worded the same
however somebody is about to leave. The route guard cannot see a closed tab or
an address typed over the top, so `beforeunload` is cancelled as well.

## Nothing is deleted without saying what goes with it

Deleting reads the counts first — tabs, fields and answers recorded against
them — and puts them in the confirmation. "Delete this section" and "delete
this section, four tabs, nineteen fields and sixty-three recorded answers" are
different decisions, and only one of them is the one being made.

The answers are named separately from the definitions because they are the
part that cannot be typed again. Withdrawing a choice is the exception and is
never confirmed: it is always soft, a value that already chose it keeps reading
correctly, and only new selections are refused.

## Showing values on a detail page

Four surfaces show them and none of them can edit: the owner's own account and
captain pages under the dashboard, and the two public registry pages. They
share `custom-tracking-display` and `custom-tracking-display-field`, because
the question is the same on all four — what does this field say — and two
renderers would mean the one exercised less would drift.

What differs is where the data comes from, and that difference is the whole
security model:

- **The owner** gets their record from
  `GET /custom-tracking/scopes/:scope/targets/:id/record`, the same call the
  editor makes, and `displayFromRecord` applies their own empty rule.
  `custom-tracking-owner-display` does the fetching so that neither page has to.
- **A visitor** gets `customSections` with the registry account or captain
  response itself. The server has already applied the whole visibility chain
  and the public empty rule, so `displayFromPublic` has nothing left to decide.
  There is no route a visitor can call to ask for more.

A read-only component rather than a read-only mode of the editor. A mode is a
flag somebody can get wrong; this way there is no control to hide.

Nothing at all is drawn where nothing was permitted — no heading, no empty
state. A member who has published none of their own tracking and one who has
published some and kept it private must look identical from outside, and an
empty state would be the one difference that told them apart.

### What each type looks like

`answerShape` sorts the twenty-seven types into eight ways of drawing them, so
the template asks one question instead of testing the type in six places. Most
land on `text` and go through `answerText`; the rest are Markdown, a set of
labels, a rating, a progress reading, a colour swatch, a picture and a video.

Two things are read from the server rather than assembled here: a palette
colour is painted through the custom property the configuration names, and a
picture is fetched through the delivery variant it names for the shape. Where
the configuration has not arrived the colour is still named and the picture is
simply absent — a guessed variant produces a broken picture and no error
anybody would notice.

### No player is loaded until somebody presses play

A YouTube field shows a still image with a play button over it. The iframe is
created only when a reader presses it, so simply reading somebody's captain
page does not load the player, and none of the cookies and scripts a player
brings with it.

Be precise about what that does and does not claim. The still itself is fetched
from Google's thumbnail host as the page loads, which sets no cookies but does
tell Google that somebody at that address opened the page. That is the same
bargain Storytime already makes; changing it would mean proxying or storing
thumbnails ourselves, which is a larger decision than this feature should take
on its own. An earlier draft of the Privacy Policy wording said nothing reached
YouTube until play was pressed, and that was wrong — the end-to-end journey
that checks the player is absent is what caught it.

The address is built and marked trusted by
`src/app/shared/media/youtube-embed.utility.ts`, which Storytime's media embed
uses too. It is the only place in the application where a stored string becomes
an iframe source, and it refuses anything that is not an HTTPS YouTube embed —
including an identifier that is not eleven characters of one.

## The server is authoritative

Field types, the structural ceilings and the colour palette all come from
`GET /custom-tracking/configuration` rather than from constants compiled into
this application.

That is deliberate. Each is something the backend decides, and a second copy
here would be a second statement of it that could disagree — which reaches a
user as a form that accepts what the server then refuses. The configuration
describes the shape of the feature rather than anybody's data, so it is fetched
once and shared between every panel.

The same reasoning applies to validation. The interface checks what it can so a
user is told early, but the server checks everything again and is the one that
decides.

## Colours

A colour field's value stores a palette **name** — a token such as
`LCARS_SUNFLOWER` — wherever one of the site's own colours fits, and a
`#RRGGBB` or `rgba()` literal only where none does.

Rendering goes through the CSS custom property the configuration names, not
through a colour copied out of it. That is what makes a value recorded against
a palette colour follow the palette if it is ever adjusted; a resolved literal
would be left behind.

The properties are published by `src/styles/_lcars-palette-properties.scss`,
which reads them from `_lcars-variables.scss`. The stylesheet remains the only
place any LCARS colour is written down.

## Reordering

Every reorder sends the whole ordered list of siblings, matching the API.

A request naming one item and a position could ask for an order whose
consequences nobody can see — two items sharing a place, or an item put beyond
its collection. A complete list either describes the collection exactly or does
not, and the server says which.

Drag-and-drop is never the only way to reorder. Every collection also offers
move-up and move-down controls, which are what make reordering possible by
keyboard and reliable on a touch screen.

## Field types are permanent

A field's type is chosen once. It decides how every value already recorded
against it is stored, validated and rendered, so changing it would reinterpret
data the user cannot get back.

The interface never sends a type when changing a field, and says plainly that
asking a different question means making a new field and retiring the old one.
The server refuses a request naming a type rather than ignoring it, so sending
one would turn an ordinary rename into an error.

## The content agreement

Nothing may be created until the current agreement is accepted, and a material
change to the wording pauses creating and editing until it is accepted again.

Reading is never gated. A user whose acceptance has been superseded keeps full
sight of everything they have already recorded, and the re-acceptance panel
says so — leaving it unsaid would make a wording change look like data loss.

The tick box is never preset, and the version displayed travels with the
acceptance so the record says which wording was agreed.

## How it is tested

The unit suites cover every component and utility to the project's usual
hundred per cent, and they run in `npm test` like everything else.

On top of them there are eleven end-to-end journeys in `e2e/`, run in a real
browser against a real backend and a real database. They are separate from
`npm test` and are not run by `npm run verify`, because they need a stack up;
`e2e/README.md` says what and how.

They exist because the questions worth asking about this feature span the two
halves of it. Whether a value recorded against one account stays off another,
whether a deleted choice still reads, whether making something private takes
effect at once for a stranger — none of those can be answered by a component
test with a stubbed service, because the stub answers them the way it was
written to.

Two things follow from that which are worth knowing before changing anything
here:

- **There are no test-only attributes.** Not one `data-testid` in the
  application, and the journeys add none. Everything is found by role, label or
  visible text, so a control that cannot be described by its accessible name
  fails the journeys as well as the accessibility review. Renaming a control
  breaks them, which is the point: renaming a control is a change worth
  noticing.
- **The journeys found real faults.** The recording panel used to load once and
  never again, so building your first section and switching to it said you had
  defined nothing; and Edit on a folded panel opened a form inside the folded
  part, so it appeared to do nothing at all. Both were fixed, and both are now
  covered by unit tests as well.

Alongside the journeys sit three reviews, in `e2e/reviews`: axe over every
state the feature has, a deliberately wide configuration checked for sideways
scrolling on a phone, and the caching headers on the published projection.
