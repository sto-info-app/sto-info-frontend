import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import { guideSection } from './help-section';
import { HelpGuide, HelpTopic } from './help.models';

/**
 * The guides to running the site, for its administrators (FC-050): reports and
 * holds, disputes, roster erasure, the Security Log, picture scanning and,
 * from FC-045, the feature switches. Each follows the same six parts as the
 * Fleet guides.
 */
const SITE_ADMIN_GUIDES: HelpGuide[] = [
  {
    slug: 'site-admin-reports-and-holds',
    title: 'Reports and moderation holds',
    summary:
      'Working the Reported Officers and Chat Reports queues, and keeping chat evidence with a moderation hold.',
    sections: [
      guideSection('What it is for', [
        'Members report to the site’s administrators in two queues: Reported Officers, for reports about a member, and Chat Reports, for a message reported in Fleet chat. A report changes nothing until a site administrator decides it.',
        'Moderation Holds keeps chat evidence past its ordinary deletion while a case is still open.',
      ]),
      guideSection('Who can use it', [
        'Site administrators only. A Fleet’s own Owner, Admins and Officers never see these queues or what a hold keeps. The administrator role is set outside STO Info.',
      ]),
      guideSection('Where to find it', [
        'Choose Admin in the side bar. Reported Officers, Chat Reports and Moderation Holds are under Community, whose heading counts the open reports in both queues. When one member has open reports in both, each queue links to the other.',
      ]),
      guideSection(
        'How to work Reported Officers',
        [
          'It opens on Open reports, longest-waiting first, and shows the first twenty that match. Search by username matches the reporter or the reported member; press Apply.',
          'Each report shows who was reported and why, and who raised it and when. Its buttons:',
        ],
        [
          'Mark as under review — claims it, so others can see somebody is on it. It asks for no reason and decides nothing.',
          'Close as actioned — closes it as upheld. Their account is not touched.',
          'Dismiss report — closes it with no action taken.',
          'Hold their chat messages — places a moderation hold on everything they wrote in chat.',
          'Disable this account — signs them out at once, keeps them from signing in again, takes their record out of the registry, and closes every open report about them, member and chat alike, as actioned. They are not told why. Restore this account undoes it; reports already closed stay closed.',
          'All but Mark as under review ask for a Reason, up to 500 characters. A closed report keeps only the hold and account buttons.',
        ],
      ),
      guideSection(
        'How to work Chat Reports',
        [
          'It opens on Open reports, longest-waiting first, twenty to a page. Status also offers Actioned, Dismissed and All reports. There is nothing to claim.',
          'Each report says Where the message was — a channel in a Community, Fleet or Armada, or a direct message — who reported it, and why. Show evidence opens a copy of the reported message and the twenty before it, taken when the report was made. Once the report is closed, it also shows who closed it and why. Its buttons:',
        ],
        [
          'Resolve or Dismiss — closes it, as actioned or with no action, asking “What was found or done, and why”, up to 1,000 characters.',
          'Remove the message — asks “Why”, up to 500 characters. Everybody in the chat then sees “Message removed by a moderator” in its place; the evidence keeps what it said. It stays offered after the report is closed.',
          '“Hold” with the author’s name — holds everything the author wrote in chat.',
          'Hold this evidence…, inside the evidence — keeps this report’s evidence past its 90 days.',
        ],
      ),
      guideSection(
        'How moderation holds work',
        [
          'A hold keeps a chat report’s evidence, which otherwise goes 90 days after the report closes, or everything one member wrote in chat, direct messages included, which otherwise goes after 45 days. One hold can be in force on each report and on each member. Whoever places it is its Owner, and its review date is 180 days ahead.',
          'On Moderation Holds, Show lists the holds In force, Released or All holds, those due for review first. Each has:',
        ],
        [
          'Read what it keeps — asks for your Purpose, 10 to 500 characters, which is logged with every page you read.',
          'Show its log — every placing, extension, release, reading and notice, with who and why.',
          'Extend — asks for a new Review on date, no more than 180 days away, and a Reason.',
          'Release — asks for a Reason. What it kept goes with the next purge, as if it had never been held.',
        ],
      ),
      guideSection('How a hold is reviewed', [
        'When a hold’s review date passes, its card says Review due and its Owner is told in the site (every site administrator is, if the Owner no longer is one). Seven days before release, every site administrator is told. No notice names the person held.',
        'Fourteen days after the review date, unless it is extended first, STO Info releases it, and its log says so. Every hold in force shows that date under Released automatically. Extending starts all this again from the new date.',
        'A closed account whose chat messages are held is kept back from erasure until the hold is released.',
      ]),
      guideSection('Who can see it', [
        'Neither the reporter nor the reported member is told what happens to a member report. Somebody who reports a chat message is thanked, and never told the outcome. A member whose account you disable is not told why, and a removed message’s author is not shown your reason.',
        'What a hold keeps is read on Moderation Holds alone. Closing a report, removing a message, disabling or restoring an account, and every hold placed, extended, released or read all appear in the Security Log with your reason or purpose.',
      ]),
      guideSection('When something goes wrong', [
        '“A hold on that is already in force.” means it is held already: extend that hold instead.',
        '“That message is already gone.” means its author or a moderator deleted it first. The evidence still has what it said.',
        '“This report is already closed.” means another administrator closed that chat report first. Neither queue offers a way to reopen a closed report.',
        'While Fleet chat is switched off, nobody can report a new message, but Chat Reports and Moderation Holds keep working.',
      ]),
    ],
    relatedLinks: [
      { label: 'Reported Officers', route: APP_ROUTES.ADMIN_REPORTS },
      { label: 'Chat Reports', route: APP_ROUTES.ADMIN_CHAT_REPORTS },
      { label: 'Moderation Holds', route: APP_ROUTES.ADMIN_HOLDS },
      { label: 'Security Log', route: APP_ROUTES.ADMIN_SECURITY_LOG },
    ],
  },
  {
    slug: 'site-admin-disputes-and-investigations',
    title: 'Fleet disputes and investigations',
    summary:
      'Settling who owns a Community, suspending or closing what is in it, and looking into a Fleet’s imports with a purpose.',
    requiresFeature: 'FLEET',
    sections: [
      guideSection('What it is for', [
        'Sometimes a Community’s Owner vanishes, two groups register the same Fleet, or a Community is reported. Members raise a dispute through Contact us; there is no dispute form on the site.',
        'A Community’s Site administration page is where you settle it: moving ownership, suspending, reinstating or closing the Community or any Fleet or Armada in it, and looking into one of its Fleets’ imports.',
        'Fleet Investigations, on the Admin page, is the record of every such look.',
      ]),
      guideSection('Who can use it', [
        'Site administrators only. A Community’s Owner and Admins have their own Manage page, but are never offered Site administration.',
      ]),
      guideSection('Where to find it', [
        'On the Admin page, under Community, choose Fleet Disputes and search for the Community by name or web address; every Community is listed, whoever may see it. Its name opens its Site administration page. From a Community page you can open, Manage then Site administration leads to the same place. The page starts with the Community’s Owner, its Admins and any Open offer of ownership.',
        'Fleet Investigations is under Community on the Admin page, which you reach by choosing Admin in the side bar.',
      ]),
      guideSection('How to read competing registrations', [
        'Its Fleets and Armadas lists each Fleet and Armada in the Community. Under each is every registration of the same exact name on the same platform, private ones included, with this one first.',
        'Community, Its Owner, Registered, Last import, Members, Seen by and Status say where each came from. STO Info cannot tell who leads a Fleet or an Armada in the game, and the page says so: none is shown as the real one, and the facts are there for you to weigh.',
      ]),
      guideSection('How to move ownership', [
        'Under Move ownership, choose the New Owner from the Community’s Admins, write a Reason and press Move ownership…, then Move it. Nobody is asked to accept.',
        'The former Owner holds no role afterwards, though the new Owner may appoint them again. Any open offer of ownership is withdrawn.',
        'Ownership can only move to one of the Community’s Admins. If it has none, the page says so. Nobody may own more than ten Communities, closed ones included, so an Admin who already owns ten cannot take it.',
      ]),
      guideSection('How to suspend, reinstate and close', [
        'Suspend… beside a Fleet or Armada, or under Suspend this Community, asks for a Reason. What is suspended stays readable, and nothing in it may change — no posts, imports, events or roles — until it is reinstated. Suspending a Community suspends everything in it.',
        'A suspension ends nothing. Roles, members and events stand, and come back into force when it is reinstated. Reinstate… lifts it, with another reason.',
        'Close… beside a Fleet or Armada, or under Close this Community, asks you to type its name and say Why, then Close it. Closing ends every role and delegated capability there, and cannot be undone. Its history, members and pictures are kept. A closed Fleet leaves its Armada, and a closed Armada’s Fleets all leave it.',
        'An Armada’s Owner can also close it from the Armada’s own Manage page, giving a reason in the same way. Either way the reason is kept with its history.',
      ]),
      guideSection('How to look into a Fleet’s imports', [
        'Beside a Fleet, Look into its imports… asks for a Purpose of 10 to 500 characters, then takes you to the Fleet’s Investigate page.',
        'For 24 hours you can read its Roster imports, Conflicting exports, Roster identities, Former names and Rank order, and change nothing. Each page says: “You are looking in as a site admin: you can read this, and change nothing. Your look, and why, is logged.”',
        'The look reaches that Fleet, and its Community’s pages, and nowhere else. There is still no way to see a raw roster file.',
        'Fleet Investigations lists every look by every site administrator, newest first: When, Who, Fleet, Purpose and Until. While a look runs, its Fleet links back to the Investigate page; once it has run out, it is marked ended. To look again, give a new purpose from Site administration.',
      ]),
      guideSection('How to act on one member', [
        'You cannot suspend a single member of a Fleet. That belongs to whoever holds Manage members in that Fleet, who suspends and reinstates a member with a reason.',
        'Your own tool for one person is site-wide: disabling their account, from Reported Officers or Manage Members.',
      ]),
      guideSection('Who can see it', [
        'Moving ownership, suspending, reinstating and closing are kept in the history of the Community, Fleet or Armada, with your reason, where its Owner and Admins can read it.',
        'The new Owner is sent a notice that the Community is now theirs, and the Owner and Admins of whatever you suspend or reinstate are sent a notice saying so. Neither notice gives your reason.',
        'A suspended Community, Fleet or Armada shows as Suspended on its card. The registrations list shows you private registrations that most members cannot see.',
        'Each of these actions appears in the Security Log under Fleet disputes, and each look under Fleet investigations.',
      ]),
      guideSection('When something goes wrong', [
        'A change that is refused shows “Not changed” with the reason. “It is closed, so it cannot change.” means it is closed already, and a closed Community, Fleet or Armada cannot be suspended.',
        'The close dialog says “That is not its name. Type it exactly as shown.” until the name matches.',
        'Site administration and the Investigate pages need Fleet Community switched on. Fleet Investigations still lists the past looks while it is off.',
        'A Community hidden from you by who may see it cannot be opened from its own page. Find it under Fleet Disputes instead.',
      ]),
    ],
    relatedLinks: [
      { label: 'Fleet Disputes', route: APP_ROUTES.ADMIN_FLEET_DISPUTES },
      {
        label: 'Fleet Investigations',
        route: APP_ROUTES.ADMIN_FLEET_INVESTIGATIONS,
      },
      { label: 'Manage Members', route: APP_ROUTES.ADMIN_USERS },
      { label: 'Security Log', route: APP_ROUTES.ADMIN_SECURITY_LOG },
    ],
  },
  {
    slug: 'site-admin-roster-erasure',
    title: 'Roster erasures',
    summary:
      'Erasing somebody’s roster data from every Fleet at their verified request, and how erasures come back after a restore.',
    sections: [
      guideSection('What it is for', [
        'A Fleet’s roster imports record each member’s Character name, @handle and public comment. Anybody listed in any Fleet’s roster, with or without an STO Info account, can ask through Contact us for that to be erased. Roster Erasures is where you do it.',
        'An erasure anonymises rather than deletes. In every Fleet, every roster row naming them becomes “Erased member”, with a pseudonym in place of the handle and the comment emptied. Every stored roster file naming them is deleted, and every future import is scrubbed of them before it is stored.',
        'Fleets keep their head counts, joins and departures, so their history still adds up.',
      ]),
      guideSection('Who can use it', ['Site administrators only.']),
      guideSection('Where to find it', [
        'Choose Admin in the side bar. Roster Erasures is under Community. It works whether or not Fleet Community is switched on.',
      ]),
      guideSection('How to verify the request', [
        'Before anything else, make sure the person asking is the person named. Do it off the site: in game, or by some other proof.',
        'The page cannot check this for you, and an erasure cannot be undone.',
      ]),
      guideSection('How to erase somebody', [
        'Enter the Character name and @handle as the roster shows them, and press Find their rosters. Capital letters make no difference. Before anything changes, the page lists each Fleet whose rosters name them, with its Community and how many Rows.',
        'If no roster names them now, you can still erase them, which keeps them out of every future import. If they are erased already, the page says “They are already erased.”',
        'Write in “Why, and how you verified the request”, 10 to 500 characters. Don’t repeat the name or handle there: the reason is kept, and shown in the list of erasures.',
        'Press Erase…, read what it will do, and press Erase. The page says which pseudonym they were erased as, how many roster rows in how many Fleets were anonymised, and how many files were deleted. A file that could not be deleted straight away is deleted by that night’s retention run.',
      ]),
      guideSection('How pseudonyms and the list work', [
        'Each erasure has a pseudonym of its own, beginning @erased-. One erased member stays one member in a Fleet’s history, and two stay two.',
        'Erasures made lists every erasure, newest first: When, Who, Replaced by, Why and Changed. It never holds the name or the handle.',
      ]),
      guideSection('How erasures come back after a restore', [
        'A database restored from a backup older than an erasure would bring back what it erased. So each erasure is also recorded in a ledger kept outside the database, which holds no name, handle or reason.',
        'After a restore, the site brings erasures back by itself when it starts, before it serves anything: every erasure the database no longer has is made again from the ledger. There is nothing to press. In the list, those show “Replayed from the ledger” under Who, and the Security Log shows “Restore check brought records back” under Site admin actions.',
      ]),
      guideSection('How erasure differs from unlinking', [
        'A player who says No to a Fleet proposal, leaves a Fleet or removes a Fleet from their Character changes only what their Character’s page says. The Fleet’s roster still lists the name it imported.',
        'The Character’s Fleet panel tells them so, and points them to Contact us. Unlinking erases nothing; erasure is this separate, verified request.',
      ]),
      guideSection('Who can see it', [
        'Fleets see “Erased member” and the pseudonym wherever their rosters named the person.',
        'The list of erasures, and the Security Log under Roster erasures, are for site administrators, and neither names who was erased.',
      ]),
      guideSection('When something goes wrong', [
        '“Roster erasure is not configured on this server.” means nothing can be found or erased until it is set up; tell whoever runs the servers. Meanwhile, once any erasure exists, roster uploads are refused rather than stored unscrubbed.',
        'There is no undo, and an erased person stays out of every future import. Check the rosters found before you press Erase.',
        'Erase… stays unavailable until the reason is between 10 and 500 characters.',
      ]),
    ],
    relatedLinks: [
      { label: 'Roster Erasures', route: APP_ROUTES.ADMIN_ROSTER_ERASURES },
      { label: 'Security Log', route: APP_ROUTES.ADMIN_SECURITY_LOG },
    ],
  },
  {
    slug: 'site-admin-security-log',
    title: 'The Security Log',
    summary:
      'What site administrators and the retention jobs did, when, to whom and why — and why every action asks you for a reason.',
    sections: [
      guideSection('What it is for', [
        'The Security Log is one feed of what site administrators did, and of what the site’s retention jobs did on their own: who, when, what, to whom or what, and why. It is the record a site administrator answers to.',
        'It keeps nothing of its own. Each entry is read from the log that already holds it, and lasts as long as that log keeps it.',
      ]),
      guideSection('Who can use it', ['Site administrators only.']),
      guideSection('Where to find it', [
        'Choose Admin in the side bar. Security Log is under Operations.',
      ]),
      guideSection(
        'How to read it',
        [
          'Entries are newest first, fifty to a page; Newer and Older turn the pages. Each has When, Who, What, To whom or what, and Why, with its source under What.',
          'Who reads “The system” for what STO Info did on its own. A site admin action or Fleet dispute whose administrator’s account has since gone reads “An account since closed”.',
          'Show narrows the feed to one source, or Everything:',
        ],
        [
          'Site admin actions — role, permission and limit changes; disabling and restoring accounts; decisions on member, chat and Storytime reports and appeals; chat messages removed from Chat Reports; Custom Tracking and Storytime moderation; picture runs, rescan campaigns, and pictures refused for policy taken down or kept; reads of Scan Diagnostics, failed jobs retried or discarded, and publication paused or resumed; features switched on or off; and the system’s own restore check, when it brings back records a restored database had lost.',
          'Fleet disputes — a site administrator’s actions on a Community’s Site administration page.',
          'Moderation holds — holds placed, extended, released and read, and the system’s own review notices and releases.',
          'Fleet investigations — each look into a Fleet, with its purpose.',
          'Roster erasures — each erasure, and each one the site made again by itself after a restore.',
          'Retention runs — each run of the Fleet retention jobs, what it removed, and any failure.',
        ],
      ),
      guideSection('How reasons work', [
        'Every action of yours the Security Log records asks you why first, and will not go ahead with nothing written. A look into a Fleet, or reading a hold, asks for a purpose instead.',
        'The reason is kept with the action, in the same step that makes the change, so a change never lands without its entry and an entry never stands for a change that failed.',
        'The one exception is claiming a member report with Mark as under review, which decides nothing. It is logged as “Taken for review.”',
        'Write for a colleague reading it months later: what was done, and why.',
      ]),
      guideSection('How it keeps members’ words out', [
        'The details under an entry are codes, states, counts and IDs — the status a report moved from and to, for example — never a message, a roster row or a comment. Reasons and purposes are the only words in it, and they are the administrators’ own.',
        'What a Fleet’s own Owner, Admins and Officers do stays in that Fleet’s history; only a site administrator’s actions there appear here. Publishing news, banners and notifications is not recorded here.',
      ]),
      guideSection('Who can see it', [
        'The Security Log is for site administrators alone. Some entries also live elsewhere: a Fleet dispute action is in the history of the Community, Fleet or Armada too, where its Owner and Admins can read your reason.',
        'How long an entry lasts depends on its source. The site admin log is kept under the site’s audit policy, a Fleet’s history for as long as the Fleet exists, and retention runs for a year.',
      ]),
      guideSection('When something goes wrong', [
        'An entry you expected is missing? Check Show is on Everything. A change that failed was never logged, because an entry is only written with the change it records.',
        'An entry cannot be edited or deleted, here or anywhere else: the site admin log is write-once.',
        '“The log could not be read.” means the feed did not load. Open the page again to retry.',
      ]),
    ],
    relatedLinks: [
      { label: 'Security Log', route: APP_ROUTES.ADMIN_SECURITY_LOG },
      { label: 'Admin', route: APP_ROUTES.ADMIN },
    ],
  },
  {
    slug: 'site-admin-scanning',
    title: 'Scan Diagnostics',
    summary:
      'The file scanner’s health and alerts, failed jobs, pausing publication, why an upload was refused, rescanning published pictures, and making pictures private.',
    sections: [
      guideSection('What it is for', [
        'Every upload to STO Info is held back and scanned before anybody else can see it. Scan Diagnostics shows how that scanning is going and why an upload was refused.',
        'When something needs a person — uploads waiting too long, a silent or paused worker, old virus signatures, failed background jobs, or publication paused for too long — every site administrator is told in the site, and the page shows what is wrong.',
        'It also runs two jobs on the site’s pictures: Rescan campaigns, which scan published pictures again, and Private image delivery, which makes every picture private.',
      ]),
      guideSection('Who can use it', ['Site administrators only.']),
      guideSection('Where to find it', [
        'Choose Admin in the side bar. Scan Diagnostics is under Operations, and an alert’s notification links straight to it. The page reads its figures when you open it, and Refresh reads them again, failed jobs included, back at every queue’s first page; it never refreshes by itself.',
        'Pause publication is on the Admin page itself, under Operations.',
      ]),
      guideSection('How to read the scanner’s health', [
        'The top of the page is totals only, and never names a file, an uploader or a signature. Usage counts scans, outcomes and latency over the last 24 hours, 7 days and 30 days; Engine shows the scanner and how old its signatures are; Backlog shows what is waiting to be scanned.',
      ]),
      guideSection(
        'How to read the alerts',
        [
          'Alerts lists each problem open now, oldest first, with when it opened and when it was last seen. Every site administrator was told of it once, in the site, when it opened, and is told again when it clears. There is nothing to close: an alert clears by itself once its problem goes, checked every minute. The problems are:',
        ],
        [
          'Uploads are waiting to be scanned, or to be published — one has waited more than 15 minutes.',
          'The scan worker is silent — no worker has checked in for two minutes.',
          'The scan worker is paused — every worker has been paused for more than 10 minutes.',
          'Virus signatures are out of date — the newest are more than 36 hours old. The worker stops scanning at 48.',
          'Background jobs have failed — any job at all is waiting under Failed jobs.',
          'Publication is still paused — it has been paused for more than an hour.',
          'The job queues cannot be reached — they have not answered for two minutes, so uploads are neither scanned nor published and background jobs wait. Tell whoever runs the servers.',
          'Withdrawn pictures are still online — a picture taken down more than a day ago has not yet been deleted from Cloudflare, so it can still be reached at its old address. The site asks Cloudflare again every hour; if it keeps refusing, tell whoever runs the servers.',
        ],
      ),
      guideSection('How to read the worker', [
        'Worker shows each worker process that has checked in during the last two minutes: its state, its signature version and age, the scans it has in hand, its last heartbeat and, while paused, since when.',
        'A worker that cannot trust its scanner pauses rather than pass what it cannot judge, so uploads wait and none fails. “The scanner can’t be reached” most often means the scanner is starting or down; “signatures too old” means its updates are failing. If no worker has checked in, the page says for how long. Either way, tell whoever runs the servers.',
      ]),
      guideSection('How to retry or discard a failed job', [
        'Failed jobs lists every background job that ran out of attempts, 25 to a page, newest failure first in each queue; Queue narrows it to one. Each shows when it failed, its queue, its job ID, its attempts, the asset, chat transcript or Fleet it concerns, and why it failed, as a code. It never shows what the job carried or its error’s text.',
        'Retry sends a job round again, with its attempts back. It is only offered when a retry could change something: a job whose upload, transcript or Fleet has moved on since says so instead. Discard removes any failed job for good.',
        'Retry all retries every failed job a retry can help, and Discard all that can’t be retried removes those it cannot, in the queue chosen or every queue, up to 500 at a press. Each says how many it did and how many it left alone; press it again if it says more are left.',
        'Every retry and discard asks for a Reason.',
      ]),
      guideSection('How to pause publication', [
        'Pause publication, on the Admin page under Operations, holds back everything the scanner clears: uploads are still accepted and scanned, but nothing is published until publication resumes; then everything held publishes. Use it when something is being published that should not be, while you find out why.',
        'Pause publication and Resume publication each ask for a Reason. While publication is paused, the Admin page and Scan Diagnostics say since when, by whom and how many uploads are waiting, and every site administrator is told if it stays paused for more than an hour.',
        'If the job queues can’t be reached, the switch still changes: the page says so, a pause reaches the queues as soon as they answer, and nothing is published meanwhile.',
        'Scan Diagnostics also counts, under Publication, withdrawn pictures still to be deleted from Cloudflare, with how long the oldest has waited.',
      ]),
      guideSection('How to find out why an upload was refused', [
        'Refused uploads lists each refused asset by its kind and ID, newest verdict first, 25 to a page, with its rejection code and the engine and signature versions behind the verdict. It never shows what matched: STO Info does not record it, because naming it would tell somebody probing the scanner what gets through.',
        'Look up an asset by its ID shows the same for any one asset, with its State and Policy.',
      ]),
      guideSection('How rescan campaigns work', [
        'A rescan checks published pictures again, against today’s scanner and upload policy, behind new uploads. Pictures from before scanning began are rescanned once, automatically, overnight; site administrators start every other campaign.',
        'Under Start a campaign, each field narrows the selection, and leaving them all empty rescans every published picture: Kinds of picture, Uploaded on or after, Uploaded before, Not scanned for this many days (0 to 3,650; a picture never scanned counts too), Only pictures never scanned, and Order, behind or ahead of other campaigns. Roster files are never rescanned. Start a campaign asks for a Reason.',
        'Each campaign shows its state and its counts: Asked for, Clean, Infected, taken down, Refused for policy, No verdict and Already rescanned. A picture is rescanned once for each upload policy and signature version, however many campaigns overlap; one skipped for that reason is Already rescanned.',
        'Pause, Resume and Cancel each ask for a reason. A pause takes effect after the batch under way. A cancelled campaign stages nothing more, but rescans already asked for still get their verdicts.',
      ]),
      guideSection(
        'How to decide what a rescan finds',
        [
          'Below the campaigns are the latest pictures found infected, and those refused for policy still to decide, by asset ID, outcome and code.',
        ],
        [
          'Infected — the picture was taken down at once and deleted, and every site administrator was told in the site. It stays listed as “Infected, taken down”.',
          'Refused for policy, such as not being the type it claims or being too large — the picture keeps showing, listed as “Refused for policy, still up”, until you decide. Take it down stops it being shown, deletes its image and tells its owner. Keep it leaves it up, though a later rescan under a new policy may refuse it again. Both ask for a Reason, and either way it leaves the list.',
        ],
      ),
      guideSection(
        'How private image delivery works',
        [
          'Every picture is being made private: reachable only by an address STO Info signs while the picture may be shown. One that may not be shown is replaced by the site’s “photo unavailable” image. Pictures still public counts what is left. Work in this order:',
        ],
        [
          'Take an inventory — checks every place a picture is recorded against the pictures stored, and changes nothing.',
          'Copy to private — copies every public picture to a private one and points every record at the copy. Nothing is deleted.',
          'Check that pictures across the site still show. If they do not, Undo copies points them back at their public copies; a picture that may no longer be shown is never put back.',
          'Retire old copies — deletes every old public copy. Their addresses stop working, and there is no undo. Take another inventory: Public, Old copies to retire and Nothing points at them should be zero, or accounted for.',
          'Each run asks for a Reason, and only one is open at a time; while it is, Pause or Resume takes the place of the run buttons. A pause takes effect after the batch of 20 under way, and a paused or failed run resumes where it stopped.',
        ],
      ),
      guideSection('Who can see it', [
        'Scan Diagnostics is for site administrators. An uploader is only ever told their file was not accepted. The owner of an infected picture is told only that it failed a security check and was removed; the owner of one you take down is told, without your reason, that it broke the site’s rules for pictures.',
        'Every run or campaign you start, pause, resume or cancel, every policy refusal you decide, every failed job you retry or discard, and every pause or resume of publication appears in the Security Log with your reason. Taking an inventory asks for no reason.',
        'Opening or refreshing Scan Diagnostics, turning the refused uploads’ pages, looking up an asset, and choosing a queue or turning a page of the failed jobs are each recorded there too, as “Read Scan Diagnostics”.',
      ]),
      guideSection('When something goes wrong', [
        'A part of the page that could not be read says so, and the rest still shows. Press Refresh, or Try again if nothing loaded.',
        'If Private image delivery says addresses are not signed, the signing key is not set up on the server: no copy can start and new pictures go up public. Tell whoever runs the servers.',
        'A run button stays unavailable until there is something for it to do. “Another run is open. Finish it first.” means just that.',
        '“That campaign cannot do that now.” means the campaign has already moved on, and “That finding has already been decided.” means another administrator decided it first. Press Refresh to see where things stand.',
        '“The job queues cannot be reached.” under Failed jobs means the site cannot reach them just now; tell whoever runs the servers. If they stop answering part way through Retry all or Discard all, the page says so, and what was done is in the Security Log.',
        'A retry or discard that is refused shows the reason it was given, most often that somebody else acted on the job first, and the list is read again.',
        '“Publication is already paused.” or “Publication is not paused.” means another administrator changed it first. The Admin page then shows it as it is.',
      ]),
    ],
    relatedLinks: [
      { label: 'Scan Diagnostics', route: APP_ROUTES.ADMIN_SCAN_DIAGNOSTICS },
      { label: 'Admin', route: APP_ROUTES.ADMIN },
      { label: 'Security Log', route: APP_ROUTES.ADMIN_SECURITY_LOG },
    ],
  },
  {
    slug: 'site-admin-features',
    title: 'Switching features on and off',
    summary:
      'Fleet Communities, Storytime and Custom Tracking: switching each on or off for everybody, and what the environment allows beneath each.',
    sections: [
      guideSection('What it is for', [
        'Fleet Communities, Storytime and Custom Tracking each have a switch. Off, the feature disappears for everybody, as though it did not exist: its pages say it is offline and its links leave the menus. Nothing it holds is deleted, and switching it on again brings it all back.',
        'Use it to keep a feature hidden until it is ready, or to take one offline quickly when something is wrong with it.',
        'No switch here touches the file scanner: uploads are scanned and published whatever these say. To hold back publishing, use Pause publication instead.',
      ]),
      guideSection('Who can use it', ['Site administrators only.']),
      guideSection('Where to find it', [
        'Choose Admin in the side bar. Features is under Operations, below Publication.',
      ]),
      guideSection('How to switch a feature', [
        'Each feature shows whether it is On or Off, when its switch was last changed, and by whom.',
        'Press Switch on or Switch off beside it. You are asked for a Reason, and nothing changes until you give one and confirm.',
        'Every server applies the change within ten seconds. Pages already open in a browser, your own included, show it once they are reloaded.',
      ]),
      guideSection('How to read what the environment sets', [
        'Under Set by the environment, each feature lists its parts and whether the server’s settings allow them — for Fleet Communities, registering, roster imports and chat. These are fixed where the site is deployed and cannot be changed here.',
        'A part that is not allowed stays off even while its feature is on. While a feature is off, every part of it is off whatever this list says.',
      ]),
      guideSection('Who can see it', [
        'Only site administrators see the switches. Every change appears in the Security Log as Switched a feature on or Switched a feature off, naming the feature, with your reason.',
        'Members see only the result: a feature that is there, or one that says it is offline.',
      ]),
      guideSection('When something goes wrong', [
        '“… is already switched on.” or “… is already switched off.” means another administrator changed it first. The switches are then read again and show it as it is.',
        '“The feature switches could not be read.” means the site could not be reached. Try again.',
        '“… switch is missing from the database.” means the setting was never created there; tell whoever runs the servers.',
      ]),
    ],
    relatedLinks: [
      { label: 'Admin', route: APP_ROUTES.ADMIN },
      { label: 'Security Log', route: APP_ROUTES.ADMIN_SECURITY_LOG },
    ],
  },
];

/**
 * Running the site, last on the Help home and offered to site administrators
 * alone (Steve's decision of 29 September 2026). No permission stands for the
 * role, so the section waits on it; its guides stay out of the sitemap.
 */
export const SITE_ADMIN_TOPIC: HelpTopic = {
  id: 'site-admin',
  title: 'Running the site',
  intro:
    'For site administrators: deciding reports, keeping evidence, settling disputes over who runs a Community, erasing somebody from rosters, reading the Security Log, checking pictures and switching features on and off.',
  requiresAdmin: true,
  guides: SITE_ADMIN_GUIDES,
};
