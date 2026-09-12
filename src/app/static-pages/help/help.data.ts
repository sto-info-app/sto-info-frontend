import {
  CUSTOM_TRACKING_CATEGORY_LABELS,
  CUSTOM_TRACKING_EMPTY_MODE_CHOICES,
} from 'src/app/dashboard/settings/custom-tracking/definitions/custom-tracking-field-settings.constants';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { CustomTrackingFieldCategory } from 'src/app/models/custom-tracking.models';
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

/** Builds a prose section with optional bullet points. */
function guideSection(
  heading: string,
  paragraphs: string[],
  points?: string[],
): HelpGuideSection {
  return points === undefined
    ? { heading, paragraphs }
    : { heading, paragraphs, points };
}

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
  (group: MarkdownReferenceGroup) =>
    guideSection(
      group.heading,
      [group.intro],
      group.constructs.map(
        construct => `${construct.syntax} — ${construct.meaning}`,
      ),
    ),
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
 * The link to Custom Tracking, which every guide about it finishes with.
 *
 * The one page where the hierarchy is built and the content agreement is
 * accepted, so every guide in the topic has reason to point at it.
 */
const CUSTOM_TRACKING_LINK = {
  label: 'Open Custom Tracking',
  route: APP_ROUTES.STO_DASHBOARD_CUSTOM_TRACKING,
};

/**
 * An example of what each grouping of field types is for.
 *
 * Written here because the catalogue says what a group is called and not what
 * somebody would reach for it to record. Typed against the enum so a grouping
 * added to the picker will not compile until the guide has something to say
 * about it — the alternative is a guide that lists five of six groups and
 * gives no sign that it is doing so.
 */
const CUSTOM_TRACKING_CATEGORY_EXAMPLES: Record<
  CustomTrackingFieldCategory,
  string
> = {
  [CustomTrackingFieldCategory.TEXT]:
    'a line for a build name, or a longer passage written in Markdown.',
  [CustomTrackingFieldCategory.NUMBER]:
    'a count, a proportion, a score out of five, or how far through something you are.',
  [CustomTrackingFieldCategory.DATE_TIME]:
    'when something happened, how long it took, or the span it ran over.',
  [CustomTrackingFieldCategory.BOOLEAN]:
    'a plain yes or no, drawn as a switch or as a tick box.',
  [CustomTrackingFieldCategory.CHOICE]:
    'an answer from a list you write, a colour, or a set of tags.',
  [CustomTrackingFieldCategory.MEDIA]:
    'one picture you upload and crop, or one YouTube video.',
};

/**
 * The kinds of field the picker offers, as guide points.
 *
 * Derived from the same labels the picker groups its list under, so a group
 * renamed in the builder is renamed here too. The individual types are not
 * listed: the server publishes them with a description each, the picker shows
 * that description as you choose, and a copy of twenty-seven of them here
 * would be out of date the first time one is added.
 */
const CUSTOM_TRACKING_CATEGORY_POINTS: string[] = Object.values(
  CustomTrackingFieldCategory,
).map(
  category =>
    `${CUSTOM_TRACKING_CATEGORY_LABELS[category]} — ${CUSTOM_TRACKING_CATEGORY_EXAMPLES[category]}`,
);

/**
 * What a field with no value can be made to look like.
 *
 * Taken from the choices the field form offers rather than described, because
 * the guide is telling somebody which of three things to pick from a menu and
 * naming them differently would leave them looking for a fourth.
 */
