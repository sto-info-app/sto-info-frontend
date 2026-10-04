# End-to-end journeys

Eleven journeys through Custom Tracking, driven in a real browser against a
real backend and a real database, plus an accessibility and a responsive
review.

They are kept apart from `npm test`. The unit suites answer whether each piece
behaves; these answer whether the pieces, the server and the database agree —
and that is a question a mock cannot be asked, because a mock answers it the
way it was written to.

## What they need running

| Thing        | Where            | Why                                                |
| ------------ | ---------------- | -------------------------------------------------- |
| PostgreSQL   | as `.env` says   | Everything is really stored and really read back.   |
| Redis        | as `.env` says   | The backend will not start without it.              |
| The backend  | `localhost:3000` | `npm run start:dev` in `sto-info-backend`.          |
| The frontend | `localhost:4200` | Started for you unless one is already there.        |

The backend repository must be checked out beside this one with its
dependencies installed. Set `E2E_BACKEND_DIR` if it is somewhere else.

## Running them

```bash
E2E_PASSWORD='<the seed password>' npm run e2e
```

`E2E_PASSWORD` is the only thing you have to supply. It is the seed password
the backend was given — `DATASEED_USER_PASSWORD` in its environment file — and
it is never written down here. Nothing else needs configuring for a standard
local checkout.

| Variable              | Default                     | What it is                          |
| --------------------- | --------------------------- | ----------------------------------- |
| `E2E_PASSWORD`        | _required_                  | The seed password.                  |
| `E2E_EMAIL`           | `demo-user-014@example.com` | Who to sign in as.                  |
| `E2E_USERNAME`        | `demo-user-014`             | Their registry name.                |
| `E2E_PUBLIC_ACCOUNT`  | `demo-014-01`               | An STO account of theirs that is public. |
| `E2E_PRIVATE_ACCOUNT` | `demo-014-02`               | One that is not.                    |
| `E2E_BASE_URL`        | `http://localhost:4200`     | Where the site is.                  |
| `E2E_API_URL`         | `http://localhost:3000`     | Where the API is.                   |
| `E2E_BACKEND_DIR`     | `../sto-info-backend`       | For the support commands.           |
| `E2E_IMAGES`          | unset                       | `on` to include the picture journey. |

`npm run e2e:ui` opens Playwright's interactive runner; `npm run e2e:report`
opens the last report.

### Public pages, without the password

`e2e/public` holds checks of pages a stranger sees, such as Help (FC-048).
They sign in as nobody, so they need no password and run on their own:

```bash
npx playwright test --project=public
```

### Fleet Community, as people made for the run

`e2e/fleet` (FC-044) drives Fleet Community as six people the backend makes
for the run — an Owner, an applicant, a friend, an Officer, a stranger and a
site admin — and removes, with everything they made, when it ends. Nobody's
password is needed and no real member's data is touched:

```bash
npx playwright test --project=fleet-desktop --project=fleet-mobile
```

- `fleet-setup` runs the backend's `e2e:support fleet-begin`. It clears any
  earlier run, switches Fleet Community on, and makes the people with
  passwords generated there. It writes them to
  `reports/playwright/.fleet-people.json`, which git ignores, and signs each
  in through the login form. Their addresses are at `fc044.example`, a domain
  the backend never mails, so signing in sends nobody anything.
- `fleet-desktop` runs every journey at 1280px, then `fleet-mobile` runs them
  again on a phone (Pixel 7), each on Communities of its own.
- `fleet-teardown` runs `fleet-finish`, which removes the people and
  everything they made and puts the switch back as it was found, and checks
  that nothing of theirs is left.
- Each journey file starts by removing the people's Communities
  (`fleet-clear-communities`), keeping the people: an Owner may hold ten,
  closed ones included, and desktop and phone together register more.
- A test that refreshes a person's session saves it back to their file when
  it ends. An access token lasts an hour and each refresh retires the refresh
  token used, so without that every test after the first hour was signed
  out. A session that was signed out or revoked is not saved.
- `E2E_FLEET_KEEP=1` skips the teardown, leaving the people and what they
  made to look at after a failed journey; the next run's setup removes them
  first. `E2E_BACKEND_DIR` names the backend checkout when it is not a sibling
  called `sto-info-backend`, as in a worktree.
- Each Fleet project retries a failed test once: the local dev server now and
  then refuses one script on a fresh page's first burst. A test that passes
  only on its retry is reported as flaky, so it is still seen. A retry runs its
  serial group again from the top, under names ending ` r1`.
- Run the backend built (`npm run build`, then `npm start`) rather than with
  `start:dev` for a long run: its watcher restarts the API on file events that
  change nothing (antivirus scanning, on this machine), and twice stopped a
  journey halfway. The scan worker and the frontend can stay as they are.
