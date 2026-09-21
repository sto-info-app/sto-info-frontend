import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { FleetExactNameComponent } from 'src/app/fleet/components/fleet-exact-name/fleet-exact-name.component';
import { ScopeDuplicateVm } from 'src/app/fleet/register/scope-register.models';

/**
 * What already answers to the name somebody is about to register.
 *
 * Shown, never enforced. Two Communities may each hold a record for the
 * same in-game Fleet and neither is authoritative, so a registration is
 * never refused for looking like something that already exists. What this
 * does is put the comparison in front of the registrant while they can
 * still change their mind — which is the whole of FC-013's third
 * acceptance criterion: whose the existing record is, and how current.
 *
 * Every name goes through the exact-name component. A leading space is a
 * real difference between two in-game names, and a warning that drew two
 * records identically would be a warning nobody could act on.
 *
 * Nothing found is said out loud rather than left blank. "We looked and
 * there is nothing" and "nobody has looked" are different, and only one of
 * them should reassure anybody.
 */
@Component({
  selector: 'app-scope-duplicate-warning',
  templateUrl: './scope-duplicate-warning.component.html',
  styleUrls: ['./scope-duplicate-warning.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FleetExactNameComponent],
})
export class ScopeDuplicateWarningComponent {
  /** The matches, or null while nobody has asked. */
  @Input({ required: true }) duplicates!: ScopeDuplicateVm[] | null;

  /** What the records are called here, e.g. "Fleet". */
  @Input({ required: true }) scopeLabel!: string;

  /**
   * The label with the article that fits it.
   *
   * "A Armada" is the sort of thing that makes a warning read as machine
   * output, and a reader who has decided the copy was not written for them
   * is a reader who stops reading it. The vowel test is crude and the two
   * labels this ever sees are Fleet and Armada.
   *
   * @returns The label, article and all.
   */
  get scopeWithArticle(): string {
    const article = /^[aeiou]/i.test(this.scopeLabel) ? 'an' : 'a';

    return `${article} ${this.scopeLabel}`;
  }
}