const CUSTOM_TRACKING_EMPTY_MODE_POINTS: string[] =
  CUSTOM_TRACKING_EMPTY_MODE_CHOICES.map(choice => choice.label);

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
        guideSection('A directory of officers who chose to be in it', [
          'The Galactic Personnel Registry is a directory of STO Info members who have decided to make their record public. It is where you find other players, see the captains they command, and let them find you.',
          'Nobody is listed by default. An empty-looking registry is not a quiet site; it is a site where people have not opted in.',
        ]),
        guideSection(
          'What a record shows',
          [
            'Open somebody’s record and you see what they have chosen to publish:',
          ],
          [
            'Their username and profile picture.',
            'When they joined STO Info, and when they were last seen.',
            'How long they have been playing, taken from the oldest of their public accounts.',
            'How many accounts and captains they have made public, and the records themselves.',
          ],
        ),
        guideSection('Their captains', [
          'From a record you can open any account they have published, and from there any captain on it. A captain’s page shows their rank, species, career, faction and biography — the things another player would want to know before saying hello.',
          'Real names, email addresses and private notes are never published, whatever else somebody has chosen to show.',
        ]),
        guideSection('Ways in', [
          'The Community tabs are four ways of asking the same question. Search finds a specific officer by username; Recently Joined shows who is new; Recently Active shows who is about now; Profiles lists everybody.',
          'You can browse all of it signed out. Signing in adds the things that involve you — sending a friend request, blocking, reporting.',
        ]),
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
        guideSection('Opt in from your profile', [
          'Go to your profile, edit your personal details, and turn on “Show me in the Galactic Personnel Registry”. Your profile page tells you which way the switch is set at any time.',
          'Nothing about you appears anywhere in the registry until you do this.',
        ]),
        guideSection(
          'What becomes public',
          ['With the switch on, other officers can see:'],
          [
            'Your username and profile picture.',
            'The date you joined, and the date you last signed in.',
            'Any STO accounts you have also marked as publicly visible.',
            'Any captains you have also marked as publicly visible.',
          ],
        ),
        guideSection('What is never public', [
          'Your real name, your email address and your private notes are never shown in the registry. There is no setting that publishes them, because there is no reason for one.',
        ]),
        guideSection('Three switches, not one', [
          'Visibility is decided at three levels, and all of them have to agree before something is shown: you, then the account, then the captain.',
          'A captain marked public on an account that is not public stays hidden, and every captain hides again the moment you turn your own switch off. So you can publish one account and keep another to yourself, or show a single captain out of a crowded roster, without touching anything else.',
        ]),
        guideSection('Changing your mind', [
          'Turn the switch off and everything about you drops out of the registry again. You stay on the friends lists of people who already added you — a friendship is not undone by going private — but your record can no longer be opened, and new friend requests cannot reach you.',
        ]),
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
        guideSection('Finding somebody', [
          'Search the registry for a username, or search from the Friends page if you already know who you are looking for. Either way you land on their record.',
          'Only officers who have listed themselves can be found, and only they can be sent a request.',
        ]),
        guideSection('Sending a request', [
          'Choose Add Friend on their record. Nothing happens on their list until they answer — a request is an invitation, not an addition. While it waits, their record offers you Withdraw Request instead, and you can take it back with no trace.',
        ]),
        guideSection('Answering one', [
          'A request sent to you shows on their record as Accept or Decline, and on the Incoming tab of your Friends page. Declining does not tell them off; it just ends the request.',
        ]),
        guideSection('Your friends page', [
          'The Friends page keeps four lists, each with a count: your friends, requests waiting on you, requests you are waiting on, and the officers you have blocked.',
          'A friend who later makes their record private stays on your list, but their record can no longer be opened. They have not left; they have gone quiet.',
        ]),
        guideSection('Ending a friendship', [
          'Unfriend from their record. Nobody is told, and either of you can send a fresh request later.',
        ]),
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
        guideSection(
          'Blocking',
          [
            'Blocking is for “I would rather not deal with this person”. It needs no reason and no permission.',
            'A block does all of this at once:',
          ],
          [
            'Ends any friendship between you.',
            'Stops either of you sending the other a request.',
            'Hides each of you from the other in the registry — their record answers you as though it never existed, and yours does the same for them.',
          ],
        ),
        guideSection('The other officer is never told', [
          'Nobody is notified that they have been blocked, and there is no way to test for it: a blocked record is indistinguishable from a member who was never there. That is deliberate. Being told you have been blocked is an invitation to go and do something about it.',
          'You can note a reason when you block somebody. It is for your own reference and is never shown to them.',
        ]),
        guideSection('Unblocking', [
          'The Blocked tab on your Friends page lists everybody you have blocked, with the date. Unblock from there or from their record. Unblocking does not restore the friendship you had; it only makes you both visible to each other again.',
        ]),
        guideSection(
          'Reporting',
          [
            'Reporting is different. It is for behaviour the site’s administrators should know about, and it goes to them rather than affecting what you can see.',
            'Choose Report Officer on somebody’s record, pick the reason that fits, and add anything the administrators need to know:',
          ],
          REPORT_REASON_POINTS,
        ),
        guideSection('Which one to use', [
          'Block somebody you simply want out of your way; it takes effect immediately and needs nobody’s agreement. Report somebody who is breaking the rules, so it can be dealt with for everybody rather than only for you.',
          'The two are not exclusive. Blocking somebody you have reported is often the right thing to do while it is looked at.',
        ]),
      ],
      relatedLinks: [
        { label: 'Your friends', route: APP_ROUTES.COMMUNITY_FRIENDS },
        { label: 'Contact us', route: APP_ROUTES.CONTACT },
      ],
    },
  ],
};

/**
 * The Custom Tracking guides.
 *
 * The feature is the one part of the site whose shape the user decides, so the
 * guides are ordered the way somebody actually meets it: what it is, building
 * it, filling it in, and then who can see the result. The visibility guide is
 * last but is the one that matters most, because everything before it is
 * private and reversible and that one is neither.
 *
 * Not gated on a feature switch, unlike Storytime. Custom Tracking is always
 * offered from Settings and says on its own page when it is unavailable, so
 * there is nothing here that withholding these guides would keep quiet.
 */
