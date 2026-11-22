import { HelpGuide, HelpGuideSection } from './help.models';

/**
 * The copy beneath one heading of a six-part guide.
 *
 * Usually just its paragraphs. Written out as a section without its heading
 * when the part also needs a list, or waits on a switch the rest of the guide
 * does not.
 */
export type HelpGuidePart = string[] | Omit<HelpGuideSection, 'heading'>;

/**
 * A guide written in the six parts the Fleet and site administration guides
 * share (FC-050): what it is for, who can use it, where to find it, how, who
 * can see it, and when something goes wrong.
 *
 * The five fixed parts are named rather than headed, so their headings are
 * worded once, here, and cannot drift from one guide to the next. The "how"
 * part is the guide's own, so each of its sections keeps its own heading.
 */
export interface SixPartHelpGuide extends Omit<HelpGuide, 'sections'> {
  /** What it is for: the job the page does. */
  whatItIsFor: HelpGuidePart;
  /** Who can use it: who is offered the page, and who may act on it. */
  whoCanUseIt: HelpGuidePart;
  /** Where to find it: the way in. */
  whereToFindIt: HelpGuidePart;
  /**
   * How it works, as sections in reading order, keyed by their headings.
   * Every heading begins "How".
   */
  how: Record<string, HelpGuidePart>;
  /** Who can see it: who reads what the page records. */
  whoCanSeeIt: HelpGuidePart;
  /** When something goes wrong: what each failure means, and what to do. */
  whenSomethingGoesWrong: HelpGuidePart;
}

/**
 * Builds one section of a six-part guide from its heading and copy.
 *
 * @param heading The section heading.
 * @param part The copy beneath it.
 * @returns The section.
 */
function partSection(heading: string, part: HelpGuidePart): HelpGuideSection {
  return Array.isArray(part)
    ? { heading, paragraphs: part }
    : { heading, ...part };
}

/**
 * Builds a guide from its six parts, in the order they are read.
 *
 * @param guide The guide, with its copy given part by part.
 * @returns The guide, its parts laid out as sections.
 */
export function sixPartGuide(guide: SixPartHelpGuide): HelpGuide {
  const {
    whatItIsFor,
    whoCanUseIt,
    whereToFindIt,
    how,
    whoCanSeeIt,
    whenSomethingGoesWrong,
    ...rest
  } = guide;
  return {
    ...rest,
    sections: [
      partSection('What it is for', whatItIsFor),
      partSection('Who can use it', whoCanUseIt),
      partSection('Where to find it', whereToFindIt),
      ...Object.entries(how).map(([heading, part]) =>
        partSection(heading, part),
      ),
      partSection('Who can see it', whoCanSeeIt),
      partSection('When something goes wrong', whenSomethingGoesWrong),
    ],
  };
}
