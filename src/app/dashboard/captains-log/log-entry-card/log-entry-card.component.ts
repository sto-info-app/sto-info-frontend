import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { PublicLogEntry } from 'src/app/models/captains-log.models';
import { NewsCover } from 'src/app/news/news-cover.constants';
import {
  LcarsPanelAccent,
  LcarsPanelComponent,
} from 'src/app/shared/components/lcars-panel/lcars-panel.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { formatStardate } from 'src/app/shared/utils/stardate.utils';

import { logPictureOf } from '../captains-log.constants';

/** The panel colours entries rotate through, as sibling cards do. */
const ENTRY_ACCENTS: readonly LcarsPanelAccent[] = [
  'perano',
  'sunflower',
  'sky',
  'gold',
  'bluey',
  'tangerine',
];

/**
 * One Captain's Log entry as a panel card (sc-1450): its headline, picture,
 * words and when it was written. Its author's Log and a public profile both
 * draw entries with it, each adding its own marks and actions.
 */
@Component({
  selector: 'app-log-entry-card',
  templateUrl: './log-entry-card.component.html',
  styleUrls: ['./log-entry-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcarsPanelComponent, AppDatePipe, MarkdownPipe],
})
export class LogEntryCardComponent {
  /** The entry. */
  readonly entry = input.required<PublicLogEntry>();

  /** Where it falls in its list, for its colour. */
  readonly position = input(0);

  /** The heading level its headline takes on the page. */
  readonly level = input<2 | 3 | 4>(3);

  /** The panel's colour, by its place in the list. */
  readonly accent = computed(
    () => ENTRY_ACCENTS[this.position() % ENTRY_ACCENTS.length],
  );

  /** The picture to draw, card-sized, or null. */
  readonly picture = computed<NewsCover | null>(() =>
    logPictureOf(this.entry(), 'card'),
  );

  /** The stardate it was written on, as the site writes one. */
  readonly stardate = computed(() => formatStardate(this.entry().stardate));
}