const CUSTOM_TRACKING_TOPIC: HelpTopic = {
  id: 'custom-tracking',
  title: 'Custom Tracking',
  intro:
    'Custom Tracking lets you decide what STO Info records about your own accounts and captains. You write the fields once, and then fill them in for each account or captain you have.',
  requiresStorytime: false,
  guides: [
    {
      slug: 'what-custom-tracking-is',
      title: 'What Custom Tracking is',
      summary:
        'Fields you write yourself, and the three words the feature uses.',
      sections: [
        guideSection('The things the site does not know to ask about', [
          'STO Info records what every player has: accounts, captains, ranks, careers. Custom Tracking is for everything else — the reputations you are grinding, the builds you keep meaning to finish, which admiralty ships you have unlocked, how far through a campaign each captain is.',
          'Nothing is set up for you. You decide what to ask, and then you answer it for each account or captain. Until you build something there is nothing there, which is why the page opens empty.',
        ]),
        guideSection(
          'Sections, tabs and fields',
          [
            'What you build has three levels, and they are the same three words everywhere the feature appears:',
          ],
          [
            'Field — one question, such as “Reputation tier” or “Ship name”. A field has a kind, which decides what sort of answer it takes.',
            'Tab — a group of fields, shown together under one heading.',
            'Section — the outermost group, holding tabs.',
          ],
        ),
        guideSection('Accounts and captains are built separately', [
          'There are two hierarchies, not one. A section belongs either to your accounts or to your captains, and the strip at the top of the builder swaps between them.',
          'A section built for captains appears against every captain you have, and one built for accounts against every account. Which of the two a section is for is settled when you create it and cannot be changed afterwards, because every answer beneath it hangs off an account or a captain and the other side has no row to move them to.',
        ]),
        guideSection('Where you meet it', [
          'Everything is built in one place: Settings, then Custom Tracking. That page has three panels — what you track, what you have recorded, and a summary of the rules.',
          'Answers can also be filled in without going there. Each of your own account and captain pages shows what you have recorded for it, and offers the same editor with that record already chosen.',
        ]),
        guideSection('Agreeing to the rules first', [
          'The first time you open Custom Tracking you are shown the Custom Tracking Content Agreement and asked to accept it. Nothing can be created or changed until you do.',
          'If the wording changes materially you are asked again, and creating and editing pause until you accept. Reading never does: everything you have already recorded stays in front of you, because a change of wording is not a reason to take your own data away from you.',
        ]),
      ],
      relatedLinks: [
        CUSTOM_TRACKING_LINK,
        { label: 'Your settings', route: APP_ROUTES.STO_DASHBOARD_SETTINGS },
      ],
    },
    {
      slug: 'building-what-you-track',
      title: 'Building what you track',
      summary:
        'Creating sections, tabs and fields, and the settings each kind of field brings with it.',
      sections: [
        guideSection('Choose accounts or captains first', [
          'Open Custom Tracking and stay on “What you track”. The strip at the top decides which of the two hierarchies you are building, and everything you add belongs to whichever one is selected.',
          'Start with a section, add tabs to it, then add fields to the tabs. Each of the three takes a name and, if it helps, a description shown beneath the name wherever it appears.',
        ]),
        guideSection(
          'Choosing what a field asks for',
          [
            'A field’s kind is the important choice. The picker groups the kinds it offers, and shows a description of whichever one you have highlighted:',
          ],
          CUSTOM_TRACKING_CATEGORY_POINTS,
        ),
        guideSection('A field cannot change what it asks', [
          'The kind is chosen once. It decides how every answer recorded against the field is stored, checked and read back, so changing it later would reinterpret data you cannot get back — which is why the form shows the kind as a label rather than a menu once the field exists.',
          'If a field turns out to be asking the wrong question, make a new one and delete the old one. Deleting it takes its answers with it, so it is worth being sure before you record against a field on forty captains.',
        ]),
        guideSection('Settings that belong to the kind', [
          'Most kinds bring settings of their own, under “Settings for this kind of field”: the bounds of a slider, the top of a rating scale, how a date or a duration is written out, the fewest and most choices a multiple-choice field will take.',
          'A few are worth settling before you record anything rather than after. The number of decimal places a decimal field keeps decides how every value is stored, and a default timezone decides where the editor starts for the kinds that carry one.',
        ]),
        guideSection('Fields that must be answered', [
          'Turn on “Every record must answer this” and a record cannot be saved while that field is empty. Records saved before you turned it on are left alone until the next time you edit them.',
          'Switches and tick boxes cannot be made required. Both always show one of their two positions, so there is no state that reads as unanswered and the rule would be one nobody could see being kept.',
        ]),
        guideSection('Lists of choices', [
          'The kinds that offer a list — option lists, dropdowns, tick box lists, multiple select and tags — carry their choices with them, and you write those in the field’s own editor. One choice can be marked as chosen to begin with, and the list can be put in the order you want it read.',
          'A choice can be withdrawn rather than deleted. A withdrawn choice cannot be picked again but stays listed under “Withdrawn”, so answers that already chose it go on reading correctly.',
          'A tags field draws only from the list you write. Nothing typed while filling in a record is added to it.',
        ]),
        guideSection('Order, and finding things again', [
          'Sections, tabs, fields and choices each have up and down controls, and the order you put them in is the order they appear everywhere else — in the editor, on your own pages, and publicly.',
          'The search box above the hierarchy matches section, tab and field names across the whole of the scope you are in, whether or not the branch holding the match has been opened.',
        ]),
        guideSection('How much you can build', [
          'There are ceilings on how many sections a scope may hold, how many tabs a section may hold, how many fields a tab may hold, and how many fields a scope may hold altogether. The builder counts what you have used against each of them and says plainly when you have reached one, rather than refusing a save without explaining why.',
          'The ceilings are the same for everybody. They are what keeps a hierarchy something a page — including a phone — can draw in one go.',
        ]),
      ],
      relatedLinks: [CUSTOM_TRACKING_LINK],
    },
    {
      slug: 'filling-in-your-records',
      title: 'Filling in your records',
      summary:
        'Recording answers against an account or a captain, and how saving works.',
      sections: [
        guideSection('Two ways to the same editor', [
          'From Custom Tracking, the “What you have recorded” panel lets you pick any account or captain and fill it in, with a search box for finding one when the list is long.',
          'From your own account or captain page, the same editor is offered with that record already chosen. It is the same form, the same checks and the same save either way, so it does not matter which you use.',
        ]),
        guideSection('One record at a time', [
          'A record is loaded whole — the fields that apply to it arrive with the answers already recorded — and it is saved whole. Filling in six fields and saving once is one save, not six.',
          'Anything still needed is named above the form, and the record cannot be saved while a required field is empty. Leaving the page with unsaved changes asks you first.',
          'A field left empty is not a problem unless it is required, and clearing an answer and saving removes it.',
        ]),
        guideSection('Finding a field', [
          'The editor has a search box of its own, matching section, tab and field names within the record you are filling in. On a large hierarchy it is usually quicker than opening tabs until you find the one you want.',
        ]),
        guideSection('Pictures', [
          'An image field takes one picture, uploaded and cropped in place. The selection is locked to the shape the field was set up for, so a larger picture is welcome — only the area you select is kept.',
          'You are asked what the picture shows while you are still looking at it. That description is read out to anybody who cannot see the picture, so describe the picture rather than repeating the field’s name.',
          'A picture is stored the moment it is uploaded, on its own. Saving the record afterwards neither adds one nor takes one away, and removing one works the same way.',
        ]),
        guideSection(
          'Fields you have not filled in yet',
          [
            'Each field decides what an empty answer looks like, and decides it twice — once for you and once for the public — from the same three choices:',
          ],
          CUSTOM_TRACKING_EMPTY_MODE_POINTS,
        ),
        guideSection('When recording is paused', [
          'Occasionally the editor says that recording values is paused. Everything already recorded is untouched and still shown; it is only saving that is unavailable, and it returns without anything having been lost.',
        ]),
      ],
      relatedLinks: [
        CUSTOM_TRACKING_LINK,
        { label: 'Your accounts', route: APP_ROUTES.STO_DASHBOARD_ACCOUNTS },
      ],
    },
    {
      slug: 'who-can-see-what-you-track',
      title: 'Who can see what you track',
      summary:
        'What stays private, what publishing actually takes, and what deleting removes.',
      sections: [
        guideSection('Private until you say otherwise', [
          'Everything you build and everything you record is private. Every section, tab and field is created private, and each carries a Public or Private badge in the builder so you can see at a glance which it is.',
          'Nothing you record appears anywhere else on the site because of anything you do in Custom Tracking alone.',
        ]),
        guideSection(
          'Publishing takes every switch, not one',
          [
            'A field appears on your public pages only when all of these are public at the same time:',
          ],
          [
            'You — your own record is listed on the Galactic Personnel Registry.',
            'The account — the STO account the answer belongs to, or the one the captain is on.',
            'The captain — where a captain’s answer is being shown.',
            'The section, the tab and the field — each marked public in its own right.',
          ],
        ),
        guideSection('Which is why a public field can stay private', [
          'Marking a field public while the tab or section holding it is private changes nothing publicly, and the form says so as you do it. The field is ready to be published; the thing it sits in has not been.',
          'That is deliberate. It lets you prepare a whole section without publishing it, and it means turning one switch off hides everything beneath it at once.',
        ]),
        guideSection('What a visitor sees where you have recorded nothing', [
          'The three choices for an empty field are made separately for you and for the public, because a reminder of what you have not filled in yet is not necessarily something to publish. A field can show you its name and a placeholder while showing a visitor nothing at all.',
          'Public pages can be indexed by search engines. Treat anything you publish here as something anybody can read and find again later.',
        ]),
        guideSection(
          'What you must not record',
          [
            'The content agreement you accepted is short, and the part that matters most is this: what you enter is yours and is your responsibility, and some things must not go in at all.',
          ],
          [
            'Personal information about you or anybody else — contact details, financial information, passwords or authentication codes.',
            'Illegal, threatening, abusive, hateful, discriminatory or sexually explicit material.',
            'Anything that infringes copyright, trademarks or somebody’s privacy.',
            'Spam, advertising, scams, impersonation or deliberately misleading content.',
          ],
        ),
        guideSection('When something is hidden for you', [
          'Public content can be reviewed. A section, tab or field that has been withdrawn from public view carries a “Hidden by a moderator” badge in the builder and stops appearing publicly.',
          'Nothing you configured is changed and nothing you recorded is removed, so lifting the suppression restores exactly what was there. Serious or repeated breaches can cost you your STO Info account.',
        ]),
        guideSection('Deleting, and the 180 days', [
          'Deleting a section, tab or field takes the answers recorded against it as well — across every account or captain, not only the one you happen to be looking at. The confirmation counts the tabs, fields and recorded answers that would go before you agree to it, because “delete this section” and “delete this section and sixty-three answers” are different decisions.',
          'Deleted definitions and answers are kept for 180 days and are then removed for good. None of it can be undone from the page itself, so if you delete something by mistake, ask us within that window.',
        ]),
      ],
      relatedLinks: [
        CUSTOM_TRACKING_LINK,
        { label: 'Terms of Use', route: APP_ROUTES.TERMS_OF_USE },
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
        guideSection('A home for your Star Trek Online fan fiction', [
          'Storytime is a permanent home for stories set in the Star Trek Online universe, written and shared by the people who play it. Anybody can read. Anybody with an STO Info account can write.',
          'Nothing here is official. Stories are fan-created work, and they belong to the members who wrote them.',
        ]),
        guideSection(
          'The words used here',
          [
            'Storytime only uses a few terms, and they mean the same thing on every page:',
          ],
          [
            'Story — one piece of writing, published a Chapter at a time.',
            'Chapter — a single instalment of a Story. A Story needs at least one published Chapter before it can be published itself.',
            'Arc — a collection of Stories that belong together, in a reading order somebody has chosen. The Stories in an Arc can be by different writers.',
            'Character — somebody who appears in a Story. A Story keeps its own cast, and you can see which Chapters each Character appears in.',
            'Crew — the people credited for a Story, a Chapter or a Character. Beta readers, artists, co-writers, anybody who helped.',
            'Spotlight — a selection picked out by the site, shown on the Storytime front page.',
          ],
        ),
        guideSection('What you need in order to take part', [
          'Reading is open to everyone, signed in or not.',
          'Signing in adds everything that has to remember who you are: writing and publishing, comments, reactions, following writers, reading lists, and the record of where you got to in each Story.',
        ]),
        guideSection('Where to go next', [
          'If you came to read, start with Finding something to read. If you came to write, start with Writing your first Story. Neither guide assumes you have read the other.',
        ]),
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
        guideSection('Start at the front page', [
          'The Storytime front page opens with the Spotlight — a Story or Arc somebody has picked out, with a note saying why. Underneath it are two lists: new Stories, and Stories written in recently.',
          'They answer two different questions. The first is what has just arrived; the second is what is being written now, which is where you look for a Story that is still adding Chapters.',
        ]),
        guideSection('Search', [
          'Search takes a title, a name or a phrase and looks through everything in Storytime at once. If that is too much, narrow it to just Stories, Chapters, Characters or Arcs — the filter tells you how many of each matched before you choose.',
        ]),
        guideSection(
          'How finished a Story is',
          [
            'Every Story says where its writer thinks it stands, so you know what you are starting:',
          ],
          [
            'Ongoing — more Chapters are coming.',
            'Completed — the writer considers it finished.',
            'Hiatus — paused for now, not abandoned.',
            'Cancelled — it will not be finished.',
          ],
        ),
        guideSection(
          'Content ratings',
          [
            'Every Story carries a rating set by its writer. Ratings are a warning, not a lock: nothing is hidden from you and you are not asked to confirm your age. Mature and Adults Only Stories show a notice before you start reading so the choice is yours.',
          ],
          CONTENT_RATING_POINTS,
        ),
        guideSection('Arcs, when one Story is not enough', [
          'An Arc is a reading order somebody has curated — often several Stories by several writers that share a setting or a crew. Opening an Arc shows the Stories in the order the curator intended, with any note they left about where each one fits.',
        ]),
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
        guideSection('Reading a Chapter', [
          'A Chapter page shows the writing, with links to the Chapters either side of it so you can keep going without returning to the Story page. Each Chapter shows roughly how long it takes to read.',
        ]),
        guideSection('Your place is kept for you', [
          'While you are signed in, Storytime quietly records how far through a Chapter you have read. Come back later — on any device — and the Story page offers to continue from where you stopped rather than sending you back to the beginning.',
          'You do not have to mark anything as read for this to work. Reading is what records it.',
        ]),
        guideSection(
          'Your library',
          [
            'Every Story you start appears in your library, along with how many of its Chapters you have read and how many have appeared since you were last up to date.',
            'A Story sits in your library under one of these:',
          ],
          [
            'Not started — it is on your reading lists, but you have not opened it.',
            'In progress — you have read some of it. Set for you, by reading.',
            'Completed — you finished it, or marked the whole Story read.',
            'On hold — you chose to pause it. Your choice, and reading on will not silently undo it.',
            'Abandoned — you chose to stop. It stays in your library as part of your own history.',
          ],
        ),
        guideSection('Reading lists', [
          'A reading list is your own shelf. Put Stories and Arcs on it, add a note to each one saying why it is there, and put them in whatever order you like.',
          'Lists are private unless you make one public. A public list gets its own address you can share, which is the simplest way to recommend a run of Stories to somebody.',
        ]),
        guideSection('Following, and your feed', [
          'You can follow a writer, a Story or an Arc. What you follow appears in your feed: new Chapters, newly published Stories, a Story changing status, an Arc gaining a Story.',
          'A Story that has since been taken down or made private drops out of your feed rather than lingering as a dead link.',
        ]),
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
        guideSection('Reactions', [
          'A thumbs up or a thumbs down is the quickest thing you can leave. You hold one reaction per Story, Chapter or Character, and you can change or remove it at any time. The number shown is the thumbs up minus the thumbs down.',
          'You need to be signed in to react, because the site has to remember it was you.',
        ]),
        guideSection('Comments', [
          'Comments sit at the bottom of a Story, a Chapter or an Arc. You can reply to a comment, but only once deep — a reply cannot itself be replied to, which keeps a thread readable rather than letting it fork.',
          'You can edit or delete your own comments. A Story owner can hide a comment on their own Story, and an administrator can remove one that breaks the content policy.',
          'A comment that has been deleted, hidden or removed keeps its place in the thread but loses its words, so a reply underneath it does not become nonsense.',
        ]),
        guideSection('Following', [
          'Following a writer, a Story or an Arc puts their updates in your feed. Nobody is told who follows them individually; a creator sees only how many followers they have.',
        ]),
        guideSection('Being a good guest', [
          'Everything published here was written by somebody for nothing, for other people to enjoy. Criticism is fine; the content policy sets out what is not. If you find something that breaks it, report it rather than answering it in the comments.',
        ]),
      ],
      relatedLinks: [CONTENT_POLICY_LINK],
    },
    {
      slug: 'writing-your-first-story',
      title: 'Writing your first Story',
      summary:
        'From an empty draft to a published Story, and what each setting does.',
      sections: [
        guideSection(
          'Create the Story first',
          [
            'Go to Your Stories and choose Create a Story. A new Story starts as a draft that only you can see, so nothing you do here is public until you say so.',
            'You are asked for:',
          ],
          [
            'Title — what the Story is called.',
            'URL slug — the part of the web address that names it. It fills itself in from the title, and you can change it.',
            'Short description — the sentence or two shown in listings. You need one before you can publish.',
            'Description — the longer introduction on the Story page.',
            'Content rating — General, Mature or Adults Only. Rate it for what it will contain, not for what the first Chapter contains.',
            'Status — Ongoing, Completed, Hiatus or Cancelled.',
            'Visibility — who will be able to reach it once it is published.',
            'Language — what it is written in. Chapters follow the Story unless you set one differently.',
          ],
        ),
        guideSection('Write a Chapter', [
          'Open your Story and go to Chapters, then Add a Chapter. Give it a title, an optional synopsis, and the writing itself. A Chapter needs some content before it can be published.',
          'Chapters are published one at a time, and each has its own state. A Story needs at least one published Chapter before it can be published itself.',
        ]),
        guideSection('Confirm the content policy, then publish', [
          'Before a Story can be published you are asked to confirm it meets the Storytime publishing terms. This is a single confirmation, not a review queue — nobody has to approve your Story before it appears. If the terms are ever materially changed you will be asked once more, and told that is why.',
          'Publish the Chapter, publish the Story, and it is live.',
        ]),
        guideSection(
          'What the states mean',
          ['Stories and Chapters both move through the same states:'],
          [
            'Draft — being written. Only you and your collaborators can see it.',
            'In review — set aside for a check before it goes out.',
            'Scheduled — finished, and waiting for its date to arrive. A scheduled Chapter shows when it is due, and publishes itself.',
            'Published — live, subject to its visibility.',
            'Unpublished — taken back out of public view by you. Nothing is lost, and you can publish it again.',
            'Archived — set aside. Out of your working lists, still yours.',
          ],
        ),
        guideSection(
          'Who can reach it: visibility',
          [
            'Visibility is separate from publishing. Publishing decides whether a Story is finished enough to be seen; visibility decides who may see it:',
          ],
          [
            'Public — listed, searchable, open to anybody.',
            'Unlisted — reachable by anybody who has the address, but not listed or searchable. Useful for showing a draft to a friend.',
            'Private — only you and your collaborators.',
          ],
        ),
        guideSection('If you change your mind', [
          'Nothing you publish is irreversible. Unpublish a Chapter or a whole Story and it leaves public view immediately, with your writing untouched. Readers who had it in their library keep the record of having read it.',
        ]),
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
        guideSection('What Markdown is doing here', [
          'Chapters, Story and Arc descriptions and Character biographies are all written as plain text with a few marks in it. Two asterisks around a word make it bold; a line starting with a hash is a heading. That is Markdown, and Storytime understands a deliberately small amount of it.',
          'Small on purpose. Everything published here is written by a member rather than by an administrator, so the writing is turned into a page by a set of rules narrow enough to be certain about. Nothing you type can become part of the page itself — which also means anything outside the list below is shown exactly as you typed it, rather than doing something you did not intend.',
          'Two of the marks below are this site’s own rather than Markdown’s: {indent} to indent a paragraph’s first line, and {spacer} to leave a gap between passages. Prose wants both and Markdown has a spelling for neither, so Storytime added them. They will mean nothing anywhere else you write Markdown.',
          'The same reference is a click away while you write: the mark beside "Markdown is supported" under any of those fields opens it.',
        ]),
        ...MARKDOWN_SECTIONS,
        guideSection(
          'Things worth knowing',
          ['Most of what surprises people is one of these:'],
          [...MARKDOWN_REFERENCE_NOTES],
        ),
        guideSection('Why links work the way they do', [
          'Storytime never sends a reader somewhere it cannot vouch for. A link to another page on this site is fine; anything else is not turned into a link at all.',
          'Nothing is refused for it and you are not warned. Write an address in full and it stays on the page as ordinary text, so a reader can still see where you meant. Write it as a Markdown link and the whole thing goes, label included — a label with nothing behind it reads as a broken promise.',
          'A video is the exception, and it does not come from the writing: a Chapter takes YouTube links in its own Videos box, which stores the video rather than the address.',
        ]),
      ],
      relatedLinks: [YOUR_STORIES_LINK],
    },
    {
      slug: 'cast-crew-and-pictures',
      title: 'Cast, crew and pictures',
      summary:
        'Giving your Story a cast list, crediting the people who helped, and adding images and video.',
      sections: [
        guideSection('Your cast', [
          'A Story keeps its own list of Characters — your captain, your crew, the antagonist you keep bringing back. Each gets a name, a short biography and a picture if you have one.',
          'You can record which Chapters a Character appears in. Readers then get a Character page showing who they are and where to find them, which is how somebody joining a long Story catches up without spoiling it for themselves.',
        ]),
        guideSection('Crew credits', [
          'Almost nothing is written entirely alone. Crew credits name the people who helped: beta readers, editors, artists, the friend who talked you out of the bad ending.',
          'A credit names an STO Info member and the role they played, and can attach to the whole Story, a single Chapter, or a Character. You can write your own wording for a credit if the standard role does not fit.',
        ]),
        guideSection('Pictures', [
          'A Story can carry a banner across the top and a profile image for listings; a Chapter can carry a cover image.',
          'Every image asks for a short description of what it shows. That description is what somebody using a screen reader hears in place of the picture, so it is worth a sentence rather than a word.',
        ]),
        guideSection('Video', [
          'A Chapter can carry a YouTube video — a machinima cut of the scene, a soundtrack, a trailer. Paste the link and it is embedded in the Chapter. You can give it a title and a caption, and start and end it partway through the video.',
          'This depends on video being switched on for the site. When it is not, the option simply is not offered.',
        ]),
      ],
      relatedLinks: [YOUR_STORIES_LINK],
    },
    {
      slug: 'writing-with-other-people',
      title: 'Writing with other people',
      summary:
        'Collaborators on a Story, and Arcs that gather Stories by several writers.',
      sections: [
        guideSection(
          'Inviting a collaborator',
          [
            'From your Story, open Collaborators and invite an STO Info member. You choose what the invitation grants, one permission at a time:',
          ],
          [
            'Edit the Story — its title, description, rating and settings.',
            'Manage Chapters — write, edit and reorder them.',
            'Manage the cast — add and edit Characters.',
            'Manage crew credits — decide who is credited.',
            'Manage collaborators — invite other people.',
          ],
        ),
        guideSection('Only the owner publishes', [
          'Publishing is not on that list and cannot be granted. However much of the writing somebody else does, the decision to put a Story in front of readers stays with whoever owns it.',
        ]),
        guideSection('Invitations', [
          'An invitation does nothing until it is accepted. The person you invited finds it on their Invitations page and can accept or decline it; until then they cannot see or change anything. You can withdraw an invitation before it is answered, and remove a collaborator afterwards.',
        ]),
        guideSection('Arcs', [
          'An Arc gathers Stories into a reading order. The Stories do not have to be yours, which is what makes an Arc the tool for a shared setting — a fleet, a campaign, a series of crossovers.',
          'Because an Arc can point at somebody else’s work, both sides have to agree. You can invite a Story into your Arc and wait for its owner to accept, or a writer can ask for their Story to be included and wait for you to approve it. Either way, nothing appears in the Arc until both the curator and the Story owner have said yes.',
          'Once a Story is in, you set where it sits in the order and can add a note saying where it fits. An Arc can have collaborators of its own, on the same principle as a Story.',
        ]),
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
        guideSection(
          'Rate your own work honestly',
          [
            'Your rating is the promise readers rely on. Nothing is hidden behind it and nobody is asked to confirm their age, so a Story rated too low does not inconvenience a reader — it takes the choice away from them.',
            'Rate for the whole Story, not for the Chapter you are publishing today, and raise the rating before you publish the Chapter that needs it.',
          ],
          CONTENT_RATING_POINTS,
        ),
        guideSection(
          'The content policy',
          [
            'The content policy is the list of rules everything published here has to meet. You confirm your Story meets them before you publish it, and anybody reading can report something they believe does not.',
          ],
          CONTENT_POLICY_POINTS,
        ),
        guideSection('Reporting something', [
          'Anything published in Storytime can be reported: a Story, a Chapter, a Character or a comment. Choose the rule you think it breaks and say what is wrong.',
          'A report goes to the site’s administrators and never removes anything by itself — somebody reads it and decides. The person you report is never told who reported them, and you are not told what was decided about somebody else’s work.',
        ]),
        guideSection('If your own work is removed', [
          'You keep it. Removed work stays in your own pages, marked with the reason an administrator gave, so you can see exactly what was said about it. Readers see that it has gone rather than seeing the work.',
          'You may appeal once. Say why you think it should come back; if the appeal is upheld, the work returns as it was.',
        ]),
        guideSection('Your own safety', [
          'Write under your STO Info account, not your real-world details. The policy protects other people’s personal information and yours equally — including from you, on a day when sharing it seems harmless.',
        ]),
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
      guideSection(
        'What the queue holds',
        [
          'The moderation queue is one page with two lists: reports members have raised about Storytime content, and appeals from creators whose work has been removed. They are the same job seen from two sides, which is why they sit together — the person who removed something is usually the person best placed to read the argument against it.',
          'A report names what was reported, the reason chosen on the report form, and anything the reporter wrote. Nothing is hidden or removed because a report exists. A report is somebody asking you to look.',
        ],
        REPORT_REASON_POINTS,
      ),
      guideSection('Before you act: the two boxes at the top', [
        'The page opens with two fields, and they are not the same thing. “What the creator is told” goes to the creator word for word, and is what they answer if they appeal — you cannot remove anything without writing it. “Note for the record” stays with the report, and the reporter never sees it.',
        'Write the message as though the creator will read it, because they will. A removal nobody can explain is a removal nobody can appeal.',
      ]),
      guideSection(
        'What each action does',
        [
          'Claim, remove and dismiss are offered on a report that is still live. Once a report is closed, its actions go with it.',
        ],
        [
          'Claim — takes an open report so another moderator does not work the same one. It decides nothing.',
          'Remove the content — takes the work away from readers and sends the creator your message. It needs that message first.',
          'Dismiss — closes the report without touching the content. Use it when the report is wrong, not when you are unsure.',
        ],
      ),
      guideSection('What removal does not do', [
        'Removed work is not deleted. The creator keeps it in their own pages, marked with the reason you gave, so they can see exactly what was said about it. Readers see that it has gone rather than seeing the work.',
        'A creator may appeal once. An upheld appeal restores the work as it was; a rejected one ends the matter. Both decisions are made on this page, under Appeals.',
      ]),
      guideSection(
        'Decide against the policy, not against taste',
        [
          'The content policy is the whole of what Storytime prohibits, and it is public. Work you would not have written is not work that breaks a rule, and a rating you would have set differently is a conversation with the creator rather than a removal.',
        ],
        CONTENT_POLICY_POINTS,
      ),
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
      guideSection('What the Spotlight is for', [
        'The Spotlight is the top of the Storytime landing page: work somebody chose, with a headline, a summary and — if you write one — the reason it was chosen. It opens the page with a choice somebody made rather than with a list a reader has to sort through.',
        'A selection points at a Story or an Arc. What is shown with it comes from the selection or from the work itself, so a work that changes after you feature it keeps the entry accurate.',
      ]),
      guideSection('Drafting a selection', [
        '“Draft a selection” opens the form. Nothing saved there is visible to readers until you publish it, so a selection can be written now and held.',
        'The image is the work’s own banner unless you override it. If you do override it, write the alternative text as well: the Spotlight is the first thing on the page, and a reader using a screen reader meets it first.',
      ]),
      guideSection('Scheduling and priority', [
        'A selection runs from its start date. An end date takes it down on its own; leaving it blank means it runs onwards until you withdraw it.',
        'Priority orders the selections showing at the same time, and the landing page leads with the highest. Two selections can run together, but a Spotlight of everything is a spotlight of nothing.',
      ]),
      guideSection('Publishing and withdrawing', [
        'Publish makes a selection live once its start date has arrived. Withdraw takes it down and keeps it, so a selection pulled in a hurry can go back up.',
        'Delete removes the entry itself. Withdraw is almost always the one you want: a past selection stays readable in the Spotlight archive, and deleting it takes it out of that history too.',
      ]),
      guideSection('Choosing well', [
        'Say why. The reason is the part readers remember, and “we liked it” is not a reason. Featuring the same few writers is the failure this page makes easy — the archive is the honest record of who has been chosen, so read it before you choose again.',
      ]),
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
    requiresPermission: PERMISSIONS.STORYTIME_TAG_MANAGE,
    sections: [
      guideSection('A tag is shared, not personal', [
        'Creators do not invent tags; they pick from this list. That is what makes a tag filter find anything — twenty spellings of one idea would each find a twentieth of the Stories that match it.',
        'So the list is a vocabulary rather than a collection. Keeping it short and unambiguous is the whole of the job.',
      ]),
      guideSection(
        'The categories',
        [
          'Every tag is filed under one category, and the category decides where a reader meets it. Filing a tag under the wrong one hides it from the people looking for it.',
        ],
        TAG_CATEGORY_POINTS,
      ),
      guideSection('Adding a tag', [
        'A tag needs a name and a category. The description says what it means — write one, because the next person deciding whether a Story fits this tag or the one beside it will read it.',
        'The slug is built from the name if you leave it blank. Order within a category is a number, and decides where the tag sits in the picker rather than how important it is.',
      ]),
      guideSection('Renaming, reordering and removing', [
        'Changing a slug breaks filter links already shared — links in a Story’s notes, in a forum post, in somebody’s bookmarks. Rename freely; change slugs rarely, and only for something genuinely wrong.',
        'Removing a tag takes it off the Stories using it. Before you remove one, look at what is filed under it: a tag that is wrong is worth removing, and a tag that is merely unpopular is worth leaving alone.',
      ]),
      guideSection('Content warnings are not decoration', [
        'A content warning tag is a promise to the reader who needs it. Warnings have their own category for that reason, and thinning them out to tidy the list is the one edit here that costs somebody something.',
      ]),
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
 * Community and Custom Tracking lead because they are always available, while
 * Storytime waits on its feature switch — a reader with Storytime switched off
 * should still open the help to something rather than to an apology. The
 * guides for running Storytime come last, because almost nobody is shown them.
 */
export const HELP_TOPICS: HelpTopic[] = [
  COMMUNITY_TOPIC,
  CUSTOM_TRACKING_TOPIC,
  STORYTIME_TOPIC,
  STORYTIME_ADMIN_TOPIC,
];

/**
 * The topics a visitor may be offered.
 *
 * Two filters, for two different reasons. Storytime’s guides wait on the
 * feature switch, because there is nothing to explain about a feature nobody
 * can reach. A guide with a permission on it waits on that permission because
 * it describes a page its reader would be turned away from, and help for a
 * door somebody cannot open is not help.
 *
 * The switch is read as "should this be offered", not "is it on": while the
 * backend cannot be asked the guides stay, since a reader with the feature in
 * front of them and no idea why it will not open is exactly who help is for.
 *
 * A topic whose guides have all been filtered away is dropped rather than
 * shown as a heading with nothing under it.
 *
 * @param isStorytimeOffered Whether Storytime is being offered at all.
 * @param permissions The permission codes the visitor holds.
 * @returns The topics to show, each carrying only the guides on offer.
 */
export function visibleHelpTopics(
  isStorytimeOffered: boolean,
  permissions: ReadonlySet<string>,
): HelpTopic[] {
  return HELP_TOPICS.filter(
    topic => isStorytimeOffered || !topic.requiresStorytime,
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
