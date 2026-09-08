import { Component, Input } from '@angular/core';
import { StorytimeTag } from 'src/app/models/storytime.models';

/**
 * What a piece of work is about, as a strip closing off a panel.
 *
 * Written once and shown on every panel that names a work — the Spotlight
 * selection on the landing page, the Story and Arc listings, a creator's own
 * page — so a reader meets the same row wherever they are deciding what to
 * open, and it cannot drift into three slightly different rows.
 *
 * Renders nothing at all for an untagged work rather than an empty strip.
 */
@Component({
  selector: 'app-storytime-tag-row',
  templateUrl: './tag-row.component.html',
  standalone: true,
})
export class StorytimeTagRowComponent {
  private _tags: StorytimeTag[] = [];

  /**
   * The tags to show, in the order they should be read.
   *
   * Nothing is treated as no tags rather than as an error. A panel is fed
   * whatever the API sent it, and a response from before tags were listed
   * should leave the panel without a strip rather than break the listing it
   * sits in.
   *
   * @param tags - The tags, or nothing.
   */
  @Input() set tags(tags: StorytimeTag[] | null | undefined) {
    this._tags = tags ?? [];
  }

  /**
   * The tags being shown.
   *
   * @returns The tags.
   */
  get tags(): StorytimeTag[] {
    return this._tags;
  }
}