- The checks for FC-035's transcripts, FC-038's erasure and FC-040's private
  images need secrets the local stack does not hold, and are left out.

The journeys:

| File | What it covers |
| --- | --- |
| `01-registration-to-moderation` | A Community, a Fleet, an Armada and a Fleet nobody runs registered; a roster imported; an applicant accepted; an event answered; a chat; a report decided; a suspension |
| `02-help-and-navigation` | Help to every section and guide, and every page a Fleet guide links to; Settings and its guide; Community and the Dashboard to Fleets; following nothing, several, signed out, switched off, and the systems not answering |
| `03-accessibility` | axe (WCAG 2.1 A and AA) on every Fleet, chat, settings, Help and site admin page; tabs and a dialog by keyboard; nothing moving under reduced motion |
| `04-owed-news-activity` | The signed-in checks FC-027, FC-029 and FC-049 left owed: a scoped post drafted, given a cover, published, found, kept from strangers, renamed, unpublished and deleted; the Activity it makes; Settings' help links and back |
| `04-owed-events` | FC-028 and FC-030's: weekly and monthly events and their previews, audiences, places and the waiting line, reminders, a moved and a cancelled occurrence, attendance once one is under way, the change log, the dashboard and the reports |
| `04-owed-chat` | FC-031 to FC-035's: channels added, renamed, archived and refused, mentions and replies and their notices, direct messages, presence, typing, a block, toasts, and a report's evidence and removal |
| `04-owed-admin` | FC-036, FC-037, FC-039 and FC-041's: suspensions, disputes, investigations, holds, roles, disabled accounts, report decisions, the Security Log, Scan Diagnostics and rescan campaigns |
| `05-screenshots` | Representative pages at each size, written to `docs/screenshots/fc-044/` |

## The picture journey is opt-in

Journey 4 uploads real files. They are scanned by a third-party service and
stored in Cloudflare Images, both against whatever accounts the local
configuration points at, which costs quota and leaves objects behind until the
journey removes them. So it is skipped unless `E2E_IMAGES=on` is set. Every
other journey stays inside this machine.

## How they are set up and put back

A seeded demonstration member is used rather than one created here: they
already have several STO accounts and captains, which most of these journeys
need and which would otherwise mean duplicating the seeding migration's
knowledge of factions, species and classes.

Before the run, the feature is switched on and that member is put back to never
having used it. Afterwards their data is cleared again and the feature switched
back off, because off is how it is deployed. Both go through
`sto-info-backend`'s `npm run e2e:support`, which borrows the backend's own
database connection — this harness never needs credentials of its own, and no
test-only route exists on the running server for anybody to find.

Three things cannot be done through the browser, and they are the only reason
that command exists: switching the feature on, making an accepted agreement
look out of date, and making a deletion look 180 days old.

## No test-only attributes

There is not one `data-testid` in the application, and these do not add any.
Everything is found by role, label or visible text.

That is a test of its own. If a journey cannot find a control by its accessible
name, neither can somebody using a screen reader, and the journey failing is
the right outcome. It also means the interface can be restyled freely: only
renaming a control breaks these, and renaming a control is a change worth
noticing.

## What they cover

| #  | Journey                                                                 |
| -- | ----------------------------------------------------------------------- |
| 1  | Accept the terms, build for accounts, and two records that do not share. |
| 2  | A required answer blocks only the record that is missing it.             |
| 3  | Nothing is published until every gate above it is open.                  |
| 4  | A picture in each shape, replaced and removed. _(opt-in)_                |
| 5  | A withdrawn choice still reads, and cannot be chosen again.              |
| 6  | Moments either side of a clock change survive the round trip.            |
| 7  | Only real YouTube addresses are taken, and nothing loads unasked.        |
| 8  | A new version of the agreement locks editing and nothing else.           |
| 9  | Deleting hides at once, and the sweep removes for good.                  |
| 10 | Disabling the account withdraws everything it published.                 |
| 11 | Public content is served to anybody, and private content to nobody.      |

And two reviews: `reviews/accessibility.e2e.ts` runs axe over every state the
feature has and checks that reordering works from the keyboard;
`reviews/responsive.e2e.ts` builds a deliberately wide configuration with long
names and checks that nothing forces the page to scroll sideways on a phone.

## Reading a failure

Failures leave a trace under `reports/playwright/artifacts`. Open it with:

```bash
npx playwright show-trace reports/playwright/artifacts/<the failing test>/trace.zip
```

It plays the whole run back with the DOM at every step, which is almost always
quicker than adding logging and running it again.
