import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import { guideSection } from './help-section';
import { HelpGuide, HelpTopic } from './help.models';

/*
 * The Fleet guides (FC-050), grouped as they are read: what the records are
 * and how to find one, belonging to one, what its members share, and keeping
 * its roster. Each guide follows the same six parts — what it is for, who can
 * use it, where to find it, how, who can see it, and when something goes
 * wrong — and describes the pages as they are, word for word.
 */

/** What a Community, Fleet and Armada are, and finding, registering and running one. */
const FLEET_BASICS_GUIDES: HelpGuide[] = [
  {
    slug: 'communities-fleets-and-armadas',
    title: 'Communities, Fleets and Armadas',
    summary:
      'The three kinds of record, how they fit together, and why two records can share one name.',
    sections: [
      guideSection(
        'What it is for',
        [
          'The Fleet section records the groups people play Star Trek Online with. It uses three words, and they mean the same thing on every page:',
        ],
        [
          'Community — this site’s own umbrella. It holds the Fleets and Armadas you register, and it is not tied to one platform. Nothing in the game is called a Fleet Community, so the name is yours to choose.',
          'Fleet — one in-game Fleet on one platform, recorded under the name the game shows, character for character.',
          'Armada — one in-game Armada on one platform. It belongs to a Community and allies some of that Community’s own Fleets: one Alpha, up to three Betas, and up to three Gammas under each Beta.',
        ],
      ),
      guideSection('Who can use it', [
        'Anybody can browse the Fleet section, signed in or not.',
        'Signing in adds the things that need to know who you are: following a Community, registering one, and taking part in the Fleets you belong to. What you can change inside a Community depends on the role you hold there, which the guide to roles explains.',
      ]),
      guideSection('Where to find it', [
        'Choose Fleets in the side bar. The Fleet Directory opens with three tabs, Fleets, Communities and Armadas, one for each kind of record.',
        'Once you are signed in, your Dashboard also has a Fleets tile, which leads to Communities You Follow.',
      ]),
      guideSection('How the three fit together', [
        'The usual shape is a Community holding Fleets. A Community’s page lists them under “Armadas and Fleets”: each of its Armadas with the Fleets placed in it, then its “Fleets not in an Armada”.',
        'An Armada is optional. It takes only Fleets of its own Community, on its own platform, and of its own allegiance, Federation or Klingon. A Fleet sits in one Armada at most.',
        'A Fleet can also be recorded with no Community at all, as “a Fleet nobody here runs”, so that anybody looking for it finds it. It has no owner, so nobody can change it or close it afterwards. It cannot join an Armada, and there is no Community to follow.',
      ]),
      guideSection('How platforms work', [
        'Every Fleet and Armada is recorded on one platform, such as Windows, Xbox or PlayStation. The same name on two platforms is two different Fleets, not a duplicate.',
        'A Community has no platform of its own, so one Community can hold Fleets on several.',
        'The game provides a roster export on Windows only. On a console Fleet’s page, “Roster last imported” says that the game provides no roster export on that platform, and the roster pages are not offered.',
      ]),
      guideSection('How names are recorded', [
        'When you register a Community, its name starts filled in as your STO Info username with “’s Community” after it. That is only a starting point: type over it with whatever the Community is called.',
        'A Fleet or Armada name is different. It must match what the game shows exactly, spaces at either end included, because that spacing may be the only thing telling two Fleets apart. Each space at either end of a name is drawn as a small mark, and a screen reader counts them out.',
        'An Armada may also carry a friendlier name, shown on its card and page as “Known as”.',
      ]),
      guideSection('How to tell two records of one name apart', [
        'Two Communities may each keep a record of the same in-game Fleet, and neither is the authoritative one. “Check for existing records” shows what already answers to a name before you register, but nothing stops you.',
        'A card says when its name is shared: “1 other record answers to this name on Windows”, for example. Names are compared ignoring capital letters, but never ignoring spaces.',
        'STO Info cannot tell who leads a Fleet or an Armada in the game. Registering a record does not prove that you run it. The best clue a page offers is “Roster last imported”: a record whose roster was imported recently is being kept by somebody who can export it.',
      ]),
      guideSection('Who can see it', [
        'Each Community and Fleet has its own “Who can see it” setting, from “Anyone” down to “Only me”, and its page shows the answer under “Visible to”. A Fleet’s page opens only for somebody allowed to see both the Fleet and the Community holding it, or somebody with an open invitation to join it.',
        'An Armada has no setting of its own: it is seen exactly as far as its Community is. A Fleet nobody here runs can be seen by anybody.',
      ]),
      guideSection('When something goes wrong', [
        'A record you are not allowed to see answers exactly as one that does not exist, with “No such record”. A link somebody sent you may simply be to something you cannot open. Inside an Armada, a Fleet you cannot see keeps its place and reads “A Fleet you cannot see”.',
        'If the Fleet section says “Currently Offline”, Fleet Community is switched off for the moment. “Connection Lost” means the site could not be reached. Either way, nothing you recorded is lost.',
        'If somebody else’s record uses your Fleet’s name, you can still register your own. If you think a record misrepresents your Fleet, use Contact us.',
      ]),
    ],
    relatedLinks: [
      { label: 'Open the Fleet Directory', route: APP_ROUTES.FLEETS },
      { label: 'Browse Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
      { label: 'Browse Armadas', route: APP_ROUTES.FLEET_ARMADAS },
      { label: 'Contact us', route: APP_ROUTES.CONTACT },
    ],
  },
  {
    slug: 'finding-a-fleet',
    title: 'Finding a Fleet',
    summary:
      'Searching the three directories, reading a record, and following a Community.',
    sections: [
      guideSection('What it is for', [
        'The Fleet Directory lists the public Communities, Fleets and Armadas recorded here. Use it to find a group to join, to look a Fleet up before you register it, or to tell two records of the same name apart.',
      ]),
      guideSection('Who can use it', [
        'Anybody. The directory lists the same records in the same order whether you are signed in or not.',
        'Following a Community needs you to be signed in, because the site has to remember it was you.',
      ]),
      guideSection('Where to find it', [
        'Choose Fleets in the side bar, then the Fleets, Communities or Armadas tab.',
        'The Communities you follow are gathered on your Dashboard: choose the Fleets tile, or Communities You Follow.',
      ]),
      guideSection(
        'How to search',
        [
          'Each tab has a name box, “Fleet name”, “Community name” or “Armada name”. Type in it and choose Search. The other controls change the list as soon as you pick something, and Clear all puts everything back as it started.',
        ],
        [
          'Showing — “Operating”, the default, lists records that are running normally. “Closed” lists closed ones, and “Every record” lists everything, suspended records included.',
          'Ordered by — “Name” or “Newest first”. The Fleets tab adds “Most recently imported”. Ordered by name, records of the same name sit together.',
          'The Fleets tab also filters by Platform, Recruiting, Allegiance and Roster, from “Never imported” to “Imported in the last year”.',
          'The Communities tab filters by Recruiting, and the Armadas tab by Platform.',
        ],
      ),
      guideSection('How names are matched', [
        'The search finds every name containing what you typed, and capital letters do not matter. Spaces at the start or end of what you type count too, because two Fleet names can differ only by such a space.',
        'The Allegiance filter leaves out every Fleet whose allegiance nobody has stated. It is never guessed from a roster, so if a Fleet seems to be missing, try again without it.',
      ]),
      guideSection(
        'How to read a card',
        [
          'A card starts with what the record is, Community, Fleet or Armada, and the platform it is on. Then comes its name exactly as recorded and the Community holding it. A Community card shows its description, and a Fleet card says when its roster was last imported.',
          'The coloured label says how a record stands:',
        ],
        [
          'Recruiting — anyone eligible may join.',
          'Applications open — people apply, and somebody answers.',
          'Invitation only — the Fleet invites people rather than taking applications.',
          'Not recruiting — nobody can ask to join, though a Fleet can still invite somebody.',
          'Suspended — a site administrator has paused the record. It can be read, but nothing new is accepted.',
          'Closed — the record has closed. Its history can still be read.',
        ],
      ),
      guideSection('How to follow a Community', [
        'Open a Community, or any Fleet it holds, and choose “Follow this Community”. Choose “Stop following” to undo it. The page shows how many people follow the Community.',
        'Following shows you what the Community publishes to its followers. It is not a membership, and it opens no roster. A Fleet nobody here runs has no Community, so its page says “Following starts when a Community registers this Fleet.”',
      ]),
      guideSection('How Communities You Follow works', [
        'The page shows a card for each Community you follow, under Following, with “Find more Communities” beneath.',
        'Further down are “Your upcoming events”, the next thirty days of events you answered Going or Maybe to, are waiting for, or asked to be reminded of, and “Your Fleet activity”, from the Communities you follow and the Fleets and Armadas you belong to.',
        'Until you follow something, the page offers Browse Fleets, Browse Communities, Browse Armadas and Register a Community instead.',
      ]),
      {
        heading: 'How to reach chat from there',
        paragraphs: [
          'Communities You Follow also has a Chat panel. Open chat leads to the channels of your Fleets, their Armadas and Communities, and your conversations with friends.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'The directory lists only records whose “Who can see it” is set to Anyone. A Fleet or an Armada in a Community is listed only while that Community is listed too, so a record can exist and not be listed. A Fleet nobody here runs is always listed.',
        'Your Communities You Follow page is yours alone.',
      ]),
      guideSection('When something goes wrong', [
        'If a search finds nothing, check the spelling and whether you are looking at the right platform. A closed record is listed only when Showing is “Closed” or “Every record”, and a suspended one only under “Every record”.',
        'A page that says “No such record” may be out of date, or may be something you are not allowed to see. The two answer alike on purpose.',
        'If the directory could not be read, or following could not be changed, the page says so and nothing has changed. Try again.',
      ]),
    ],
    relatedLinks: [
      { label: 'Search Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Browse Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
      { label: 'Browse Armadas', route: APP_ROUTES.FLEET_ARMADAS },
      {
        label: 'Communities You Follow',
        route: APP_ROUTES.STO_DASHBOARD_FLEETS,
      },
    ],
  },
  {
    slug: 'registering-a-fleet',
    title: 'Registering a Community, Fleet or Armada',
    summary:
      'Registering your Community first, then its Fleets and Armadas, confirming a Fleet nobody here runs, and changing a record afterwards.',
    sections: [
      guideSection('What it is for', [
        'Registering puts your group on the site: a Community first, as your umbrella, then the Fleets and Armadas it holds. It is a record, not a claim: nothing checks it against the game.',
      ]),
      guideSection('Who can use it', [
        'Anybody signed in can register a Community, and becomes its Owner. One account can own up to ten, closed ones included.',
        'Registering a Fleet or an Armada into a Community is for its Owner and Admins, and for anybody the Owner has given “Register Fleets and Armadas”.',
        'Anybody signed in can confirm a Fleet nobody here runs.',
      ]),
      guideSection('Where to find it', [
        'Choose “Register a Community” on the Communities tab of the Fleet Directory, or on Communities You Follow before you follow anything.',
        'On your Community’s own page, choose “Register a Fleet here” or “Register an Armada here”. Only people who may use them see them.',
        'To confirm a Fleet nobody here runs, choose “Confirm a Fleet nobody here runs” on the Fleets tab.',
      ]),
      guideSection(
        'How to register a Community',
        ['Choose “Register a Community” and fill in:'],
        [
          'Name — your username and “’s Community” to begin with. Change it to whatever the Community is called, up to 120 characters.',
          'Web address — the part of the address that names it. Leave it blank and one is made from the name.',
          'What the Community is — an optional description, shown on its page under About.',
          'How people join — shown on its card and page. People join its Fleets, never the Community itself.',
          'Who can see it — Anyone, Community members, Fleet members or Only me.',
          'Show dates in — the Community’s own zone, shown on its page as “Dates shown in”. An event set to “The Community’s own zone” runs on it.',
        ],
      ),
      guideSection('How to register a Fleet', [
        'Type the “Name, exactly as in game” and choose its Platform. Then choose “Check for existing records” to see what already answers to that name on that platform.',
        'Allegiance is optional. How people join starts on whatever its Community is set to, and is changed later under the Fleet’s Recruitment tab. Choose Who can see it, leave Web address blank if you like, and choose Register.',
      ]),
      guideSection('How to register an Armada', [
        'Type the “Name, exactly as in game”, and choose its Platform and its Allegiance, which must be Federation or Klingon. Only Fleets of the same allegiance can join, and the allegiance cannot change once one has.',
        '“What you call it” is optional, and is shown beneath the name the game holds. An Armada recruits nobody and is seen exactly as far as its Community, so there is nothing to choose about either.',
      ]),
      guideSection('How to confirm a Fleet nobody here runs', [
        'Use this only for a Fleet that belongs to no Community here. If the Fleet is yours, register it into your Community instead.',
        'Give its name and platform, choose “Check for existing records”, and read what comes back. Then tick the box saying you understand that nobody will be able to change or close the record afterwards, and choose Confirm. Two confirmations of one name make two records.',
      ]),
      guideSection('How to add a banner and emblem', [
        'The Owner and Admins, and anybody given “Manage artwork”, find an Artwork panel on the record’s page, with “Set the banner” and “Set the emblem”. On a Fleet nobody here runs, anybody signed in can fill an empty slot, and a filled one belongs to whoever filled it.',
        'The banner is the wide header, at least 2400 by 480 pixels; the emblem is the square badge, at least 300 by 300. Choose a JPG or PNG, select the area to keep, and describe it under “What does this picture show?” for anybody who cannot see it.',
        'Every picture is checked before it is used, and the page shows what it had until the check ends with Available or Rejected.',
      ]),
      guideSection('How to change a record afterwards', [
        'The Owner changes a Community’s name, web address, description, how people join, who can see it and the zone its dates are shown in on its Settings page, the first choice under Manage. A Fleet’s Settings page, under its Manage tab, changes its name, web address, allegiance and who can see it. Renaming makes a new web address from the new name, and the old address still leads to the record.',
        'A Fleet’s platform never changes: one recorded on the wrong platform has to be closed and registered again. When you rename a Windows Fleet, record its old name under Former names, on its Investigate tab, so that roster exports made under the old name still match it.',
      ]),
      guideSection('How to handle a name that is already taken', [
        '“Check for existing records” lists the records you may know about that answer to the name on that platform, whose each is, and when its roster was last imported. You can still register yours, since nobody’s record is the authoritative one.',
        'If you think a record misrepresents your Fleet, or ownership of a Community is disputed, use Contact us.',
      ]),
      guideSection('Who can see it', [
        'Whatever you choose under Who can see it. “Anyone” includes signed-out visitors and puts the record in the directory. “Community members” means the Community’s followers and members, including the members of any of its Fleets, and means the same on its Fleets. On a Fleet, “Fleet members” means its approved members; on a Community, the members of its Fleets, its Owner and Admins. “Only me” means the Community’s Owner alone.',
        'A Fleet is seen only by people who may see its Community as well, and by anybody with an open invitation to join it.',
      ]),
      guideSection('When something goes wrong', [
        'If the web address you typed was taken a moment before you registered, the page says so. Change it, or leave it blank.',
        '“You do not have permission to register anything into this Community.” means you do not hold “Register Fleets and Armadas” there. Ask its Owner.',
        'If you already own ten Communities, the page says so. Closing one does not free a place, so use Contact us if you need more.',
        'A Fleet or Armada name can be up to 64 characters, counting any spaces at either end. A picture marked Rejected has not been kept, and nothing already there has changed.',
      ]),
    ],
    relatedLinks: [
      { label: 'Register a Community', route: APP_ROUTES.FLEET_REGISTER },
      {
        label: 'Confirm a Fleet nobody here runs',
        route: APP_ROUTES.FLEET_REGISTER_STANDALONE,
      },
      { label: 'Search Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Contact us', route: APP_ROUTES.CONTACT },
    ],
  },
  {
    slug: 'roles-ownership-and-closing',
    title: 'Roles, ownership and closing',
    summary:
      'Who runs a Community, Fleet or Armada, handing a Community over, closing a record, and what a suspension means.',
    sections: [
      guideSection('What it is for', [
        'Every Community, Fleet and Armada is run through the same four fixed roles. Nobody can invent a role, and a rank in the game never gives anybody one here. This guide covers what each role may do, handing a Community over, and closing a record.',
      ]),
      guideSection('Who can use it', [
        'The Owner makes every change described here. Admins can read who holds a role, what is delegated and the history, but not change them. A site administrator can open a Community’s Manage page to settle a dispute.',
      ]),
      guideSection('Where to find it', [
        'On a Community’s page, choose Manage. On a Fleet or an Armada, choose the Manage tab. Manage offers Roles, Delegation and History, and, to a Community’s Owner, Ownership. The Owner finds “Close this Community”, “Close this Fleet” or “Close this Armada” at its foot.',
      ]),
      guideSection(
        'How the four roles work',
        [
          'A Community has exactly one Owner, who is also the Owner of every Fleet and Armada in it. A role held at a Community reaches every Fleet in it.',
        ],
        [
          'Owner — holds everything, and alone manages roles and delegation, hands the Community over, changes settings and closes a record.',
          'Admin — runs recruitment, members, roster imports, reports, news, events, holdings and artwork, and at a Community registers Fleets and Armadas and arranges its Armadas.',
          'Officer — holds nothing extra until the Owner says which things, under Delegation.',
          'Member — an approved member of a Fleet, who can read its roster and members, answer its events and report something to the site’s administrators.',
        ],
      ),
      guideSection('How to appoint and withdraw a role', [
        'On Roles, under “Appoint somebody”, choose the Person and Admin or Officer as the Role, add “Why (optional)” if you like, and choose Appoint.',
        'Only members can be appointed: a Fleet’s members at a Fleet, members of any of its Fleets at a Community, and members of the Fleets placed in an Armada at that Armada. A person holds one role per record; to change it, withdraw it first.',
        'To withdraw one, choose Withdraw… and give a Reason. A role also ends by itself when its holder leaves the Fleet, when their Fleet leaves an Armada, or when the record closes.',
      ]),
      guideSection('How to delegate to Officers and particular people', [
        'On Delegation, “What every Officer holds” is a list of capabilities to tick. Save applies them to every Officer at that record, and taking one away asks why.',
        'Under “Particular people”, choose a Person, a Capability and whether to grant or deny it. A denial beats any role they hold, and needs a reason. Clear… takes a grant or denial away again.',
        'Managing roles, handing over ownership, changing settings and closing are never handed on.',
      ]),
      guideSection('How to hand a Community to somebody else', [
        'On Ownership, pick one of the Community’s Admins, then choose Offer ownership… to offer it. It moves only if they accept within seven days, and you then stay on as an Admin. Until they answer, Take the offer back… cancels it.',
        'The Admin is told by a notification and sees “Ownership offered to you” on the Community’s page, with Accept… and Decline. On acceptance they own the Community and all it holds, and any role, grant or denial they held in it ends.',
        'If an Owner closes their STO Info account, each Community they own passes to its longest-serving Admin who can take it, or is closed if none can. Closing your account tells you which first.',
      ]),
      guideSection(
        'How to close a Community, Fleet or Armada',
        [
          'At the foot of Manage, choose Close… and type the name exactly as shown, capitals included; spaces at either end do not matter. Then say Why, and choose Close it.',
          'Closing cannot be undone. What it does:',
        ],
        [
          'Every role and delegated capability at that record ends with it.',
          'Its events still to come are cancelled, and whoever asked to be reminded is told.',
          'Its history, members and pictures are kept, and its page stays readable but accepts nothing new. Closing a Community leaves everything in it readable and accepting nothing new too.',
          'A closed Fleet leaves its Armada. If it was a Beta, its Gammas become Betas where there is room, and otherwise leave.',
          'A closed Armada lets every Fleet in it go, and cancels every request to join it.',
        ],
      ),
      guideSection('How suspensions and disputes work', [
        'In a dispute, or when an Owner has vanished, a site administrator can move ownership to one of the Community’s Admins without asking, suspend or reinstate the Community or any record in it, or close one, giving a reason kept in its history. To raise a dispute, use Contact us.',
        'A suspended record shows Suspended. It can still be read, but nothing new is accepted until it is reinstated, and even its Owner cannot close it. Unlike closing, a suspension ends nothing: roles, members and events stand. Suspending a Community suspends everything in it.',
      ]),
      {
        heading: 'How chat is shared out',
        paragraphs: [
          'Members can post in their record’s channels. Admins can also moderate chat and export transcripts, and the Owner can hand either to Officers or particular people under Delegation. Nobody posts in the chat of a suspended or closed record.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'Roles, delegation and the history are for the Owner and Admins to read. The history shows the newest fifty changes, and is kept for as long as the record exists.',
        'An ownership offer is seen by the Owner and the Admin it was made to. A declined offer is recorded in the Community’s history.',
      ]),
      guideSection('When something goes wrong', [
        '“Managing this is for its Owner and Admins.” means you hold neither role there.',
        'If nobody can be appointed, remember that only members holding no role there can be. If ownership cannot be offered, the Community has no Admins yet. A closed or suspended Community cannot change hands, and somebody who already owns ten Communities cannot accept one.',
        'When closing, “That is not its name. Type it exactly as shown.” means the name you typed does not match.',
      ]),
    ],
    relatedLinks: [
      { label: 'Browse Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
      { label: 'Notifications', route: APP_ROUTES.NOTIFICATIONS },
      { label: 'Contact us', route: APP_ROUTES.CONTACT },
    ],
  },
];

/** Your Characters' Fleets, joining one, Armadas and holdings. */
const FLEET_MEMBERSHIP_GUIDES: HelpGuide[] = [
  {
    slug: 'your-characters-and-fleets',
    title: 'Your Characters and their Fleets',
    summary:
      'Recording which Fleet a Character is in, answering a Fleet’s question about it, and how that differs from a roster, membership and following.',
    sections: [
      guideSection(
        'What it is for',
        [
          'Each of your Characters can say which Fleet it is in now, and which Fleets it was in before. That record is yours: you write it, you decide who sees it, and nothing a Fleet does can write it for you.',
          'It is one of four separate things, and none of them implies another:',
        ],
        [
          'Your Character’s Fleet — what you say about your own Character. This guide is about it.',
          'A Fleet’s roster — who the game listed in an export somebody imported. A roster entry is not an account, and no import links one to you. It shows that a name was listed, never who plays it.',
          'Membership — being an approved member of a Fleet here, from joining, applying or an invitation. The guide to joining and applying covers it.',
          'Following — “Follow this Community” shows you what a Community publishes to its followers. It is not a membership, and it opens no roster.',
        ],
      ),
      guideSection('Who can use it', [
        'Anybody signed in, for the Characters on their own STO accounts. Nobody else can record, change or answer anything about your Characters: not a Fleet’s officers, and not whoever imported its roster.',
      ]),
      guideSection('Where to find it', [
        'Open your Dashboard, choose Manage STO Accounts, open an account, then one of its Characters. The Fleet panel on the Character’s page shows “Currently” and, once something has ended, “Previously”.',
        'Anything waiting for your answer is at the top of the panel, under “Awaiting your answer”, with the date to answer by. A new question also sends you a notice under Notifications, unless you have switched off “Roster association proposals” in Settings.',
      ]),
      guideSection(
        'How to record a Character’s Fleet',
        [
          'The Fleet needs a record on STO Info that you can see; the panel cannot take a name you type in. Recording a new Fleet ends the current one on the date the new one begins, so the earlier Fleet moves under “Previously”.',
        ],
        [
          'Choose “Record a Fleet”, type the Fleet’s name under “Find the Fleet”, and choose “Search”.',
          'Pick the Fleet from the results. Each shows its platform, and the Community holding it or “no Community”.',
          'Fill in “Joined on”, and choose “Who can see this”. It starts at “Only me”.',
          'Choose “Record it”.',
        ],
      ),
      guideSection('How to answer a question about your Character', [
        'When a Fleet’s latest roster export lists a Captain with exactly the same name and account handle as one of your Characters, STO Info asks you. Anybody can register a Character under any name, so only you can say whether it is yours.',
        'Choose “Yes, that is this Captain” to record the Fleet from when that export was taken, or “No”. Each question is answered on its own: saying yes to one Fleet leaves another Fleet’s question where it was.',
        'Joining a Fleet here, being accepted or accepting an invitation asks too. Once an officer has invited you in game, choose “Yes, I am in this Fleet”, and the Fleet is recorded from then.',
        'A Fleet you say yes to starts as seen by you alone. A question left unanswered expires after 90 days. An expired roster question is asked again when a later export lists that name.',
      ]),
      guideSection(
        'How to leave or remove a Fleet',
        [
          'Nothing on this panel takes you out of a Fleet in game, or out of its membership here. That is “Leave this Fleet”, on the Fleet’s own page, which in turn leaves this record as it was.',
          'The panel has two buttons, for two different things:',
        ],
        [
          '“I have left this Fleet” ends the current entry now and keeps it under “Previously”, seen by whoever could see it before.',
          '“Remove — this was never right” takes an entry out of the history altogether, for one recorded by mistake. Removing an entry you said yes to does not reopen the question it answered.',
        ],
      ),
      guideSection('How to have your name taken off a roster', [
        'Saying No, leaving or removing changes only what your Character’s page says. A Fleet’s roster still lists the name it imported.',
        'Anybody a roster lists, with an account here or without one, can ask through Contact us for their roster data to be erased from every Fleet. A site administrator checks it is really them first. An erasure cannot be undone.',
      ]),
      guideSection('Who can see it', [
        'The Fleet panel, with its history and any question waiting, is shown to you alone.',
        '“Who can see this” is set entry by entry: “Anyone”, “Community members”, “Fleet members” or “Only me”. It decides who, reading that Fleet’s roster, sees your Captain’s row there link to your Character’s public page. The link also needs your profile, the account and the Character to be public in the Galactic Personnel Registry, and no block between you and the reader.',
        'Only the current entry’s audience can be changed on the page. An entry under “Previously” keeps the one it had.',
      ]),
      guideSection(
        'When something goes wrong',
        ['Most surprises here are one of these:'],
        [
          'No question arrived — a roster question is asked only when the Fleet’s latest export lists your Character’s exact name and handle, you can see the Fleet, and you have not recorded that Fleet or said No to it before. Where the game writes no roster export, none is asked. You can always record the Fleet yourself.',
          'The Fleet cannot be found — it needs a record on STO Info that you can see. The Fleet pages are where a record is made.',
          'Recording is refused — a Character is in one Fleet at a time, so an entry that would overlap one already recorded is refused. Remove whichever entry is wrong, and try again.',
          'A question has disappeared — one from a Fleet you can no longer see is hidden until you can see it again, and its deadline keeps running. One raised by joining or being accepted is withdrawn if your membership ends first. You can still record the Fleet yourself.',
        ],
      ),
    ],
    relatedLinks: [
      { label: 'Your STO Accounts', route: APP_ROUTES.STO_DASHBOARD_ACCOUNTS },
      {
        label: 'Communities You Follow',
        route: APP_ROUTES.STO_DASHBOARD_FLEETS,
      },
      { label: 'Notifications', route: APP_ROUTES.NOTIFICATIONS },
      { label: 'Contact us', route: APP_ROUTES.CONTACT },
    ],
  },
  {
    slug: 'applying-to-a-fleet',
    title: 'Joining and applying to a Fleet',
    summary:
      'How a Fleet recruits, joining or applying with a Character, invitations, and running recruitment.',
    sections: [
      guideSection('What it is for', [
        'Recruitment is how you become a member of a Fleet on STO Info: an approved member, who can see what the Fleet keeps for its members. Every way in, whether joining, applying or accepting an invitation, is made with one of your Characters.',
        'It happens here and only here. STO Info cannot invite anybody in game, so an officer still sends the in-game invitation, and you confirm the Fleet on your Character’s page once they have.',
      ]),
      guideSection('Who can use it', [
        'Anybody signed in with a Character on the Fleet’s platform can join, apply or accept an invitation. Signed out, you can read how a Fleet recruits but not act on it. The Community’s Owner already has every one of its Fleets’ access, so never needs to join.',
        'Running recruitment belongs to the Community’s Owner and to the Admins of the Community or the Fleet. An Officer does only the parts the Owner has given them: “View applications”, “Decide applications”, “Manage members” or “Manage recruitment”.',
      ]),
      guideSection('Where to find it', [
        'On a Fleet’s own page, under Recruitment. It says how the Fleet recruits, lists any requirements, and offers what you can do. Applying opens a page of its own.',
        'Everything you have sent, and any invitation waiting for you, is on Your Fleet applications, linked from your Dashboard as Your Fleet Applications. Those who run recruitment use the Fleet’s Recruitment tab.',
      ]),
      guideSection(
        'How a Fleet recruits',
        ['A Fleet’s page says which of these it is doing:'],
        [
          '“Open: anybody who meets the requirements may join.” — choose a Character and you are a member at once.',
          '“Taking applications: the Fleet’s officers decide each one.” — fill in the Fleet’s form and wait for a decision.',
          '“By invitation only.” — nobody can join or apply, but an officer may invite you.',
          '“Not recruiting.” — the same. It removes nobody already in.',
        ],
      ),
      guideSection(
        'How to join or apply',
        [
          'Open the Fleet’s page and find Recruitment. Only your Characters on the Fleet’s platform are offered. A Fleet may ask for a minimum level and allow only some factions, checked against your Character’s record here. Anything it adds in its own words is for you to read.',
        ],
        [
          'Open — choose a Character under “Your Character in this Fleet” and press “Join this Fleet”.',
          'Taking applications — press “Apply to join”, choose “Your Character”, answer the questions and press “Send the application”. Every question not marked “(optional)” must be answered. The Fleet’s recruiters see your answers, your Character’s level and faction, and what the Fleet’s roster says about the Character.',
        ],
      ),
      guideSection(
        'How to follow an application',
        [
          'A decision is shown on Your Fleet applications, not sent as a notice. A Character may have one application waiting with a Fleet at a time, and may apply again once it is decided or withdrawn.',
          'Once you are in, a question waits on your Character’s page. Choose “Yes, I am in this Fleet” there after an officer has invited you in game.',
          'Each application is listed, newest first, with its status:',
        ],
        [
          'Waiting for a decision — you can “Withdraw” it while it waits.',
          'Accepted — you are a member here, with any note the officer wrote.',
          'Rejected — always with a reason, which you are shown.',
          'Withdrawn — you took it back.',
        ],
      ),
      guideSection('How invitations work', [
        'An officer can invite you by your STO Info username, whether or not the Fleet is recruiting. An invitation skips the Fleet’s requirements and stands for 14 days. While it is open you can see the Fleet’s page, even one only its Community can normally see.',
        'Answer it on Your Fleet applications: choose your Character, then “Accept” or “Decline”. On the Fleet’s page the same choice reads “Accept the invitation”. Accepting makes you a member at once.',
      ]),
      guideSection('How to leave a Fleet', [
        '“Leave this Fleet”, on the Fleet’s page, ends your membership here once you confirm it, along with any role you hold at the Fleet. It does not take you out of the Fleet in game, or change your Character’s own Fleet record.',
        'You are taken to Your Fleet applications afterwards. A Fleet only its Community can see may be gone from view once you have left.',
      ]),
      guideSection(
        'How to run recruitment',
        [
          'The Recruitment tab leads to whichever of these you have been given:',
        ],
        [
          'Applications — filtered as Waiting, Accepted, Rejected or Withdrawn. Open one, choose “Accept” or “Reject” under “Decide”, and press “Record the decision”.',
          'Invitations — who has been invited, and by whom. Those who may decide applications can invite an “STO Info username” and “Withdraw” an open invitation.',
          'Members — with “Suspend…”, “Reinstate…” and “Remove…”, each asking for a reason.',
          'Settings — the “Recruitment” state, a “Minimum level”, the “Factions allowed” (tick none to allow every faction), “In your own words”, and an “Application form” of up to 20 questions.',
        ],
      ),
      guideSection('How to decide and look after members', [
        'An application shows the answers as the form stood when it was sent, and what the roster says about the Character. A roster shows who the game listed, not who plays them, so it proves nothing.',
        'A rejection needs a reason. The applicant is shown it, or your note on an acceptance. Nobody decides their own application.',
        'A suspended member keeps their place but loses everything membership gives until reinstated. They are told, but never why. Somebody holding a role at the Fleet cannot be suspended or removed until the role is taken away.',
        'Each save of the settings is a new version. An application already sent keeps the form it was sent against.',
      ]),
      {
        heading: 'How membership opens chat',
        paragraphs: [
          'A member takes part in the Fleet’s chat channels, and in its Armada’s and its Community’s. Following never does. Leaving, a removal or a suspension closes those channels to them at once.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'Your applications and invitations are listed on your own page, for you.',
        'An application is read by the Community’s Owner, the Admins, and any Officer given “View applications”. The same people see who has been invited.',
        'The Members page, with any suspension and its reason, is for those who may manage the Fleet’s members.',
      ]),
      guideSection(
        'When something goes wrong',
        ['The page gives the reason in its own words. The usual ones:'],
        [
          '“This Fleet has changed its application form since you opened it. Reload it and answer again.”',
          '“That Character already has an application waiting with this Fleet.” — withdraw it, or wait for the decision.',
          'A level refused — the level on your Character’s record here is what is checked. If it has none, record it on the Character’s page first.',
          '“This Fleet does not take Characters of that faction.”',
          'No Character to choose — only Characters on the Fleet’s platform are offered. Add one from your Dashboard first.',
          '“This invitation has lapsed or has already been answered.”',
          'For officers, “This application changed since you opened it. Reload it and decide again.” — somebody else decided it first.',
          'For officers, “This member holds a role in the Fleet. Remove the role first.”',
        ],
      ),
    ],
    relatedLinks: [
      {
        label: 'Your Fleet applications',
        route: APP_ROUTES.FLEET_MY_APPLICATIONS,
      },
      { label: 'Browse Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Your STO Accounts', route: APP_ROUTES.STO_DASHBOARD_ACCOUNTS },
    ],
  },
  {
    slug: 'armadas',
    title: 'Armadas',
    summary:
      'How a Community’s Fleets join and leave an Armada, where each sits, and what belonging to one gives a Fleet’s members.',
    sections: [
      guideSection('What it is for', [
        'An Armada is a group of allied Fleets from one Community, arranged the way Star Trek Online arranges them: one Alpha, up to three Betas, and up to three Gammas under each Beta. It is optional: a Community holds its Fleets directly, and an Armada groups some of them.',
        'On STO Info an Armada is kept by hand. Roster exports say nothing about Armadas, so an import never adds a Fleet to one, moves it or takes it out: every placement was made by a person.',
      ]),
      guideSection('Who can use it', [
        'Anybody who can see an Armada can read its shape and its history, signed in or not.',
        'Asking to join, withdrawing a request and leaving are done for a Fleet by the Community’s Owner, the Admins of the Community or the Fleet, and any Officer given “Request an Armada”.',
        'Answering requests, moving Fleets and taking them out belong to the Armada’s managers: the Community’s Owner and Admins, the Armada’s own Admins, and any Officer given “Manage the Armada”. Closing an Armada is for the Community’s Owner.',
      ]),
      guideSection('Where to find it', [
        'The Armadas tab of the Fleet directory lists them. An Armada’s page shows “Fleets in this Armada”, with tabs for its News, Activity, Events and History, Requests for its managers, and Manage for its Owner and Admins.',
        'A Fleet’s page has an Armada section saying which Armada it is in and where. A Community’s page lists its “Armadas and Fleets”, ending with “Fleets not in an Armada”.',
      ]),
      guideSection(
        'How a Fleet asks to join',
        [
          'On the Fleet’s page, under Armada, choose the Armada, add a “Message (optional)” if you like, and press “Ask to join”. A Fleet has one open request at a time, “Withdraw the request” takes it back, and a request unanswered after 14 days lapses.',
          'Only Armadas the Fleet could join are offered:',
        ],
        [
          'Same Community — an Armada takes only its own Community’s Fleets. A Fleet recorded with no Community cannot join one.',
          'Same platform.',
          'Same allegiance — an Armada is Federation or Klingon, and the Fleet must match it exactly.',
          'One at a time — a Fleet sits in at most one Armada.',
        ],
      ),
      guideSection('How requests are answered', [
        'On the Armada’s Requests tab, “Approve…” asks for a “Position”: Alpha, Beta, or Gamma under a Beta you choose, from those with room. “Reject…” asks for a reason, which the requesting Fleet is shown.',
        'Whoever asked is told in STO Info of an approval, a rejection with its reason, or a lapse. An answered request never changes, and a Fleet turned down can ask again.',
      ]),
      guideSection(
        'How to move, remove or leave',
        ['Every one of these needs a reason, kept with the change:'],
        [
          '“Move…” and “Remove…” — the Armada’s managers use them on each Fleet under “Fleets in this Armada”. When a Beta stops being one, the manager says what becomes of each Gamma under it: moved under another Beta, made a Beta, or taken out too. A removed Fleet’s Owner and Admins are told, with the reason.',
          '“Leave the Armada…” — the Fleet’s own managers use it on the Fleet’s page. A Beta with Gammas under it cannot leave on its own: an Armada manager has to move those Gammas or take them out first.',
        ],
      ),
      guideSection('How closing changes an Armada', [
        'The Alpha can leave without taking the Betas with it. The slot shows as “Empty” until another Fleet is placed there.',
        'Closing a Fleet takes it out of its Armada. If it was a Beta, its Gammas become Betas where there is room, and otherwise leave.',
        'The Community’s Owner can close an Armada from its Manage tab, typing its name to confirm. That takes every Fleet out of it, cancels any request waiting and ends every role there, and it cannot be undone. Its Fleets are then free to join another.',
      ]),
      guideSection('How belonging to an Armada affects members', [
        'While a Fleet sits in an Armada, each approved member of that Fleet is a member of the Armada too, and sees what the Armada shows its members. It never opens another Fleet’s roster.',
        'It lasts exactly as long as the Fleet stays. When the Fleet leaves or is taken out, or you leave the Fleet, that membership ends at once, and so does any role you hold at the Armada because of it.',
      ]),
      {
        heading: 'How Armada chat works',
        paragraphs: [
          'Members of a Fleet in an Armada take part in the Armada’s chat channels as well as their Fleet’s and their Community’s. When the Fleet leaves the Armada, those channels close to its members at once.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'An Armada is seen by whoever can see its Community; it has no visibility setting of its own.',
        'Its History tab lists every placement, move and departure, newest first. Who made each change, and why, is shown only to the Armada’s members and role holders. A Fleet you may not see keeps its place as “A Fleet you cannot see”.',
        'Requests waiting are seen by the Armada’s managers. The Fleet’s page shows those who may ask for it how its last request was answered, and why.',
      ]),
      guideSection(
        'When something goes wrong',
        ['The page usually says what is in the way:'],
        [
          '“No open Armada in this Community takes Fleets on this platform with this allegiance.” — there is nothing the Fleet could join yet.',
          '“An Armada is Federation or Klingon, and this Fleet’s allegiance is not set to either.” — the Community’s Owner sets it on the Fleet’s Settings page.',
          'A change is refused — it would leave the Armada out of shape, such as a Gamma under nothing or a Beta with a fourth Gamma. The refusal names what does not fit.',
          'An allegiance will not change — an Armada’s cannot while a Fleet is placed in it, and a placed Fleet’s cannot change at all.',
          'The Armada in game has changed but not here — nothing is read from the game. Ask the Armada’s managers to record the change.',
        ],
      ),
    ],
    relatedLinks: [
      { label: 'Browse Armadas', route: APP_ROUTES.FLEET_ARMADAS },
      { label: 'Browse Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
    ],
  },
  {
    slug: 'fleet-holdings',
    title: 'Fleet holdings',
    summary:
      'The tier of each of a Fleet’s holdings, recorded by hand, and who sees what.',
    sections: [
      guideSection('What it is for', [
        'The Holdings tab shows how far a Fleet has got with each of its holdings, from the Fleet Starbase to the Fleet Colony World, track by track.',
        'It is kept by hand. Nothing is read from the game or worked out from contributions, and there is no XP here: a tier is what somebody recorded, and nothing else sets it.',
      ]),
      guideSection('Who can use it', [
        'Anybody who can see the Fleet can read its holdings, signed in or not.',
        'Recording them belongs to the Community’s Owner and to the Admins of the Community or the Fleet. The Owner can give “Record holdings” to the Fleet’s Officers, or to one person.',
      ]),
      guideSection('Where to find it', [
        'Open a Fleet’s page and choose the Holdings tab. Every Fleet a Community holds has one, on every platform.',
      ]),
      guideSection('How to read the holdings', [
        'Each holding is shown with its own track and its departments, each as a tier out of its highest, such as “2 of 5”, with when it was last recorded. Tier 0 means not started, and a track nobody has recorded reads as tier 0, last recorded “Never”.',
        'The tiers follow the holdings catalogue, read from the STO Wiki. Each holding says which wiki page its tiers come from, and as of which date.',
      ]),
      guideSection(
        'How to record a holding',
        [
          'One save records one holding. A tier can go down as well as up, to put a mistake right, and each track is checked only against its own tiers, never against the others.',
        ],
        [
          'Press “Record…” under the holding.',
          'Choose the tier for each track that has changed.',
          'Add a reason under “Why (optional)”, if it helps.',
          'Press “Record”. It stays greyed out until a tier changes, and only the tracks you changed are recorded.',
        ],
      ),
      guideSection('How the history is kept', [
        'Beneath the holdings, History lists every save, newest first: the holding, each track’s move from one tier to another, and the reason if one was given.',
        'A history entry cannot be edited or removed. A correction is a new save, and it shows as one.',
      ]),
      guideSection('Who can see it', [
        'Holdings are public: whoever can see the Fleet sees its tiers and their history, signed in or not. There is no audience to choose.',
        'Who recorded each change is shown only to the Fleet’s members, those who run it, and anybody who may record holdings. Anybody else sees the change without a name.',
      ]),
      guideSection(
        'When something goes wrong',
        ['Most surprises here are one of these:'],
        [
          'No “Record…” button — you have not been given recording at this Fleet, or the Fleet is closed or suspended. Its holdings cannot change then, though its history stays readable.',
          '“Record” stays greyed out — no tier has changed yet.',
          'No Holdings tab — only a Fleet a Community holds has one. A Fleet recorded with no Community has none.',
          'The tiers do not match the game — nothing here is read from the game. Ask one of the Fleet’s recorders to correct them.',
        ],
      ),
    ],
    relatedLinks: [
      { label: 'Browse Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Browse Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
    ],
  },
];

/** News, events, chat, what is kept, and what moderators do. */
const FLEET_COMMUNICATION_GUIDES: HelpGuide[] = [
  {
    slug: 'fleet-news-and-activity',
    title: 'News and activity',
    summary:
      'A Community’s, Fleet’s or Armada’s own news, its activity feed, and which things reach you as a notice instead.',
    sections: [
      guideSection('What it is for', [
        'Every Community, Fleet and Armada has news of its own: posts its writers publish for the people they choose. Beside it runs an activity feed, a quiet record of what has happened there, such as a post published, an event added or a member joining.',
        'Neither appears in the site’s own News, and a Community’s news and activity are its own, not its Fleets’ or Armadas’.',
      ]),
      guideSection('Who can use it', [
        'Anybody who may see a Community, Fleet or Armada may read the posts published to them there, and its activity, signed in or not.',
        'Writing is for whoever holds Write news there: the Owner and Admins, and any Officer or person the Owner has given it under Delegation. A Community’s Owner and Admins write for its Fleets and Armadas too.',
        'Your own feed needs you signed in.',
      ]),
      guideSection('Where to find it', [
        'On a Fleet or an Armada, the News and Activity tabs. On a Community’s page, the News section shows the latest posts with All news beneath, and the Activity section the latest items with All activity.',
        'Your own feed is Your Fleet activity, on Communities You Follow in your Dashboard: what has happened in the Communities you follow and the Fleets and Armadas you belong to.',
      ]),
      guideSection('How to write and publish a post', [
        'Choose Write a post. Give it a Title, a “Summary (optional)” for the news list, and the post itself under “Post (Markdown)”. Preview shows how it will read; Write takes you back.',
        'Save draft keeps it where only the news writers can read it. Publish puts it in front of its readers, dated from that moment.',
      ]),
      guideSection('How to add a cover', [
        'Save the post as a draft first, then choose Set the cover beneath the editor, crop the picture and answer “What does this picture show?”. Replace the cover and Remove the cover change it later.',
        'A new cover is checked for safety before it appears. It is shown to whoever may read the post, and a link to the picture copied from the page stops working at the end of the next day (UTC).',
      ]),
      guideSection(
        'How to choose who may read it',
        [
          '“Who may read it” offers three choices, worded for the kind of place the post belongs to. The first is the default.',
          'A post never reaches more people than can see the Community, Fleet or Armada itself, and narrowing who can see the place narrows its posts with it. You can change a post’s readers at any time, and the change applies at once.',
        ],
        [
          'Anyone, including signed-out visitors.',
          'The Community’s followers and members.',
          'Its own members: Members of the Community’s Fleets, its Owner and Admins; Approved members of the Fleet; or Members of the Armada’s Fleets.',
        ],
      ),
      guideSection('How to change, unpublish or delete a post', [
        'Open the post and choose Edit, then Save changes. Unpublish takes it back to a draft; publishing it again dates it afresh.',
        'Delete removes the post and takes its cover down. It cannot be put back, so unpublish instead if you might want it again.',
        'The news writers can switch the list between Published and Drafts, and anybody can use “Search titles and summaries”.',
      ]),
      guideSection('How the activity feed works', [
        'Each item is one sentence, newest first, linking to where you can read more. It is written from how things stand now: a post taken back to a draft, or an event narrowed to fewer people, drops out of the feed for anybody who can no longer see it.',
        'People are named by username alone. A post or an event is named by its title, but an item never quotes a post, gives a reason or repeats a line of a roster: a roster import shows only how many members it listed, joined and left. Feeds keep the last twelve months.',
      ]),
      guideSection('How activity differs from a notification', [
        'Activity is something you look at; nothing on a feed is sent to you. A notification, under Notifications, is sent to you alone because it needs you, such as a reminder of an event you asked about, or your Fleet membership being suspended.',
        'The What you are notified about guide, in the STO Info settings section of Help, lists the notices and the switch that stops each.',
      ]),
      {
        heading: 'How chat’s notices fit in',
        paragraphs: [
          'Chat’s mentions, replies and direct messages are notices too, never activity. The Fleet chat guide explains them.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'A post is shown only to the readers it was published to, asked afresh every time it is read. In the list each carries a badge, Public, Community or Members only, and a post’s own page says who it is “For”.',
        'Drafts are seen by the news writers alone. A post’s author is shown by username to everybody who may read it, and the name links to their profile only where the registry would show them to you.',
        'Activity follows the same rule, item by item. Members joining and leaving, roster imports, roles, a new Owner and a closure are shown to members only; news and events to whoever may read them now; the rest to whoever may see the place.',
      ]),
      guideSection('When something goes wrong', [
        '“No post answers to that address” means the post has been deleted or unpublished, or it is not shown to you.',
        'If the editor cannot save, it says why under “Not saved”, and what you wrote stays in the form.',
        'While a Community, Fleet or Armada is suspended, its news cannot change until it is reinstated, though its published posts stay readable and its drafts can still be deleted. Once it is closed, the same holds for good. The news page tells its writers which it is.',
        'A notice you expected but did not get may have been switched off. Check the What you are notified about guide.',
      ]),
    ],
    relatedLinks: [
      {
        label: 'Communities You Follow',
        route: APP_ROUTES.STO_DASHBOARD_FLEETS,
      },
      { label: 'Notifications', route: APP_ROUTES.NOTIFICATIONS },
      { label: 'Your settings', route: APP_ROUTES.STO_DASHBOARD_SETTINGS },
      { label: 'Browse Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
    ],
  },
  {
    slug: 'fleet-events',
    title: 'Events',
    summary:
      'Scheduling events, answering them as a Character, places and waitlists, reminders and attendance.',
    sections: [
      guideSection('What it is for', [
        'Every Community, Fleet and Armada has a calendar. An event can happen once or repeat, is shown to the people it is for, and lets them say whether they are coming. It can carry a link, such as a Discord event, but what happens on the night happens in the game.',
      ]),
      guideSection('Who can use it', [
        'Its members can answer an event and, when it is for Anyone, so can anybody signed in. Asking for reminders needs you signed in.',
        'Organising is for whoever holds Manage events there: the Owner and Admins, and any Officer or person the Owner has given it under Delegation. A Community’s Owner and Admins manage its Fleets’ and Armadas’ calendars too.',
      ]),
      guideSection('Where to find it', [
        'The Events tab on a Fleet or an Armada, and the Events section on a Community’s page, with The full calendar beneath it. The calendar shows a Month or an Agenda, one month at a time.',
        'Your upcoming events, on Communities You Follow in your Dashboard, lists the next thirty days of what you answered Going or Maybe, are waiting for, or asked to be reminded of.',
      ]),
      guideSection('How times are shown', [
        'Every event runs on one clock, the one its organiser chose: the Community’s own zone unless they picked another. A repeating event keeps to that clock across daylight saving, so an event at eight on Fridays is at eight every Friday there.',
        'You see times in your own zone, set under “Show dates and times in”. Where the two clocks differ, a time is followed by the event’s own, and the event’s page says which clock it is on.',
        'Where daylight saving repeats a time the event takes the first, and where it skips one the event starts later by the jump. The occurrence says so.',
      ]),
      guideSection(
        'How to organise an event',
        [
          'Choose New event. Before you choose Create the event, Show what it comes to lists every occurrence over the next year, on the event’s clock and yours, and names any month a monthly event skips for want of its day. The form asks for:',
        ],
        [
          'Title, “Description (Markdown, optional)” and “Link, such as a Discord event (optional)”.',
          '“Who it is for”, below, and “On the clock of”, the zone its times are set in.',
          '“How often”: Once, Weekly, Monthly, on a day, or Monthly, on a weekday. A repeating event runs every 1 to 12 weeks or months, and ends Never, On a day, or After a number of times, up to 500.',
          'The day, the Start, and “Minutes long (5 to 1440)”.',
          '“Places for Going (1 to 1000; empty for no limit)”.',
        ],
      ),
      guideSection(
        'How to choose who it is for',
        [
          'An event is never shown to somebody who cannot see its Community, Fleet or Armada, whatever is chosen here. “Who it is for” offers:',
        ],
        [
          'Anyone, the default.',
          'The Community’s followers and members.',
          'Members of the Fleet or the Armada, or for a Community the members of its Fleets, its Owner and Admins.',
          'The Owner, Admins and Officers of the Fleet, the Armada or the Community.',
          'Chosen Fleets and roles: tick roles and, for a Community’s or an Armada’s event, which of the Community’s Fleets.',
        ],
      ),
      guideSection('How to change or cancel an event', [
        'On the event’s page, Change from now on opens the form again, and Save from now on changes only what lies ahead. What has started is left alone, and an occurrence the new rule still names keeps its answers, moving if its time changed.',
        'Move this one and Cancel this one act on a single occurrence, and a moved one says where it moved from. Cancel the event cancels everything still to come.',
      ]),
      guideSection('How to answer', [
        'Each occurrence takes its own answer: Going, Maybe or Can’t go, open until it starts. Take my answer back withdraws yours. “As which Character (optional)” lets you answer as one of your own Characters, from any of your accounts.',
        'Maybe holds no place. When every place is taken, Going puts you on the waitlist, and your answer says where you are in line. When a place comes free before the start, the first person waiting gets it and is told. More places are given out the same way; fewer takes nobody’s place away.',
      ]),
      guideSection('How reminders work', [
        'Under Remind me on the event’s page, tick 15 minutes before, An hour before or A day before, in any combination, and choose Save reminders. They cover every occurrence, arrive under Notifications, and you are also told when one is moved or cancelled.',
        'Untick them all and choose Stop reminding me to end them. The Event reminders switch in Settings stops every reminder at once.',
      ]),
      guideSection('How attendance is recorded', [
        'Once an occurrence has started, the event managers can mark each person under Who came as Came or Did not come: anybody who answered, and any member who did not. Each is recorded as the Character they answered with, if any, and a second record corrects the first.',
        'Attendance is kept apart from answers and never worked out from them. You see your own on the occurrence, such as “You were recorded as having come.” The managers can also read the event’s Change log, and a Fleet’s attendance feeds the reports the Fleet reports guide covers.',
      ]),
      guideSection('Who can see it', [
        'Anybody an event is shown to sees how many are going, might go and are waiting. Who answered, by username and Character, is shown to members and the event managers. Only the managers see who can’t go, and attendance is seen by the managers and each person alone.',
        'All of this is asked afresh every time, so leaving a Fleet hides its members’ events from you at once. Events are never deleted: a cancelled one stays readable.',
      ]),
      guideSection('When something goes wrong', [
        'An event that will not open may not be shown to you, or the address may have changed. A cancelled occurrence, or one that has started, cannot be answered.',
        'While a Community, Fleet or Armada is suspended, no event can be added, nothing ahead can change, and answers cannot be given or taken back until it is reinstated. Closing it cancels everything still to come. The calendar tells its managers which it is.',
        'A time that looks an hour out is usually a zone. Check which clock the event is on, and the Dates and times guide for your own.',
      ]),
    ],
    relatedLinks: [
      {
        label: 'Communities You Follow',
        route: APP_ROUTES.STO_DASHBOARD_FLEETS,
      },
      { label: 'Open the Fleet Directory', route: APP_ROUTES.FLEETS },
      { label: 'Your settings', route: APP_ROUTES.STO_DASHBOARD_SETTINGS },
    ],
  },
  {
    slug: 'fleet-chat',
    title: 'Fleet chat',
    summary:
      'Channels for your Fleet, Armada and Community, direct messages between friends, and what chat does with what you write.',
    requiresFeature: 'CHAT',
    sections: [
      guideSection('What it is for', [
        'Chat is live conversation for the people in a Fleet, its Armada and its Community, and between friends. It is for talking now: you can read back the last four hours, and nothing older.',
        'Messages are plain text. Emoji from your own keyboard work like any other character; there are no attachments, reactions, threads or group conversations.',
      ]),
      guideSection('Who can use it', [
        'Members, never followers. A Fleet’s approved members take part in its channels, its Armada’s and its Community’s; a Community’s channels are for its own members and the members of every Fleet in it. Officers, Admins and the Owner also reach the channels kept for them.',
        'Direct messages are only between friends, and only while neither has blocked the other. Leaving a Fleet, or having your membership suspended, closes its chat to you at once.',
      ]),
      guideSection('Where to find it', [
        'Chat has a page of its own. Reach it from the Chat tab in the Community section, Open chat on Communities You Follow, or the Chat tab on a Fleet or Armada you belong to.',
        'The list down the side groups channels under each Community, Armada and Fleet, then your Direct messages. To start a conversation with a friend, open their profile and choose Message.',
      ]),
      guideSection('How channels work', [
        'Every Community, Fleet and Armada has one standard channel, General, for all its members. It cannot be renamed or archived.',
        'Its chat moderators, the Admins and Owner and anybody the Owner gives Moderate chat under Delegation, can add up to three more with Add channel. Each has a Name, “Who reads it” and “Who posts in it”: Members, Officers and up, Admins and the Owner, or The Owner. Posting is never open to more people than reading, and a channel kept for a role is marked with it in the list.',
        'A channel can be changed later, or archived. Nobody reads or posts in an archived channel again.',
      ]),
      guideSection('How to send, reply and mention', [
        'Enter sends and Shift+Enter starts a new line. A message can be up to 2,000 characters, and a count appears as you near the end. You can send ten messages in any ten seconds.',
        'Reply, beside a message, shows who wrote it and its first 80 characters above yours; Escape stops replying. Once that message is deleted or older than four hours, the reply shows “Earlier message” instead.',
        'In a channel, type @ and the start of a name, then pick somebody who can read it from the list. Only people picked from the list are mentioned and told; there is no way to mention everybody.',
        'Delete, beside your own message, leaves “Message deleted” in its place for everybody. Messages cannot be edited.',
      ]),
      guideSection('How online and writing work', [
        'Online means having STO Info open, never being in the game. A friend who is online has a dot beside their name under Direct messages, and Online on their profile.',
        '“Who can see when I am online”, “Appear offline” and “Show when I am typing” are under Fleet in Settings; the Fleet settings guide explains each.',
      ]),
      guideSection('How blocks affect chat', [
        'A block reaches into chat both ways, and neither of you is told. Each other’s messages show as “Message from a member you can’t see”. You cannot mention or reply to each other, neither sees the other online or writing, and a direct conversation between you closes, its history hidden.',
        'A conversation also closes when you stop being friends. Become friends again and it reopens, with the last four hours to read. The Blocking and reporting guide covers blocking itself.',
      ]),
      guideSection('How to report a message', [
        'Report, beside somebody else’s message, sends it to the site’s administrators, not to the Fleet’s own officers. Choose a Reason and say “What is wrong”, which is optional unless you choose Something else.',
        'They see the message, the twenty before it, and your username. The person you report is never told, and you are thanked but not told what happens. You can report a message once.',
      ]),
      guideSection('How chat stays connected', [
        'If chat loses its connection it says Reconnecting, sends anything you wrote meanwhile once it is back, and catches up on what you missed.',
        'Chat can be open in five tabs or devices at once. Open another and the oldest gives way, saying “Chat is open elsewhere”; Use chat here takes it back.',
        'Elsewhere on the site, a new direct message or a mention of you pops up as a small notice, unless you have that chat open. It says who and where, never what.',
      ]),
      guideSection('Who can see it', [
        'A channel is read by the people its reading role admits, and a conversation by the two of you alone, never further back than four hours.',
        'A channel’s chat moderators can remove anybody’s message there, and a site administrator can remove one that was reported. It then shows as “Message removed by a moderator” for everybody, and the reason given is not shown to its author.',
        'A channel’s Admins and Owner can export a transcript of it; nobody can export a conversation between friends. Site administrators read chat only through reports and the holds they place. The How long things are kept guide gives the times.',
      ]),
      guideSection('When something goes wrong', [
        'A message marked Not sent can be sent again with Try again, or dropped with Discard. Sending too many too quickly is the usual reason.',
        '“You can read this channel, but not post in it” means the channel lets fewer people post than read, or its Community, Fleet or Armada is closed or suspended.',
        '“That chat is not there, or you can no longer read it” means it has closed to you: you left, lost the role it needs or were suspended, or, for a conversation, you are no longer friends.',
        'A fourth added channel is refused: “This has three custom channels already. Archive one to make another.” “Signed out” means your session has ended; sign in again.',
      ]),
    ],
    relatedLinks: [
      { label: 'Open chat', route: APP_ROUTES.CHAT },
      { label: 'Your friends', route: APP_ROUTES.COMMUNITY_FRIENDS },
      { label: 'Your settings', route: APP_ROUTES.STO_DASHBOARD_SETTINGS },
    ],
  },
  {
    slug: 'how-long-things-are-kept',
    title: 'How long things are kept',
    summary:
      'What Fleet Community keeps and for how long, and the difference between removing something and having it erased.',
    sections: [
      guideSection('What it is for', [
        'Fleet Community keeps some things for a set time and then forgets them, on a daily schedule that runs even while Fleet Community is switched off. This guide gives the times, and explains what you can remove yourself and what has to be asked for.',
      ]),
      guideSection('Who can use it', [
        'Everybody. The same times apply to everybody’s things, whatever your role, and erasure can be asked for with or without an account here.',
      ]),
      guideSection('Where to find it', [
        'The same times are in the Privacy Policy, under How Long We Keep Your Data. Pages say so where it matters: an Activity page shows the last twelve months, and an import whose file has gone reads File expired.',
      ]),
      {
        heading: 'How long chat is kept',
        paragraphs: [
          'Members can read back four hours in any channel or conversation, and nothing older; the start of a chat says “You can read back the last four hours here.” Messages are kept longer than that, as below.',
          'Every message is deleted 45 days after it was sent. Deleting your own message takes its words off everybody’s screen at once; the message itself goes with the rest at 45 days.',
          'A channel’s Admins and Owner can export a transcript of it from any time in the last seven days, giving a purpose that is logged and printed at its head. Only the person who asked can download it, for 24 hours, and each download is logged. Then the file is deleted.',
        ],
        requiresFeature: 'CHAT',
      },
      {
        heading: 'How reports and holds are kept',
        paragraphs: [
          'A reported message is copied, with the twenty before it, and kept with the report so it can be judged. A report and its copies are deleted 90 days after it is decided.',
          'A site administrator can hold a report past its 90 days, or everything one member wrote in chat past the 45 days, for an investigation. Every hold has a reason and a review date no more than 180 days ahead. One that passes its review date is flagged, and released automatically 14 days later unless it is extended first. Once released, what it kept goes with the next deletion.',
          'If your messages are held when you close your account, the account is erased only once the hold ends.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection(
        'How long everything else is kept',
        ['The rest, at a glance:'],
        [
          'Activity — twelve months.',
          'News posts that are deleted — removed for good 30 days later.',
          'Fleets you remove from your own Characters — removed for good 30 days later.',
          'Roster exports — the copy kept of an uploaded export is deleted 180 days after upload. The roster history read from it stays with the Fleet.',
          'Events — never deleted. A cancelled event stays readable, its answers and attendance with it.',
          'A closed Community, Fleet or Armada — kept, with its address and its history. Closing is not deleting.',
        ],
      ),
      guideSection('How removing your own things works', [
        'A news post you delete disappears from its readers straight away, cover and all, and cannot be put back. Unpublishing keeps it as a draft instead.',
        'Removing a Fleet from your own Character’s page, or saying No when a Fleet asks whether your Character is in it, changes only what your Character’s page says. A Fleet’s roster still lists the name it imported.',
        'If you own a Community when you close your account, it is handed to one of its Admins or closed; the Roles, ownership and closing guide explains it.',
      ]),
      guideSection('How to ask for erasure', [
        'If a Fleet’s roster lists your Character and you want it gone from the record itself, ask through Contact us, with or without an account here. A site administrator first checks that it is you, in the game or with some other proof.',
        'Erasure replaces your Character’s name with “Erased member” and your @handle with a stand-in in every Fleet’s roster, empties its public comment, deletes every stored file naming you, and keeps you out of any roster uploaded afterwards. Each Fleet’s head counts still add up. It cannot be undone.',
      ]),
      {
        heading: 'How chat’s records are read',
        paragraphs: [
          'A report’s copies are read only by site administrators. So is what a hold keeps, and they give a purpose every time they read it, which is logged. A Fleet’s own officers never see either.',
          'A transcript can be downloaded only by the person who asked for it. Under Your transcripts on the Chat page it reads Being written, Ready, Not written or Expired.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'An uploaded roster export never keeps its officer-only columns: they are thrown away before anything is stored. What is kept is held privately and checked for malware before anything reads it, and no page shows or downloads the file itself.',
        'Pictures, such as a news post’s cover, are checked for safety before they appear, and one that is taken down stops being shown.',
        'Activity names people by username only, and never quotes a post, gives a reason or repeats a line of a roster.',
      ]),
      guideSection('When something goes wrong', [
        'A deleted news post cannot be put back, so unpublish when you are unsure.',
        'An import that reads File expired was still waiting for a decision when its file reached the end of its 180 days. It was never read into the roster, and can no longer be selected.',
        'If a roster names you and you want that undone, removing the Fleet from your Character is not enough. Ask for erasure through Contact us.',
      ]),
    ],
    relatedLinks: [
      { label: 'Privacy Policy', route: APP_ROUTES.PRIVACY_POLICY },
      { label: 'Contact us', route: APP_ROUTES.CONTACT },
    ],
  },
  {
    slug: 'when-a-moderator-acts',
    title: 'When a moderator acts',
    summary:
      'What you see when something is removed or taken down, a report is decided, or a Fleet, a membership or a registration is dealt with.',
    sections: [
      guideSection('What it is for', [
        'Two kinds of people can step in. A Community’s, Fleet’s or Armada’s own Owner and Admins look after it. The site’s administrators look after the whole of STO Info, and settle what a Fleet cannot settle for itself. This guide describes what their actions look like from where you stand.',
      ]),
      guideSection('Who can use it', [
        'Everybody in a Fleet Community: members, followers and the people who run it. If you run a Community, Fleet or Armada, these are also what your members see.',
      ]),
      guideSection('Where to find it', [
        'An outcome shows where it happened: on the page of the Community, Fleet or Armada, sometimes in its Activity, and under Notifications when it is sent to you.',
        'Its Owner and Admins also see a site administrator’s actions in its history, under Manage, credited to “A site administrator” with the reason given.',
      ]),
      guideSection('How a suspension works', [
        'A site administrator can suspend a Community, a Fleet or an Armada. Its page, and its card in the directory, then say Suspended. Suspending a Community holds its Fleets and Armadas too.',
        'Everything in it stays readable, and nothing can be written, scheduled, answered or changed there. Nothing ends, either: roles, memberships and events stand, and come back into force when it is reinstated. Nobody is sent a notice about it.',
      ]),
      guideSection('How a closure works', [
        'A site administrator can close a Community, Fleet or Armada, as its Owner can. Closing is not deleting: its page, address and history stay, marked Closed, and its members see that it was closed in its Activity.',
        'Roles held there end, and events still to come are cancelled. Unlike a suspension, a closure cannot be reinstated.',
      ]),
      guideSection('How a membership is suspended', [
        'A Fleet’s Owner and Admins, or anybody holding Manage members there, can suspend a member. You are told under Notifications, “Fleet membership suspended”, but never why, and the Fleet’s page says “Your membership of this Fleet is suspended.”',
        'Until it is lifted you have no access to the Fleet, as though you were not a member. Your membership and the date you joined are kept, and when you are reinstated everything comes back and you are told again.',
        'A site administrator does not suspend a single member; they can only disable a whole STO Info account.',
      ]),
      guideSection('How a news post is taken down', [
        'A site administrator can unpublish any Community’s, Fleet’s or Armada’s post, taking it back to a draft its writers can still read and change, or delete it. A reader following a link to it is told no post answers to that address.',
      ]),
      guideSection('How a picture is taken down', [
        'Pictures can be checked again after they appear. If one you uploaded, such as a Fleet’s artwork or a news post’s cover, is found to break the site’s rules for pictures, a site administrator decides whether to take it down.',
        'A picture taken down stops being shown, and you are told “A picture was removed”, without their reason. One that fails a security check is taken down straight away, and you are told the same. Either way you can upload another.',
      ]),
      guideSection('How a dispute is settled', [
        'STO Info cannot check who really leads a Fleet in the game. If you think a Community was registered by the wrong people, or its Owner has vanished, tell the site administrators through Contact us. There is no form for it.',
        'A site administrator sees every registration of the same name side by side, and nothing there says which is real. They can move ownership of a Community to one of its Admins, who does not have to accept, and the former Owner keeps no role; its members see the new Owner named in its Activity. They can also suspend or close what is at fault, or take a read-only look at a Fleet’s roster imports for 24 hours.',
      ]),
      {
        heading: 'How a message is removed',
        paragraphs: [
          'A channel’s chat moderators can remove anybody’s message there, and a site administrator can remove one that was reported. It stays in its place as “Message removed by a moderator” for everybody, straight away, and a reply to it shows “Earlier message”.',
          'The reason is kept for the record. The author is not shown it and is not sent a notice.',
        ],
        requiresFeature: 'CHAT',
      },
      {
        heading: 'How your report is handled',
        paragraphs: [
          'Reports of chat messages go to the site’s administrators alone; a Fleet’s own officers never see them. An administrator decides each one, and may remove the message. You are thanked, and not told what was decided. The person you reported is never told you reported them.',
        ],
        requiresFeature: 'CHAT',
      },
      {
        heading: 'How a hold works',
        paragraphs: [
          'A site administrator can hold a report, or everything one member wrote in chat, beyond its usual deletion, for an investigation. Nothing changes on anybody’s screen: held messages are not shown again. A hold that passes its review date is flagged and released automatically 14 days later unless it is extended first; the How long things are kept guide gives the times.',
        ],
        requiresFeature: 'CHAT',
      },
      guideSection('Who can see it', [
        'A site administrator’s reason for acting on a Community, Fleet or Armada shows in its history, which its Owner and Admins alone read. What site administrators do is also kept in a log only they can read.',
        'You are sent a notice when your Fleet membership is suspended or reinstated, or a picture of yours is taken down. The Owner and Admins of a Community, Fleet or Armada are sent one when a site administrator suspends or reinstates it, and a new Owner when a dispute makes the Community theirs; none of these gives the reason. Other members are not told.',
      ]),
      guideSection('When something goes wrong', [
        'If your membership was suspended, talk to the Fleet’s Admins: lifting it is up to them.',
        'If something you run was suspended, only a site administrator can reinstate it. Ask through Contact us.',
        'If you think a decision was wrong, use Contact us. Say what happened and where, and do not repost what was removed.',
      ]),
    ],
    relatedLinks: [
      { label: 'Notifications', route: APP_ROUTES.NOTIFICATIONS },
      { label: 'Contact us', route: APP_ROUTES.CONTACT },
      { label: 'Terms of Use', route: APP_ROUTES.TERMS_OF_USE },
    ],
  },
];

/** Importing a roster, its history and corrections, and the reports built on it. */
const FLEET_ROSTER_GUIDES: HelpGuide[] = [
  {
    slug: 'importing-a-roster',
    title: 'Importing a roster export',
    summary:
      'Checking a Star Trek Online roster export, importing it into a Fleet, recording the Fleet’s former names, and what is kept.',
    sections: [
      guideSection('What it is for', [
        'A roster export is the file Star Trek Online writes listing a Fleet’s members: each Character and @handle, with their level, class, rank, contribution total, Join Date, Last Active date and public comment.',
        'Each export is a snapshot of one moment. The Fleet’s Roster, History and reports are built from the exports imported, so the more often one is imported, the more they can say.',
        'STO Info cannot tell whether a file really came from the game unchanged: an export is taken at its word. So import only files the game wrote for you, or somebody you trust. Every import keeps who sent it, and an investigator can take a wrong one out of the history.',
      ]),
      guideSection('Who can use it', [
        'Importing needs Import rosters at the Fleet, and recording former names needs Investigate imports. The Owner and Admins hold both, of the Fleet or of its Community; anybody else holds them only if the Owner gives them.',
        'The Fleet has to belong to a Community, and be on a platform where the game writes a roster export. It writes none on either console.',
      ]),
      guideSection('Where to find it', [
        'Open the Fleet’s page and choose Import a roster export. The same button is on the Fleet’s Investigate tab, with Roster imports, which lists every import and what became of it, and Former names.',
      ]),
      guideSection('How to check an export', [
        'Leave the file exactly as the game wrote it. Its name, <Fleet>_YYYYMMDD-HHMMSS.csv, is the only place it says which Fleet and when, so do not rename it, or save it from a spreadsheet.',
        'Choose the file under “The export, as the game wrote it”, check “The clock it was taken on”, and choose Check this export. You are told how it would be read, and the file is thrown away, so check it as often as you like. “Ready to import” means every row was read and the filename checks out; “Not ready to import” shows what has to be settled first.',
      ]),
      guideSection('How to choose the clock', [
        'The file writes every time in the clock of the computer it was exported on, and never says which. The choice starts on the zone picked in Settings under “Read Fleet roster exports as”, or on your device’s zone when that is left on “My device’s zone”. Change it here if this export was taken somewhere else.',
        'A wrong zone does not fail: it quietly moves every date by a few hours. That is why the first rows show each date twice, as the file says it and as it was read, in UTC. Check they agree.',
        'An export taken in the hour the clocks go back names two moments, and you are asked which. A time in the hour they skip going forward is refused, which usually means the zone is wrong.',
        'If the export’s time, or any date in it, comes out later than now, the check warns you, because that usually means the zone is wrong. Check the zone; if it is right, tick “The timezone is right; import it anyway” to import it.',
      ]),
      guideSection(
        'How to import it',
        [
          'Once the check says “Ready to import”, choose Import this export. The import’s own page follows it for up to two minutes while the file is scanned and read:',
        ],
        [
          'Scanning, then Reading — nothing in it is in force yet.',
          'Imported — the export is in the roster and in force.',
          'Held — another export of this Fleet claims the same moment and says something different, so this one waits.',
          'Refused — nothing in it was read. What a scan found is not reported.',
          'Abandoned — it was given up on before it was read. Sending the same export again starts a fresh import, and the abandoned one stays listed.',
          'File expired or File erased — a held export whose file was deleted before anybody chose it.',
        ],
      ),
      guideSection('How to record a former name', [
        'An export names the Fleet as the game called it when the export was taken, so after a rename in game its older exports no longer match. Nothing learns a name from a file; a former name counts only once somebody records it.',
        'On the Investigate tab, choose Former names. Under “Add a former name”, give the name exactly as the filename has it, spaces at either end included, then “Used from”, “Used until” and why, and choose Record this name. Both days count, in your display timezone, and the last one has to be over. Only exports taken between those days match it.',
        'Remove takes a name out of use, with a reason. Imports that already matched it keep their match, and it matches nothing new. Changing the Fleet’s name on its Settings page does not record the old one, so record it here as well.',
      ]),
      guideSection('How the file is kept', [
        'An officer’s export carries three Officer Comment columns. They are discarded before anything else reads the file, so nothing written in them reaches STO Info.',
        'What is kept is a clean copy of the other twelve columns, held privately for 180 days from the upload and then deleted; an export in force goes on counting. A row naming somebody whose roster data was erased at their request is rewritten before anything is stored.',
      ]),
      guideSection('Who can see it', [
        'What an export says is shown on the Fleet’s Roster and History tabs, to its approved members only. Its Activity tab tells them a roster was imported, with counts.',
        'The import pages are for whoever may import or investigate, and only an investigator is shown which rows were at fault. Former names are for investigators. A site admin may look in, read-only, and each look is logged with its reason.',
      ]),
      guideSection(
        'When something goes wrong',
        ['Nothing is kept from a file that is refused. The usual causes:'],
        [
          'Not the name the game gave the file — anything added, such as “_PrePromotions”, means the name is no longer evidence. Send it under its original name.',
          'The Fleet named is not this Fleet — the names differ, even by a space or a capital. If the Fleet was renamed in game, record its former name.',
          'Not a roster export — the file has been edited, or saved by a spreadsheet. Export a fresh copy. A row that could be read two ways is refused too, rather than guessed at.',
          'Too large — nothing the game writes is over 2 MiB or 2,000 rows.',
          'Rows that could not be read — a number that is not whole, a date the game does not write, a row with no Character or handle, or two rows for the same Character and handle.',
          'Already imported — you are shown the earlier import. If you gave a different clock or moment, the earlier reading stands; Roster history and corrections explains how to change it.',
          'A former name is refused — it is the Fleet’s name now, or already recorded for part of that time.',
          'Taking longer than usual — after two minutes the page stops checking by itself. Nothing is lost; choose Check again later.',
        ],
      ),
    ],
    relatedLinks: [
      { label: 'Browse Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Fleet Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
    ],
  },
  {
    slug: 'roster-history-and-corrections',
    title: 'Roster history and corrections',
    summary:
      'How imported exports become a history of joins, departures, renames and rank changes, and how that history is corrected.',
    sections: [
      guideSection('What it is for', [
        'The History tab lines a Fleet’s exports up in the order they were taken, and says what changed between each one and the next: who joined, rejoined or left, who was renamed, whose rank or Join Date changed, and how much contribution totals rose.',
        'It is only as exact as the exports. Nothing is dated more precisely than the two exports it lies between.',
      ]),
      guideSection('Who can use it', [
        'The Fleet’s approved members can read the History tab and each member’s timeline, as they can the Roster.',
        'Correcting the history needs Investigate imports. The Owner and Admins hold it, of the Fleet or of its Community; anybody else only if the Owner gives it to them. Being able to import is not enough. Every correction asks why, in up to 500 characters.',
      ]),
      guideSection('Where to find it', [
        'History is a tab on the Fleet’s page, beside Roster. Choose a member’s name on either to open their timeline.',
        'Corrections are on the Investigate tab: Roster imports, where each import’s page has its Corrections and, once it is in force, its Rows; Conflicting exports; Roster identities; and Rank order.',
      ]),
      guideSection(
        'How the history reads the exports',
        ['A few rules decide what the history will claim:'],
        [
          'Order comes from when each export was taken, not when it was uploaded. An older export imported late takes its proper place.',
          'Not being listed means somebody left only on a complete export. Missing from an export marked partial, or on an excluded row, they are unknown there, and being unknown never ends a membership.',
          'A Join Date later than the export before means they left and came back in between.',
          'Contribution is the later total minus the earlier. A fall is a reset, never a negative donation.',
        ],
      ),
      guideSection('How to read the history', [
        'Each block on the History tab is one interval between two exports, newest first, with its members at each end, its joins, departures, renames and rank changes, and what was contributed. Beneath it are the changes the later export revealed, which the boxes under Show narrow by kind.',
        'A member’s timeline shows each stretch of membership, every change, and their row on each export that listed them.',
        'After an import or a correction, the pages may say a change is being worked into the history. It catches up by itself.',
      ]),
      guideSection('How renames are found', [
        'Nothing in an export survives a rename, so a renamed Character looks like one member leaving and another joining. STO Info suggests renames, graded High, Medium or Low confidence, and never joins two names on its own.',
        'Under Roster identities, an investigator can Confirm or Reject a suggestion, and Undo either later. Confirming makes the history show a rename rather than a departure and a join. It never links a name to an STO Info account.',
      ]),
      guideSection('How to order ranks', [
        'Rank names are each Fleet’s own, so a change of rank is only a change until somebody orders them. Under Rank order, an investigator gives each rank a tier, 1 the highest; ranks sharing a tier are equal. A move between two tiers then reads as a promotion or a demotion, as soon as the order is saved. A rank grants nothing on STO Info.',
      ]),
      guideSection(
        'How to correct an import',
        [
          'Open the import from Roster imports. Under Corrections, write why, then choose what to change:',
        ],
        [
          'Take it out — the import stays on record and counts for nothing. Put it back undoes it.',
          'Mark it partial — nobody missing from the export is taken to have left. Mark it complete undoes it.',
          'Read it again — for an export read on the wrong clock. Choose the right one, and every date is read again from what the file said.',
          'Exclude ticked, under Rows — each member a wrong row names becomes unknown at that export, not gone. Put back ticked restores them.',
        ],
      ),
      guideSection('How to settle conflicting exports', [
        'Two exports can claim the same moment and list different rosters. The first stays in force and the other is held. Under Conflicting exports, an investigator chooses Select this one on the export that should stand, with a reason, and the history is rebuilt. A later export that disagrees reopens the moment, and the selection stands until somebody selects again.',
        'An export whose moment another export claims can be read again on its right clock straight away: that takes it out of the clash. If it was the one chosen for the moment, the first version the site saw stands again until somebody chooses.',
      ]),
      guideSection('Who can see it', [
        'The History tab and each timeline are for the Fleet’s approved members. They see only the exports the history stands on, and never an export taken out or not chosen for its moment.',
        'A roster row shows that somebody by that name and handle was listed, never whose Character it is. It links to a Character’s Profile only when the Character’s owner has recorded that membership, and you may see it.',
        'Rank tiers are shown to everybody who can read the roster. Excluded rows, corrections, rename decisions and rank order edits, with who made each and why, are shown to investigators. A site admin may look in, read-only, and each look is logged.',
      ]),
      guideSection(
        'When something goes wrong',
        ['Most surprises in a history have one of these causes:'],
        [
          'A member leaves and a stranger joins in the same interval — it may be a rename nobody has confirmed.',
          'Somebody is shown as having left who never did — the export may not have listed everybody. Mark it partial.',
          'Every date is a few hours out — the export was read on the wrong clock. Read it again.',
          'A correction is refused — only an import in force, or one held while another export of its moment disagrees, can be corrected. Reading it again is also refused when the new clock skipped its time, or a date in the export never happened on it, or when another export already claims the moment it would move to.',
          'A rank order edit is refused — somebody changed the order since you opened it. Open it again.',
          'The history stays catching up — a rebuild that did not start is started again by itself, within about ten minutes.',
        ],
      ),
    ],
    relatedLinks: [
      { label: 'Browse Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Fleet Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
    ],
  },
  {
    slug: 'fleet-reports',
    title: 'Fleet reports',
    summary:
      'The reports a Fleet offers, what each can and cannot say, who sees them, and downloading them.',
    sections: [
      guideSection('What it is for', [
        'The Reports tab turns a Fleet’s records into tables and charts. Five are built from its roster history — Growth, Activity, Tenure, Ranks and Contribution — and three from what the Fleet does on STO Info: Attendance, Recruitment and Holdings.',
      ]),
      guideSection('Who can use it', [
        'Anybody a report is shown to can read it, signed in or not. Whoever holds View reports — the Owner and Admins, and anybody the Owner gives it to — reads every report in full.',
        'The five roster reports are offered only on Fleets whose game writes a roster export. The other three are offered on every Fleet, console ones included.',
      ]),
      guideSection('Where to find it', [
        'Open the Fleet and choose the Reports tab, then a report from the buttons at the top. The tab appears only when at least one report is shown to you. “Who sees each report” is at the foot of the page for whoever reads every report.',
      ]),
      guideSection(
        'How each report reads',
        ['Each report answers one question, over the span you choose:'],
        [
          'Growth — between each export and the next: members at each end, how many joined, rejoined, left or were unknown, and the account handles listed. Handles are counted as handles, never as people.',
          'Activity — each export’s members by how long before it they were last active, from “7 days or less” to “Over 90 days”, or “Not given”.',
          'Tenure — how long each export’s members had been listed in their current stretch, from “Under 30 days” to “2 years or more”. It is what the exports show, not the game’s Join Date.',
          'Ranks — each export’s members under each rank, in the Fleet’s rank order, and the rank changes it revealed.',
          'Contribution — between each export and the next, the total rise in members’ contribution, and how many members it rests on.',
          'Attendance — for each occurrence of the Fleet’s own events: how many were going, how many were recorded as coming and as not coming, and the rate.',
          'Recruitment — month by month, for applications, open joins and invitations: how many came in, how each turned out, and the median days to a decision.',
          'Holdings — every tier a holding’s track moved, newest first. Never who recorded it, or why.',
        ],
      ),
      guideSection('How to choose the span', [
        'A roster report says which revision of the history it stands on and how many exports it covers. It speaks only for those exports, never for the days between them. Choose From and To, then Show, to narrow it; Every export goes back to the whole history.',
        'Attendance, Recruitment and Holdings cover the last twelve months unless you choose otherwise, and The last twelve months puts that back.',
        'Where you are shown a report in full, Tenure and Contribution also list members, for the export you choose under “Members at” or the interval under “Rises between”.',
      ]),
      guideSection('How to read contribution figures', [
        'An export gives each member one running total, so a report can say how far it rose between two exports, never how it was spread over the days between. A fall is a reset, and somebody who left and came back starts from a new baseline.',
        'Each interval says how many members its total rests on: Known, Reset, New and Unknown. A rise says how far a total went up, not what was given or how often.',
      ]),
      guideSection('How to download a report', [
        'Choose Download CSV beside the span. The file holds the tables as you are shown them, over the span you chose, after a few lines naming the report, the Fleet and the span. Every time in it is in UTC, and a figure your view hides is written “< 5”.',
        'A cell a spreadsheet might run as a formula starts with an apostrophe, so every @handle carries one. It is text, not a calculation.',
      ]),
      guideSection('How to choose who sees each report', [
        'Only the Owner can change who sees a report: pick under Shown to, beside the report, and press Save. Each change is kept under Changes, with who made it. The choices are “The Owner and Admins”, the default; “The Fleet’s members, in full”; “The Community’s followers, counts only”; and “Anyone, counts only”. The Fleet’s members only ever see counts of Attendance.',
      ]),
      guideSection('Who can see it', [
        'Each report is seen by the audience its Owner chose, and by whoever holds View reports, but never by anybody who cannot see the Fleet itself. Holdings are shown to anybody who can see the Fleet.',
        'Counts only means never a name, a handle, a comment or one member’s own figure. A figure counting 1 to 4 members is shown as “< 5”, and so is any figure that would let one be worked out from the others. A contribution total resting on fewer than five members is hidden too.',
      ]),
      guideSection(
        'When something goes wrong',
        ['What the page says, and what it means:'],
        [
          '“None of this Fleet’s reports is shown to you.” — its Owner chooses who sees each one.',
          '“No roster has been read into this Fleet’s history yet” — there is nothing to report until an export has been imported.',
          '“There are not two exports in this span” — Growth and Contribution count intervals between exports. Widen the span.',
          '“< 5” where you expected a number — the figure is hidden on purpose, so nobody can be picked out.',
          '“The CSV could not be made. Please try again.” — nothing was downloaded; try again.',
          'The figures look wrong — a report is only as right as the exports behind it. An investigator can correct those, as Roster history and corrections explains.',
        ],
      ),
    ],
    relatedLinks: [
      { label: 'Browse Fleets', route: APP_ROUTES.FLEETS },
      { label: 'Fleet Communities', route: APP_ROUTES.FLEET_COMMUNITIES },
    ],
  },
];

/**
 * The Fleets section, second on the Help home (Steve's decision of 29
 * September 2026).
 *
 * It waits on Fleet Community, but stays listed while that is switched off,
 * with a note saying so, so that its guides can still be found (Steve's
 * decision of 30 September 2026).
 */
export const FLEETS_TOPIC: HelpTopic = {
  id: 'fleets',
  title: 'Fleets',
  intro:
    'Finding a Community, Fleet or Armada, belonging to one or running one, and what its members share with each other.',
  requiresFeature: 'FLEET',
  guides: [
    ...FLEET_BASICS_GUIDES,
    ...FLEET_MEMBERSHIP_GUIDES,
    ...FLEET_COMMUNICATION_GUIDES,
    ...FLEET_ROSTER_GUIDES,
  ],
};
