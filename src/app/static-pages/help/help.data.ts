import { PERMISSIONS } from 'src/app/models/access-control.models';
import {
  REPORT_REASON_LABELS,
  ReportReason,
} from 'src/app/models/moderation.models';
import {
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  ContentRating,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  MARKDOWN_REFERENCE,
  MARKDOWN_REFERENCE_NOTES,
  MarkdownReferenceGroup,
} from 'src/app/storytime/storytime-markdown.constants';
import {
  CONTENT_POLICY_RULES,
  TAG_CATEGORY_DESCRIPTIONS,
  TAG_CATEGORY_LABELS,
} from 'src/app/storytime/storytime.constants';

import {
  HelpGuide,
  HelpGuideLocation,
  HelpGuideSection,
  HelpTopic,
} from './help.models';

/**
 * The links several guides finish with.
 *
 * Named once rather than written out per guide: the same destination described
 * two different ways is the sort of thing that creeps in when a list this long
 * is edited a topic at a time.
 */
const YOUR_STORIES_LINK = {
  label: 'Your Stories',
  route: APP_ROUTES.STORYTIME_MANAGE,
};

const CONTENT_POLICY_LINK = {
  label: 'Content policy',
  route: APP_ROUTES.STORYTIME_CONTENT_POLICY,
};

/**
 * The content policy's rules, worded exactly as the policy page words them.
 *
 * Derived rather than restated. An earlier version of this guide listed seven
 * of the rules from memory, and stayed listing seven after the policy grew to
 * thirteen — which is how a help page ends up telling somebody that a thing
 * the site prohibits is allowed.
 */
const CONTENT_POLICY_POINTS: string[] = CONTENT_POLICY_RULES.map(
  rule => `${rule.title} — ${rule.summary}`,
);

/**
 * The Markdown reference, as guide sections.
 *
 * A guide is headings, paragraphs and points, which is the right shape for
 * prose and the wrong shape for a two-column table. Rather than teach the help
 * section about tables for one guide, each construct becomes a line.
 *
 * Derived from the same constant the popup beside the editor reads, and
 * derived whole rather than picked from, so a construct added to the renderer
 * appears in both places or neither.
 */
const MARKDOWN_SECTIONS: HelpGuideSection[] = MARKDOWN_REFERENCE.map(
  (group: MarkdownReferenceGroup) => ({
    heading: group.heading,
    paragraphs: [group.intro],
    points: group.constructs.map(
      construct => `${construct.syntax} — ${construct.meaning}`,
    ),
  }),
);

/**
 * The content ratings, worded exactly as a reader meets them elsewhere.
 *
 * Built from the same constants the Story cards and warning banners use, so a
 * rating cannot be explained one way in the help and another on the page it is
 * explaining.
 */
const CONTENT_RATING_POINTS: string[] = [
  ContentRating.GENERAL,
  ContentRating.MATURE,
  ContentRating.ADULTS_ONLY,
].map(
  rating =>
    `${CONTENT_RATING_LABELS[rating]} — ${CONTENT_RATING_DESCRIPTIONS[rating]}`,
);

/**
 * The reasons a member can be reported for, worded as the report form words
 * them.
 *
 * Taken from the same labels the dialog renders, so the help cannot offer a
 * reason the form does not, or name one differently.
 */
const REPORT_REASON_POINTS: string[] = [
  ReportReason.HARASSMENT,
  ReportReason.HATE_SPEECH,
  ReportReason.SPAM,
  ReportReason.IMPERSONATION,
  ReportReason.INAPPROPRIATE_CONTENT,
  ReportReason.OTHER,
].map(reason => REPORT_REASON_LABELS[reason]);

/**
 * The tag categories, worded exactly as the tag form words them.
 *
 * Derived from the same constants the picker and the tag admin page read, so a
 * category added to the vocabulary cannot be missing from the guide that
 * explains how to file a tag under one.
 */
const TAG_CATEGORY_POINTS: string[] = Object.keys(TAG_CATEGORY_LABELS).map(
  category =>
    `${TAG_CATEGORY_LABELS[category]} — ${TAG_CATEGORY_DESCRIPTIONS[category]}`,
);

/**
 * The Community guides.
 *
 * The registry is entirely opt-in and its rules compound — a captain shows
 * only when the member, the account and the captain are each marked public —
 * so these guides spend most of their words on who can see what. Somebody who
 * misunderstands that has either hidden themselves by accident or shown more
 * than they meant to.
 */
