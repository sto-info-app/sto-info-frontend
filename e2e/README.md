# End-to-end journeys

Eleven journeys through Custom Tracking, driven in a real browser against a
real backend and a real database, plus three reviews: accessibility (three
cases), responsive layout, and caching headers.

That is sixteen substantive cases. Setup and teardown are not among them.
The picture journey is one of the sixteen and is omitted unless
`E2E_IMAGES=on` is set: a default run skips it and says why, and that skip
is not a pass.

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
E2E_PASSWORD='<the seed password>' \
  E2E_DATABASE_NAME='<the disposable database>' \
  E2E_REDIS_DB='<the Redis logical database>' \
  npm run e2e
```

`E2E_PASSWORD` is the seed password the backend was given —
`DATASEED_USER_PASSWORD` in its environment file — and it is never written
down here. The same password is used for the fixture actors. `E2E_DATABASE_NAME`
and `E2E_REDIS_DB` have to name the database and Redis logical database the
backend is actually using. The harness refuses a different database, a
database that is not on this machine, and any site that is not on localhost.

| Variable              | Default                     | What it is                          |
| --------------------- | --------------------------- | ----------------------------------- |
| `E2E_PASSWORD`        | _required_                  | The seed password.                  |
| `E2E_EMAIL`           | `demo-user-014@example.com` | Who to sign in as.                  |
| `E2E_USERNAME`        | `demo-user-014`             | Their registry name.                |
| `E2E_PUBLIC_ACCOUNT`  | `demo-014-01`               | An STO account of theirs that is public. |
| `E2E_PRIVATE_ACCOUNT` | `demo-014-02`               | One that is not.                    |
| `E2E_BASE_URL`        | `http://localhost:4200`     | Where the browser opens the site.   |
| `E2E_API_URL`         | `http://localhost:3000`     | Where a journey's own requests go.  |
| `E2E_BACKEND_DIR`     | `../sto-info-backend`       | For the support commands.           |
| `E2E_DATABASE_NAME`   | _required_                  | The database this run may use.      |
| `E2E_REDIS_DB`        | _required_                  | The Redis logical database.         |
| `E2E_IMAGES`          | unset                       | `on` to include the picture journey. |
| `E2E_OMIT`            | unset                       | Comma-separated ids for a labelled partial run. |

`npm run e2e:ui` opens Playwright's interactive runner; `npm run e2e:report`
opens the last report. The HTML report is written to
`reports/playwright/html` on every run, including a run that fails.

`E2E_BASE_URL` does not turn this into a harness for a deployed site. The
config still starts `npm start` unless a server is already listening, and
the support commands still use the backend checkout's own database.
`E2E_API_URL` is only for the requests a journey makes itself. It does not
change the API address the Angular application was started with.

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

Before the Custom Tracking journeys, and not before sign-in, the feature is
switched on and that member's tracking data is purged, including any
acceptance. Afterwards their data is purged again, any pictures queued for
deletion are reconciled, and the feature is switched off, because off is how
it is deployed. The account is enabled again on the way out, in case a
journey disabled it and did not reach its own recovery. Signing in does not
do any of that. A project that only needs a session does not purge tracking
data.

The other actors are created by the support command if they are missing.
They are `e2e-member-b@example.com`, an administrator, and three ordinary
members who each hold one Storytime permission: moderation, Spotlight, or
the tag vocabulary. The demonstration member is not given any of those
roles. News, Storytime stories and mail are not created here; the manifest
records them as deferred. Sessions are kept under `reports/playwright/`,
which is gitignored, and the manifest written beside them has no passwords.

Neither step restores a snapshot of what was in the database before the run.
The flag is global, and the retention journey runs the real sweep. Point
this only at a database set aside for it. Both steps go through
`sto-info-backend`'s `npm run e2e:support`, which borrows the backend's own
database connection — this harness never needs credentials of its own, and no
test-only route exists on the running server for anybody to find.

A retry does not run preflight or sign-in again. A case that needs the
agreement still unaccepted, or the account still enabled, or a current
acceptance of its own, arranges that itself. Running one journey file still
runs preflight, sign-in, the Custom Tracking setup and teardown, because the
journeys project depends on them.

A journey cannot, through the browser, switch the feature on, make an
accepted agreement look out of date, make a deletion look 180 days old,
disable the account, or run the retention sweep. That command does those,
and it can say what the member still holds.

## No test-only attributes

There is not one `data-testid` in the application, and these do not add any.
Controls are found by role, label or visible text. The page object also uses
the feature's own panel ids (`#custom-tracking-panel-definitions` and
`#custom-tracking-panel-values`), scopes a form by the heading inside it,
and reads the record picker's `option` elements. Those belong to the screen.

Finding a control by its accessible name is still a test of its own. If a
journey cannot, neither can somebody using a screen reader, and the journey
failing is the right outcome. Renaming a control breaks these, and renaming
a control is a change worth noticing.

## What they cover

Sixteen cases. CT-13 is three tests in one file. CT-04 is omitted unless
`E2E_IMAGES=on`.

| ID    | Case                                                                                    |
| ----- | --------------------------------------------------------------------------------------- |
| CT-01 | Accept the terms, build for accounts, and two records that do not share. Reload keeps them. `journeys/01-account-hierarchy.e2e.ts` |
| CT-02 | A required answer blocks only the record that is missing it. `journeys/02-character-required.e2e.ts` |
| CT-03 | Nothing is published until every gate above it is open. `journeys/03-visibility-chain.e2e.ts` |
| CT-04 | A picture in each shape, replaced and removed. Omitted unless `E2E_IMAGES=on`. `journeys/04-pictures.e2e.ts` |
| CT-05 | A withdrawn choice still reads, and cannot be chosen again. `journeys/05-withdrawn-option.e2e.ts` |
| CT-06 | Moments either side of a clock change survive the round trip. `journeys/06-dates-and-timezones.e2e.ts` |
| CT-07 | Only real YouTube addresses are taken, and nothing loads unasked. `journeys/07-youtube.e2e.ts` |
| CT-08 | A new version of the agreement locks editing and nothing else. `journeys/08-policy-reacceptance.e2e.ts` |
| CT-09 | Deleting hides at once, and the sweep removes for good. `journeys/09-retention.e2e.ts` |
| CT-10 | Disabling the account withdraws everything it published. The account is enabled again. `journeys/10-disabled-account.e2e.ts` |
| CT-11 | Public content is served to anybody. A private account is not found. `journeys/11-crawler.e2e.ts` |
| CT-12 | Origin cache headers are `no-store`, and withdrawing a section takes effect at once. `reviews/caching.e2e.ts` |
| CT-13 | The feature's screens are mechanically accessible. `reviews/accessibility.e2e.ts` |
| CT-13 | The agreement, including the re-acceptance notice, is mechanically accessible. `reviews/accessibility.e2e.ts` |
| CT-13 | A hierarchy can be reordered from the keyboard. `reviews/accessibility.e2e.ts` |
| CT-14 | A wide configuration stays usable on a phone. `reviews/responsive.e2e.ts` |

The accessibility review runs axe over the feature's own markup, not the
site frame. The responsive review builds a deliberately wide configuration
with long names and checks that nothing forces the page to scroll sideways
on a phone. The caching review checks the origin headers. It does not claim
to prove Render or Cloudflare edge behaviour.

## Reading a failure

Failures leave a trace under `reports/playwright/artifacts`. Open it with:

```bash
npx playwright show-trace reports/playwright/artifacts/<the failing test>/trace.zip
```

It plays the whole run back with the DOM at every step, which is almost always
quicker than adding logging and running it again.
