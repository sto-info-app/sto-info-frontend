import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/** A choice on a Storytime setting, and how it is explained. */
export interface SettingOption {
  /** What the form control holds when it is chosen. */
  value: string;

  /** How it reads in the chooser. */
  label: string;

  /** What choosing it means, when that needs saying. */
  description?: string;
}

/**
 * The explanation beside a Storytime setting.
 *
 * The choices on a Story or an Arc — who may see it, how explicit it is,
 * whether it is finished — decide what happens to somebody else's reading, so
 * each is explained where it is made rather than in a policy page nobody
 * opens. It is a `details` element so the explanation is out of the way until
 * it is wanted, and reachable from the keyboard without any script.
 */
@Component({
  selector: 'app-storytime-setting-help',
  templateUrl: './setting-help.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class SettingHelpComponent {
  /** What the explanation is about, named for a screen reader. */
  @Input({ required: true }) label!: string;

  /** The choices to explain. Ones without a description are left out. */
  @Input() options: readonly SettingOption[] = [];

  /**
   * Whether the explanation needs more room than a setting's does.
   *
   * A chooser's explanation is a sentence per option and fits a narrow popup.
   * Anything longer — a reference somebody reads rather than glances at —
   * would come out as a column of two words a line, so it gets the width
   * instead of a component of its own.
   */
  @Input() wide = false;
}