const COMMUNITY_TOPIC: HelpTopic = {
  id: 'community',
  title: 'Community',
  intro:
    'The Galactic Personnel Registry is the public side of STO Info: the officers who have chosen to be listed, and the friends you keep there.',
  requiresStorytime: false,
  guides: [
    {
      slug: 'the-galactic-personnel-registry',
      title: 'What the registry is',
      summary:
        'The public directory of officers, and what a record actually shows.',
      sections: [
        {
          heading: 'A directory of officers who chose to be in it',
          paragraphs: [
            'The Galactic Personnel Registry is a directory of STO Info members who have decided to make their record public. It is where you find other players, see the captains they command, and let them find you.',
            'Nobody is listed by default. An empty-looking registry is not a quiet site; it is a site where people have not opted in.',
          ],
        },
        {
          heading: 'What a record shows',
          paragraphs: [
            'Open somebody’s record and you see what they have chosen to publish:',
          ],
          points: [
            'Their username and profile picture.',
            'When they joined STO Info, and when they were last seen.',
            'How long they have been playing, taken from the oldest of their public accounts.',
            'How many accounts and captains they have made public, and the records themselves.',
          ],
        },
        {
          heading: 'Their captains',
          paragraphs: [
            'From a record you can open any account they have published, and from there any captain on it. A captain’s page shows their rank, species, career, faction and biography — the things another player would want to know before saying hello.',
            'Real names, email addresses and private notes are never published, whatever else somebody has chosen to show.',
          ],
        },
        {
          heading: 'Ways in',
          paragraphs: [
            'The Community tabs are four ways of asking the same question. Search finds a specific officer by username; Recently Joined shows who is new; Recently Active shows who is about now; Profiles lists everybody.',
            'You can browse all of it signed out. Signing in adds the things that involve you — sending a friend request, blocking, reporting.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Open the Community', route: APP_ROUTES.COMMUNITY },
        {
          label: 'Search the registry',
          route: APP_ROUTES.COMMUNITY_REGISTRY_SEARCH,
        },
      ],
    },
    {
      slug: 'listing-your-own-record',
      title: 'Putting your own record on the registry',
      summary:
        'Opting in, deciding what is shown account by account, and opting out again.',
      sections: [
        {
          heading: 'Opt in from your profile',
          paragraphs: [
            'Go to your profile, edit your personal details, and turn on “Show me in the Galactic Personnel Registry”. Your profile page tells you which way the switch is set at any time.',
            'Nothing about you appears anywhere in the registry until you do this.',
          ],
        },
        {
          heading: 'What becomes public',
          paragraphs: ['With the switch on, other officers can see:'],
          points: [
            'Your username and profile picture.',
            'The date you joined, and the date you last signed in.',
            'Any STO accounts you have also marked as publicly visible.',
            'Any captains you have also marked as publicly visible.',
          ],
        },
        {
          heading: 'What is never public',
          paragraphs: [
            'Your real name, your email address and your private notes are never shown in the registry. There is no setting that publishes them, because there is no reason for one.',
          ],
        },
        {
          heading: 'Three switches, not one',
          paragraphs: [
            'Visibility is decided at three levels, and all of them have to agree before something is shown: you, then the account, then the captain.',
            'A captain marked public on an account that is not public stays hidden, and every captain hides again the moment you turn your own switch off. So you can publish one account and keep another to yourself, or show a single captain out of a crowded roster, without touching anything else.',
          ],
        },
        {
          heading: 'Changing your mind',
          paragraphs: [
            'Turn the switch off and everything about you drops out of the registry again. You stay on the friends lists of people who already added you — a friendship is not undone by going private — but your record can no longer be opened, and new friend requests cannot reach you.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Your profile', route: APP_ROUTES.STO_DASHBOARD_PROFILE },
        { label: 'Your accounts', route: APP_ROUTES.STO_DASHBOARD_ACCOUNTS },
      ],
    },
    {
      slug: 'finding-and-adding-friends',
      title: 'Finding and adding friends',
      summary: 'Sending, answering and withdrawing friend requests.',
      sections: [
        {
          heading: 'Finding somebody',
          paragraphs: [
            'Search the registry for a username, or search from the Friends page if you already know who you are looking for. Either way you land on their record.',
            'Only officers who have listed themselves can be found, and only they can be sent a request.',
          ],
        },
        {
          heading: 'Sending a request',
          paragraphs: [
            'Choose Add Friend on their record. Nothing happens on their list until they answer — a request is an invitation, not an addition. While it waits, their record offers you Withdraw Request instead, and you can take it back with no trace.',
          ],
        },
        {
          heading: 'Answering one',
          paragraphs: [
            'A request sent to you shows on their record as Accept or Decline, and on the Incoming tab of your Friends page. Declining does not tell them off; it just ends the request.',
          ],
        },
        {
          heading: 'Your friends page',
          paragraphs: [
            'The Friends page keeps four lists, each with a count: your friends, requests waiting on you, requests you are waiting on, and the officers you have blocked.',
            'A friend who later makes their record private stays on your list, but their record can no longer be opened. They have not left; they have gone quiet.',
          ],
        },
        {
          heading: 'Ending a friendship',
          paragraphs: [
            'Unfriend from their record. Nobody is told, and either of you can send a fresh request later.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Your friends', route: APP_ROUTES.COMMUNITY_FRIENDS },
        {
          label: 'Search the registry',
          route: APP_ROUTES.COMMUNITY_REGISTRY_SEARCH,
        },
      ],
    },
    {
      slug: 'blocking-and-reporting',
      title: 'Blocking and reporting',
      summary:
        'Two different tools: one for somebody you would rather not see, one for somebody breaking the rules.',
      sections: [
        {
          heading: 'Blocking',
          paragraphs: [
            'Blocking is for “I would rather not deal with this person”. It needs no reason and no permission.',
            'A block does all of this at once:',
          ],
          points: [
            'Ends any friendship between you.',
            'Stops either of you sending the other a request.',
            'Hides each of you from the other in the registry — their record answers you as though it never existed, and yours does the same for them.',
          ],
        },
        {
          heading: 'The other officer is never told',
          paragraphs: [
            'Nobody is notified that they have been blocked, and there is no way to test for it: a blocked record is indistinguishable from a member who was never there. That is deliberate. Being told you have been blocked is an invitation to go and do something about it.',
            'You can note a reason when you block somebody. It is for your own reference and is never shown to them.',
          ],
        },
        {
          heading: 'Unblocking',
          paragraphs: [
            'The Blocked tab on your Friends page lists everybody you have blocked, with the date. Unblock from there or from their record. Unblocking does not restore the friendship you had; it only makes you both visible to each other again.',
          ],
        },
        {
          heading: 'Reporting',
          paragraphs: [
            'Reporting is different. It is for behaviour the site’s administrators should know about, and it goes to them rather than affecting what you can see.',
            'Choose Report Officer on somebody’s record, pick the reason that fits, and add anything the administrators need to know:',
          ],
          points: REPORT_REASON_POINTS,
        },
        {
          heading: 'Which one to use',
          paragraphs: [
            'Block somebody you simply want out of your way; it takes effect immediately and needs nobody’s agreement. Report somebody who is breaking the rules, so it can be dealt with for everybody rather than only for you.',
            'The two are not exclusive. Blocking somebody you have reported is often the right thing to do while it is looked at.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Your friends', route: APP_ROUTES.COMMUNITY_FRIENDS },
        { label: 'Contact us', route: APP_ROUTES.CONTACT },
      ],
    },
  ],
};

/**
 * The Storytime guides.
 *
 * Written for somebody who has never used the feature and does not want to
 * learn how it is built: every guide describes what a reader or a writer does
 * and what happens as a result, in the same words the pages themselves use.
 *
 * Kept as data rather than a component per guide so that the wording can be
 * corrected without touching any code, and so every guide is laid out and
 * navigated the same way.
 */
const STORYTIME_TOPIC: HelpTopic = {
  id: 'storytime',
  title: 'STO Storytime',
  intro:
    'Storytime is where the community writes and reads Star Trek Online fan fiction. These guides cover reading, writing and sharing.',
  requiresStorytime: true,
  guides: [
    {
      slug: 'what-is-storytime',
      title: 'What Storytime is',
      summary:
        'A short introduction to the feature and the handful of words it uses.',
      sections: [
        {
          heading: 'A home for your Star Trek Online fan fiction',
          paragraphs: [
            'Storytime is a permanent home for stories set in the Star Trek Online universe, written and shared by the people who play it. Anybody can read. Anybody with an STO Info account can write.',
            'Nothing here is official. Stories are fan-created work, and they belong to the members who wrote them.',
          ],
        },
        {
          heading: 'The words used here',
          paragraphs: [
            'Storytime only uses a few terms, and they mean the same thing on every page:',
          ],
          points: [
            'Story — one piece of writing, published a Chapter at a time.',
            'Chapter — a single instalment of a Story. A Story needs at least one published Chapter before it can be published itself.',
            'Arc — a collection of Stories that belong together, in a reading order somebody has chosen. The Stories in an Arc can be by different writers.',
            'Character — somebody who appears in a Story. A Story keeps its own cast, and you can see which Chapters each Character appears in.',
            'Crew — the people credited for a Story, a Chapter or a Character. Beta readers, artists, co-writers, anybody who helped.',
            'Spotlight — a selection picked out by the site, shown on the Storytime front page.',
          ],
        },
        {
          heading: 'What you need in order to take part',
          paragraphs: [
            'Reading is open to everyone, signed in or not.',
            'Signing in adds everything that has to remember who you are: writing and publishing, comments, reactions, following writers, reading lists, and the record of where you got to in each Story.',
          ],
        },
        {
          heading: 'Where to go next',
          paragraphs: [
            'If you came to read, start with Finding something to read. If you came to write, start with Writing your first Story. Neither guide assumes you have read the other.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Open Storytime', route: APP_ROUTES.STORYTIME },
        CONTENT_POLICY_LINK,
      ],
    },
    {
      slug: 'finding-something-to-read',
      title: 'Finding something to read',
      summary:
        'Browsing, searching, and what the labels on a Story are telling you.',
      sections: [
        {
          heading: 'Start at the front page',
          paragraphs: [
            'The Storytime front page opens with the Spotlight — a Story or Arc somebody has picked out, with a note saying why. Underneath it are two lists: new Stories, and Stories written in recently.',
            'They answer two different questions. The first is what has just arrived; the second is what is being written now, which is where you look for a Story that is still adding Chapters.',
          ],
        },
        {
          heading: 'Search',
          paragraphs: [
            'Search takes a title, a name or a phrase and looks through everything in Storytime at once. If that is too much, narrow it to just Stories, Chapters, Characters or Arcs — the filter tells you how many of each matched before you choose.',
          ],
        },
        {
          heading: 'How finished a Story is',
          paragraphs: [
            'Every Story says where its writer thinks it stands, so you know what you are starting:',
          ],
          points: [
            'Ongoing — more Chapters are coming.',
            'Completed — the writer considers it finished.',
            'Hiatus — paused for now, not abandoned.',
            'Cancelled — it will not be finished.',
          ],
        },
        {
          heading: 'Content ratings',
          paragraphs: [
            'Every Story carries a rating set by its writer. Ratings are a warning, not a lock: nothing is hidden from you and you are not asked to confirm your age. Mature and Adults Only Stories show a notice before you start reading so the choice is yours.',
          ],
          points: CONTENT_RATING_POINTS,
        },
        {
          heading: 'Arcs, when one Story is not enough',
          paragraphs: [
            'An Arc is a reading order somebody has curated — often several Stories by several writers that share a setting or a crew. Opening an Arc shows the Stories in the order the curator intended, with any note they left about where each one fits.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Search Storytime', route: APP_ROUTES.STORYTIME_SEARCH },
        { label: 'Browse Arcs', route: APP_ROUTES.STORYTIME_ARCS },
        { label: 'Spotlight', route: APP_ROUTES.STORYTIME_SPOTLIGHT },
      ],
    },
    {
      slug: 'reading-and-keeping-your-place',
      title: 'Reading and keeping your place',
      summary:
        'How your place is remembered, and what your library and reading lists are for.',
      sections: [
        {
          heading: 'Reading a Chapter',
          paragraphs: [
            'A Chapter page shows the writing, with links to the Chapters either side of it so you can keep going without returning to the Story page. Each Chapter shows roughly how long it takes to read.',
          ],
        },
        {
          heading: 'Your place is kept for you',
          paragraphs: [
            'While you are signed in, Storytime quietly records how far through a Chapter you have read. Come back later — on any device — and the Story page offers to continue from where you stopped rather than sending you back to the beginning.',
            'You do not have to mark anything as read for this to work. Reading is what records it.',
          ],
        },
        {
          heading: 'Your library',
          paragraphs: [
            'Every Story you start appears in your library, along with how many of its Chapters you have read and how many have appeared since you were last up to date.',
            'A Story sits in your library under one of these:',
          ],
          points: [
            'Not started — it is on your reading lists, but you have not opened it.',
            'In progress — you have read some of it. Set for you, by reading.',
            'Completed — you finished it, or marked the whole Story read.',
            'On hold — you chose to pause it. Your choice, and reading on will not silently undo it.',
            'Abandoned — you chose to stop. It stays in your library as part of your own history.',
          ],
        },
        {
          heading: 'Reading lists',
          paragraphs: [
            'A reading list is your own shelf. Put Stories and Arcs on it, add a note to each one saying why it is there, and put them in whatever order you like.',
            'Lists are private unless you make one public. A public list gets its own address you can share, which is the simplest way to recommend a run of Stories to somebody.',
          ],
        },
        {
          heading: 'Following, and your feed',
          paragraphs: [
            'You can follow a writer, a Story or an Arc. What you follow appears in your feed: new Chapters, newly published Stories, a Story changing status, an Arc gaining a Story.',
            'A Story that has since been taken down or made private drops out of your feed rather than lingering as a dead link.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Your library', route: APP_ROUTES.STORYTIME_LIBRARY },
        {
          label: 'Your reading lists',
          route: APP_ROUTES.STORYTIME_READING_LISTS,
        },
        { label: 'Your feed', route: APP_ROUTES.STORYTIME_FEED },
      ],
    },
    {
      slug: 'joining-in',
      title: 'Comments, reactions and following',
      summary: 'The ways of saying something about what you have read.',
      sections: [
        {
          heading: 'Reactions',
          paragraphs: [
            'A thumbs up or a thumbs down is the quickest thing you can leave. You hold one reaction per Story, Chapter or Character, and you can change or remove it at any time. The number shown is the thumbs up minus the thumbs down.',
            'You need to be signed in to react, because the site has to remember it was you.',
          ],
        },
        {
          heading: 'Comments',
          paragraphs: [
            'Comments sit at the bottom of a Story, a Chapter or an Arc. You can reply to a comment, but only once deep — a reply cannot itself be replied to, which keeps a thread readable rather than letting it fork.',
            'You can edit or delete your own comments. A Story owner can hide a comment on their own Story, and an administrator can remove one that breaks the content policy.',
            'A comment that has been deleted, hidden or removed keeps its place in the thread but loses its words, so a reply underneath it does not become nonsense.',
          ],
        },
        {
          heading: 'Following',
          paragraphs: [
            'Following a writer, a Story or an Arc puts their updates in your feed. Nobody is told who follows them individually; a creator sees only how many followers they have.',
          ],
        },
        {
          heading: 'Being a good guest',
          paragraphs: [
            'Everything published here was written by somebody for nothing, for other people to enjoy. Criticism is fine; the content policy sets out what is not. If you find something that breaks it, report it rather than answering it in the comments.',
          ],
        },
      ],
      relatedLinks: [CONTENT_POLICY_LINK],
    },
    {
      slug: 'writing-your-first-story',
      title: 'Writing your first Story',
      summary:
        'From an empty draft to a published Story, and what each setting does.',
      sections: [
        {
          heading: 'Create the Story first',
          paragraphs: [
            'Go to Your Stories and choose Create a Story. A new Story starts as a draft that only you can see, so nothing you do here is public until you say so.',
            'You are asked for:',
          ],
          points: [
            'Title — what the Story is called.',
            'URL slug — the part of the web address that names it. It fills itself in from the title, and you can change it.',
            'Short description — the sentence or two shown in listings. You need one before you can publish.',
            'Description — the longer introduction on the Story page.',
            'Content rating — General, Mature or Adults Only. Rate it for what it will contain, not for what the first Chapter contains.',
            'Status — Ongoing, Completed, Hiatus or Cancelled.',
            'Visibility — who will be able to reach it once it is published.',
            'Language — what it is written in. Chapters follow the Story unless you set one differently.',
          ],
        },
        {
          heading: 'Write a Chapter',
          paragraphs: [
            'Open your Story and go to Chapters, then Add a Chapter. Give it a title, an optional synopsis, and the writing itself. A Chapter needs some content before it can be published.',
            'Chapters are published one at a time, and each has its own state. A Story needs at least one published Chapter before it can be published itself.',
          ],
        },
        {
          heading: 'Confirm the content policy, then publish',
          paragraphs: [
            'Before a Story can be published you are asked to confirm it meets the Storytime publishing terms. This is a single confirmation, not a review queue — nobody has to approve your Story before it appears. If the terms are ever materially changed you will be asked once more, and told that is why.',
            'Publish the Chapter, publish the Story, and it is live.',
          ],
        },
        {
          heading: 'What the states mean',
          paragraphs: [
            'Stories and Chapters both move through the same states:',
          ],
          points: [
            'Draft — being written. Only you and your collaborators can see it.',
            'In review — set aside for a check before it goes out.',
            'Scheduled — finished, and waiting for its date to arrive. A scheduled Chapter shows when it is due, and publishes itself.',
            'Published — live, subject to its visibility.',
            'Unpublished — taken back out of public view by you. Nothing is lost, and you can publish it again.',
            'Archived — set aside. Out of your working lists, still yours.',
          ],
        },
        {
          heading: 'Who can reach it: visibility',
          paragraphs: [
            'Visibility is separate from publishing. Publishing decides whether a Story is finished enough to be seen; visibility decides who may see it:',
          ],
          points: [
            'Public — listed, searchable, open to anybody.',
            'Unlisted — reachable by anybody who has the address, but not listed or searchable. Useful for showing a draft to a friend.',
            'Private — only you and your collaborators.',
          ],
        },
        {
          heading: 'If you change your mind',
          paragraphs: [
            'Nothing you publish is irreversible. Unpublish a Chapter or a whole Story and it leaves public view immediately, with your writing untouched. Readers who had it in their library keep the record of having read it.',
          ],
        },
      ],
      relatedLinks: [
        YOUR_STORIES_LINK,
        { label: 'Create a Story', route: APP_ROUTES.STORYTIME_STORY_NEW },
        CONTENT_POLICY_LINK,
      ],
    },
    {
      slug: 'writing-with-markdown',
      title: 'Writing with Markdown',
      summary:
        'Everything the Storytime editor understands, and what it does with the rest.',
      sections: [
        {
          heading: 'What Markdown is doing here',
          paragraphs: [
            'Chapters, Story and Arc descriptions and Character biographies are all written as plain text with a few marks in it. Two asterisks around a word make it bold; a line starting with a hash is a heading. That is Markdown, and Storytime understands a deliberately small amount of it.',
            'Small on purpose. Everything published here is written by a member rather than by an administrator, so the writing is turned into a page by a set of rules narrow enough to be certain about. Nothing you type can become part of the page itself — which also means anything outside the list below is shown exactly as you typed it, rather than doing something you did not intend.',
            'The same reference is a click away while you write: the mark beside "Markdown is supported" under any of those fields opens it.',
          ],
        },
        ...MARKDOWN_SECTIONS,
        {
          heading: 'Things worth knowing',
          paragraphs: ['Most of what surprises people is one of these:'],
          points: [...MARKDOWN_REFERENCE_NOTES],
        },
        {
          heading: 'Why links work the way they do',
          paragraphs: [
            'Storytime never sends a reader somewhere it cannot vouch for. A link to another page on this site is fine; anything else is not turned into a link at all.',
            'Nothing is refused for it and you are not warned. Write an address in full and it stays on the page as ordinary text, so a reader can still see where you meant. Write it as a Markdown link and the whole thing goes, label included — a label with nothing behind it reads as a broken promise.',
            'A video is the exception, and it does not come from the writing: a Chapter takes YouTube links in its own Videos box, which stores the video rather than the address.',
          ],
        },
      ],
      relatedLinks: [YOUR_STORIES_LINK],
    },
    {
      slug: 'cast-crew-and-pictures',
      title: 'Cast, crew and pictures',
      summary:
        'Giving your Story a cast list, crediting the people who helped, and adding images and video.',
      sections: [
        {
          heading: 'Your cast',
          paragraphs: [
            'A Story keeps its own list of Characters — your captain, your crew, the antagonist you keep bringing back. Each gets a name, a short biography and a picture if you have one.',
            'You can record which Chapters a Character appears in. Readers then get a Character page showing who they are and where to find them, which is how somebody joining a long Story catches up without spoiling it for themselves.',
          ],
        },
        {
          heading: 'Crew credits',
          paragraphs: [
            'Almost nothing is written entirely alone. Crew credits name the people who helped: beta readers, editors, artists, the friend who talked you out of the bad ending.',
            'A credit names an STO Info member and the role they played, and can attach to the whole Story, a single Chapter, or a Character. You can write your own wording for a credit if the standard role does not fit.',
          ],
        },
        {
          heading: 'Pictures',
          paragraphs: [
            'A Story can carry a banner across the top and a profile image for listings; a Chapter can carry a cover image.',
            'Every image asks for a short description of what it shows. That description is what somebody using a screen reader hears in place of the picture, so it is worth a sentence rather than a word.',
          ],
        },
        {
          heading: 'Video',
          paragraphs: [
            'A Chapter can carry a YouTube video — a machinima cut of the scene, a soundtrack, a trailer. Paste the link and it is embedded in the Chapter. You can give it a title and a caption, and start and end it partway through the video.',
            'This depends on video being switched on for the site. When it is not, the option simply is not offered.',
          ],
        },
      ],
      relatedLinks: [YOUR_STORIES_LINK],
    },
    {
      slug: 'writing-with-other-people',
      title: 'Writing with other people',
      summary:
        'Collaborators on a Story, and Arcs that gather Stories by several writers.',
      sections: [
        {
          heading: 'Inviting a collaborator',
          paragraphs: [
            'From your Story, open Collaborators and invite an STO Info member. You choose what the invitation grants, one permission at a time:',
          ],
          points: [
            'Edit the Story — its title, description, rating and settings.',
            'Manage Chapters — write, edit and reorder them.',
            'Manage the cast — add and edit Characters.',
            'Manage crew credits — decide who is credited.',
            'Manage collaborators — invite other people.',
          ],
        },
        {
          heading: 'Only the owner publishes',
          paragraphs: [
            'Publishing is not on that list and cannot be granted. However much of the writing somebody else does, the decision to put a Story in front of readers stays with whoever owns it.',
          ],
        },
        {
          heading: 'Invitations',
          paragraphs: [
            'An invitation does nothing until it is accepted. The person you invited finds it on their Invitations page and can accept or decline it; until then they cannot see or change anything. You can withdraw an invitation before it is answered, and remove a collaborator afterwards.',
          ],
        },
        {
          heading: 'Arcs',
          paragraphs: [
            'An Arc gathers Stories into a reading order. The Stories do not have to be yours, which is what makes an Arc the tool for a shared setting — a fleet, a campaign, a series of crossovers.',
            'Because an Arc can point at somebody else’s work, both sides have to agree. You can invite a Story into your Arc and wait for its owner to accept, or a writer can ask for their Story to be included and wait for you to approve it. Either way, nothing appears in the Arc until both the curator and the Story owner have said yes.',
            'Once a Story is in, you set where it sits in the order and can add a note saying where it fits. An Arc can have collaborators of its own, on the same principle as a Story.',
          ],
        },
      ],
      relatedLinks: [
        { label: 'Your invitations', route: APP_ROUTES.STORYTIME_INVITATIONS },
        { label: 'Your Arcs', route: APP_ROUTES.STORYTIME_MANAGE_ARCS },
      ],
    },
    {
      slug: 'ratings-reporting-and-safety',
      title: 'Ratings, reporting and safety',
      summary:
        'Rating your own work honestly, reporting something, and what happens if your work is removed.',
      sections: [
        {
          heading: 'Rate your own work honestly',
          paragraphs: [
            'Your rating is the promise readers rely on. Nothing is hidden behind it and nobody is asked to confirm their age, so a Story rated too low does not inconvenience a reader — it takes the choice away from them.',
            'Rate for the whole Story, not for the Chapter you are publishing today, and raise the rating before you publish the Chapter that needs it.',
          ],
          points: CONTENT_RATING_POINTS,
        },
        {
          heading: 'The content policy',
          paragraphs: [
            'The content policy is the list of rules everything published here has to meet. You confirm your Story meets them before you publish it, and anybody reading can report something they believe does not.',
          ],
          points: CONTENT_POLICY_POINTS,
        },
        {
          heading: 'Reporting something',
          paragraphs: [
            'Anything published in Storytime can be reported: a Story, a Chapter, a Character or a comment. Choose the rule you think it breaks and say what is wrong.',
            'A report goes to the site’s administrators and never removes anything by itself — somebody reads it and decides. The person you report is never told who reported them, and you are not told what was decided about somebody else’s work.',
          ],
        },
        {
          heading: 'If your own work is removed',
          paragraphs: [
            'You keep it. Removed work stays in your own pages, marked with the reason an administrator gave, so you can see exactly what was said about it. Readers see that it has gone rather than seeing the work.',
            'You may appeal once. Say why you think it should come back; if the appeal is upheld, the work returns as it was.',
          ],
        },
        {
          heading: 'Your own safety',
          paragraphs: [
            'Write under your STO Info account, not your real-world details. The policy protects other people’s personal information and yours equally — including from you, on a day when sharing it seems harmless.',
          ],
        },
      ],
      relatedLinks: [
        CONTENT_POLICY_LINK,
        { label: 'Terms of use', route: APP_ROUTES.STORYTIME_TERMS },
        {
          label: 'Fan content & IP notice',
          route: APP_ROUTES.STORYTIME_FAN_CONTENT,
        },
        { label: 'Contact us', route: APP_ROUTES.CONTACT },
      ],
    },
  ],
};

/**
 * The guides for the jobs Storytime hands out.
 *
 * Each one waits on the permission for the page it describes rather than on
 * the administrator role, because that is how the pages themselves are gated:
 * moderating, curating the Spotlight and keeping the tag vocabulary are three
 * separate jobs, and somebody may be trusted with one and not the others.
 *
 * They are written for the person doing the job rather than about them, and
 * they say what each control actually does — a moderator guessing at what
 * “Dismiss” tells the reporter is a moderator about to get it wrong.
 */
const STORYTIME_ADMIN_GUIDES: HelpGuide[] = [
  {
    slug: 'moderating-storytime',
    title: 'Working the moderation queue',
    summary:
      'What a report is, what removing something does to the creator, and how appeals reach you.',
    requiresPermission: PERMISSIONS.STORYTIME_MODERATE,
    sections: [
      {
        heading: 'What the queue holds',
        paragraphs: [
          'The moderation queue is one page with two lists: reports members have raised about Storytime content, and appeals from creators whose work has been removed. They are the same job seen from two sides, which is why they sit together — the person who removed something is usually the person best placed to read the argument against it.',
          'A report names what was reported, the reason chosen on the report form, and anything the reporter wrote. Nothing is hidden or removed because a report exists. A report is somebody asking you to look.',
        ],
        points: REPORT_REASON_POINTS,
      },
      {
        heading: 'Before you act: the two boxes at the top',
        paragraphs: [
          'The page opens with two fields, and they are not the same thing. “What the creator is told” goes to the creator word for word, and is what they answer if they appeal — you cannot remove anything without writing it. “Note for the record” stays with the report, and the reporter never sees it.',
          'Write the message as though the creator will read it, because they will. A removal nobody can explain is a removal nobody can appeal.',
        ],
      },
      {
        heading: 'What each action does',
        paragraphs: [
          'Claim, remove and dismiss are offered on a report that is still live. Once a report is closed, its actions go with it.',
        ],
        points: [
          'Claim — takes an open report so another moderator does not work the same one. It decides nothing.',
          'Remove the content — takes the work away from readers and sends the creator your message. It needs that message first.',
          'Dismiss — closes the report without touching the content. Use it when the report is wrong, not when you are unsure.',
        ],
      },
      {
        heading: 'What removal does not do',
        paragraphs: [
          'Removed work is not deleted. The creator keeps it in their own pages, marked with the reason you gave, so they can see exactly what was said about it. Readers see that it has gone rather than seeing the work.',
          'A creator may appeal once. An upheld appeal restores the work as it was; a rejected one ends the matter. Both decisions are made on this page, under Appeals.',
        ],
      },
      {
        heading: 'Decide against the policy, not against taste',
        paragraphs: [
          'The content policy is the whole of what Storytime prohibits, and it is public. Work you would not have written is not work that breaks a rule, and a rating you would have set differently is a conversation with the creator rather than a removal.',
        ],
        points: CONTENT_POLICY_POINTS,
      },
    ],
    relatedLinks: [
      { label: 'Moderation queue', route: APP_ROUTES.STORYTIME_MODERATION },
      CONTENT_POLICY_LINK,
    ],
  },
  {
    slug: 'curating-the-spotlight',
    title: 'Curating the Spotlight',
    summary:
      'How a selection is drafted, scheduled, published and withdrawn, and what readers see of it.',
    requiresPermission: PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
    sections: [
      {
        heading: 'What the Spotlight is for',
        paragraphs: [
          'The Spotlight is the top of the Storytime landing page: work somebody chose, with a headline, a summary and — if you write one — the reason it was chosen. It opens the page with a choice somebody made rather than with a list a reader has to sort through.',
          'A selection points at a Story or an Arc. What is shown with it comes from the selection or from the work itself, so a work that changes after you feature it keeps the entry accurate.',
        ],
      },
      {
        heading: 'Drafting a selection',
        paragraphs: [
          '“Draft a selection” opens the form. Nothing saved there is visible to readers until you publish it, so a selection can be written now and held.',
          'The image is the work’s own banner unless you override it. If you do override it, write the alternative text as well: the Spotlight is the first thing on the page, and a reader using a screen reader meets it first.',
        ],
      },
      {
        heading: 'Scheduling and priority',
        paragraphs: [
          'A selection runs from its start date. An end date takes it down on its own; leaving it blank means it runs onwards until you withdraw it.',
          'Priority orders the selections showing at the same time, and the landing page leads with the highest. Two selections can run together, but a Spotlight of everything is a spotlight of nothing.',
        ],
      },
      {
        heading: 'Publishing and withdrawing',
        paragraphs: [
          'Publish makes a selection live once its start date has arrived. Withdraw takes it down and keeps it, so a selection pulled in a hurry can go back up.',
          'Delete removes the entry itself. Withdraw is almost always the one you want: a past selection stays readable in the Spotlight archive, and deleting it takes it out of that history too.',
        ],
      },
      {
        heading: 'Choosing well',
        paragraphs: [
          'Say why. The reason is the part readers remember, and “we liked it” is not a reason. Featuring the same few writers is the failure this page makes easy — the archive is the honest record of who has been chosen, so read it before you choose again.',
        ],
      },
    ],
    relatedLinks: [
      {
        label: 'Manage Spotlight',
        route: APP_ROUTES.STORYTIME_MANAGE_SPOTLIGHT,
      },
      { label: 'Spotlight archive', route: APP_ROUTES.STORYTIME_SPOTLIGHT },
    ],
  },
  {
    slug: 'managing-storytime-tags',
    title: 'Looking after the tag list',
    summary:
      'The shared vocabulary creators pick from, and why changing a tag is never a private edit.',
    requiresPermission: PERMISSIONS.STORYTIME_CONFIGURE,
    sections: [
      {
        heading: 'A tag is shared, not personal',
        paragraphs: [
          'Creators do not invent tags; they pick from this list. That is what makes a tag filter find anything — twenty spellings of one idea would each find a twentieth of the Stories that match it.',
          'So the list is a vocabulary rather than a collection. Keeping it short and unambiguous is the whole of the job.',
        ],
      },
      {
        heading: 'The categories',
        paragraphs: [
          'Every tag is filed under one category, and the category decides where a reader meets it. Filing a tag under the wrong one hides it from the people looking for it.',
        ],
        points: TAG_CATEGORY_POINTS,
      },
      {
        heading: 'Adding a tag',
        paragraphs: [
          'A tag needs a name and a category. The description says what it means — write one, because the next person deciding whether a Story fits this tag or the one beside it will read it.',
          'The slug is built from the name if you leave it blank. Order within a category is a number, and decides where the tag sits in the picker rather than how important it is.',
        ],
      },
      {
        heading: 'Renaming, reordering and removing',
        paragraphs: [
          'Changing a slug breaks filter links already shared — links in a Story’s notes, in a forum post, in somebody’s bookmarks. Rename freely; change slugs rarely, and only for something genuinely wrong.',
          'Removing a tag takes it off the Stories using it. Before you remove one, look at what is filed under it: a tag that is wrong is worth removing, and a tag that is merely unpopular is worth leaving alone.',
        ],
      },
      {
        heading: 'Content warnings are not decoration',
        paragraphs: [
          'A content warning tag is a promise to the reader who needs it. Warnings have their own category for that reason, and thinning them out to tidy the list is the one edit here that costs somebody something.',
        ],
      },
    ],
    relatedLinks: [
      { label: 'Manage tags', route: APP_ROUTES.STORYTIME_MANAGE_TAGS },
      CONTENT_POLICY_LINK,
    ],
  },
];

/**
 * The topic that gathers the Storytime jobs.
 *
 * Waits on the Storytime switch like the rest of Storytime, and each guide in
 * it waits on its own permission on top of that. Somebody holding none of the
 * three never sees the topic at all, because a topic left with no guides is
 * dropped rather than shown empty.
 */
const STORYTIME_ADMIN_TOPIC: HelpTopic = {
  id: 'storytime-admin',
  title: 'Running Storytime',
  intro:
    'For the people who moderate Storytime, choose what it features, and keep its tag list. Each guide covers one of those jobs, and you are shown the ones you have been given.',
  requiresStorytime: true,
  guides: STORYTIME_ADMIN_GUIDES,
};

/**
 * Every help topic, in the order the help index presents them.
 *
 * Community leads because it is always available, while Storytime waits on its
 * feature switch — a reader with Storytime switched off should still open the
 * help to something rather than to an apology. The guides for running
 * Storytime come last, because almost nobody is shown them.
 */
export const HELP_TOPICS: HelpTopic[] = [
  COMMUNITY_TOPIC,
  STORYTIME_TOPIC,
  STORYTIME_ADMIN_TOPIC,
];

/**
 * The topics a visitor may be offered.
 *
 * Two filters, for two different reasons. Storytime’s guides wait on the
 * feature switch because while Storytime is off it is meant to look like a
 * feature that does not exist. A guide with a permission on it waits on that
 * permission because it describes a page its reader would be turned away
 * from, and help for a door somebody cannot open is not help.
 *
 * A topic whose guides have all been filtered away is dropped rather than
 * shown as a heading with nothing under it.
 *
 * @param isStorytimeEnabled Whether Storytime is switched on.
 * @param permissions The permission codes the visitor holds.
 * @returns The topics to show, each carrying only the guides on offer.
 */
export function visibleHelpTopics(
  isStorytimeEnabled: boolean,
  permissions: ReadonlySet<string>,
): HelpTopic[] {
  return HELP_TOPICS.filter(
    topic => isStorytimeEnabled || !topic.requiresStorytime,
  )
    .map(topic => ({
      ...topic,
      guides: topic.guides.filter(guide =>
        isGuidePermitted(guide, permissions),
      ),
    }))
    .filter(topic => topic.guides.length > 0);
}

/**
 * Whether a visitor holds what a guide asks for.
 *
 * A guide asking for nothing is for everybody, which is most of them.
 *
 * @param guide The guide.
 * @param permissions The permission codes the visitor holds.
 * @returns True when the guide may be shown.
 */
export function isGuidePermitted(
  guide: HelpGuide,
  permissions: ReadonlySet<string>,
): boolean {
  return !guide.requiresPermission || permissions.has(guide.requiresPermission);
}

/**
 * Finds a guide by its slug.
 *
 * Returns the topic as well as the guide, because the page showing a guide has
 * to know whether the topic may be shown at all, and what else to offer next.
 *
 * @param slug The guide slug taken from the route.
 * @returns The guide and its topic, or undefined when no guide has that slug.
 */
export function findHelpGuide(
  slug: string | null,
): HelpGuideLocation | undefined {
  if (!slug) {
    return undefined;
  }

  for (const topic of HELP_TOPICS) {
    const guide = topic.guides.find(candidate => candidate.slug === slug);
    if (guide) {
      return { topic, guide };
    }
  }

  return undefined;
}
