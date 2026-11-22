import { HelpGuideSection } from './help.models';

/**
 * Builds a prose section with optional bullet points.
 *
 * @param heading The section heading.
 * @param paragraphs Paragraphs shown in order beneath it.
 * @param points Bullet points shown after them, if any.
 * @returns The section.
 */
export function guideSection(
  heading: string,
  paragraphs: string[],
  points?: string[],
): HelpGuideSection {
  return points === undefined
    ? { heading, paragraphs }
    : { heading, paragraphs, points };
}
