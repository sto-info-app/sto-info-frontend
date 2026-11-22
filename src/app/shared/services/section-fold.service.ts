import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Where a page's folded sections are kept, ahead of the page's own path. */
const STORAGE_PREFIX = 'lcars-folded-sections:';

/**
 * Remembers which sections a reader has folded away, page by page.
 *
 * Every section that heads a block of content folds, everything starts open,
 * and what a reader folds stays folded on their next visit to that page. It is
 * a convenience of this browser only, so storage that is missing, full or
 * refused leaves every section open rather than failing the page.
 */
@Injectable({ providedIn: 'root' })
export class SectionFoldService {
  private readonly _router = inject(Router);

  /**
   * Says whether the reader folded a section on the page they are on.
   *
   * @param sectionKey - The section, unique on its page.
   * @returns True when it was folded away.
   */
  isFolded(sectionKey: string): boolean {
    return this.read().includes(sectionKey);
  }

  /**
   * Records a section as folded or open on the page the reader is on.
   *
   * @param sectionKey - The section, unique on its page.
   * @param folded - Whether it is now folded away.
   */
  setFolded(sectionKey: string, folded: boolean): void {
    const others = this.read().filter(key => key !== sectionKey);
    const keys = folded ? [...others, sectionKey] : others;

    try {
      if (keys.length === 0) {
        localStorage.removeItem(this.storageKey());
      } else {
        localStorage.setItem(this.storageKey(), JSON.stringify(keys));
      }
    } catch {
      // Storage refused: the fold lasts for this visit only.
    }
  }

  /**
   * Reads the folded sections of the page the reader is on.
   *
   * @returns Their keys, or none when nothing usable is stored.
   */
  private read(): string[] {
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(this.storageKey()) ?? '[]',
      );

      return Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === 'string')
        : [];
    } catch {
      return [];
    }
  }

  /**
   * Names the page's entry: its path, without the query or fragment, so a
   * filtered or paged view of one page shares the page's folds.
   *
   * @returns The storage key.
   */
  private storageKey(): string {
    const path = this._router.url.split(/[?#]/)[0];

    return `${STORAGE_PREFIX}${path}`;
  }
}
