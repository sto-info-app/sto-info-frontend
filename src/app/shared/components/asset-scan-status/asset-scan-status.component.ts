import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import {
  ASSET_SCAN_STATES,
  AssetScanState,
  AssetScanStatePresentation,
} from 'src/app/shared/constants/asset-scan.constants';

/**
 * Says where an uploaded file has got to: sending, waiting, being scanned,
 * in use, or refused.
 *
 * An upload used to finish when the request did. It now finishes when a
 * scanner says so, which can be seconds later, and a person watching a page
 * that says nothing for those seconds concludes it has failed and uploads it
 * again.
 *
 * Announced politely rather than alerted. The states arrive one after another
 * without the reader doing anything, and an assertive region would interrupt
 * whatever they were reading four times for one upload.
 */
@Component({
  selector: 'app-asset-scan-status',
  templateUrl: './asset-scan-status.component.html',
  styleUrls: ['./asset-scan-status.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class AssetScanStatusComponent {
  /** Where the file has got to. */
  @Input({ required: true }) state!: AssetScanState;

  /**
   * The file's own name, where showing it helps.
   *
   * Rendered as text. A filename is something somebody chose, so it is never
   * put anywhere that renders HTML.
   */
  @Input() fileName: string | null = null;

  /**
   * How the current state is drawn and worded.
   *
   * @returns The state's presentation.
   */
  get presentation(): AssetScanStatePresentation {
    return ASSET_SCAN_STATES[this.state];
  }
}
