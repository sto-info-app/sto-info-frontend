import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { catchError, of, take } from 'rxjs';

import { CustomTrackingConfiguration } from 'src/app/models/custom-tracking.models';
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';

import { CustomTrackingConfigurationService } from '../custom-tracking-configuration.service';
import {
  CustomTrackingDisplaySection,
  CustomTrackingDisplayTab,
} from '../custom-tracking-display.models';
import { CustomTrackingDisplayFieldComponent } from '../custom-tracking-display-field/custom-tracking-display-field.component';

/**
 * Somebody's own tracked information, beneath the STO data on a detail page.
 *
 * Each section is one of the site's foldable LCARS heading bars and its tabs
 * switch as they do in the builder, because a reader who arranged their
 * information into sections and tabs should find it arranged that way wherever
 * they look at it. Sections open by default: a page whose content is all
 * behind closed headings looks empty, and this sits at the bottom of a page
 * somebody has already scrolled.
 *
 * Nothing here can edit anything. This is what a page shows a visitor, and it
 * is what an owner sees until they ask to edit — at which point the block
 * around it puts the editor in its place. Separate components rather than a
 * read-only mode of the editor, because a mode is a flag somebody can get
 * wrong, and this way there is no control to hide from a stranger.
 *
 * The served configuration is fetched rather than passed in, because every
 * host would otherwise have to fetch it and remember why. A failure to get it
 * is not reported: it costs a colour its swatch and a picture its address,
 * neither of which is worth an error message on somebody's captain page.
 */
@Component({
  selector: 'app-custom-tracking-display',
  templateUrl: './custom-tracking-display.component.html',
  standalone: true,
  imports: [
    CommonModule,
    CollapsibleSectionComponent,
    CustomTrackingDisplayFieldComponent,
  ],
})
export class CustomTrackingDisplayComponent implements OnInit {
  /** The sections to draw. */
  @Input({ required: true }) sections: CustomTrackingDisplaySection[] = [];

  /**
   * What distinguishes this block's element identifiers from any other's.
   *
   * A page may one day carry two of these, and two panels sharing an
   * identifier break the very `aria-controls` relationships that make the
   * headings and tabs usable.
   */
  @Input() idPrefix = 'custom-tracking-display';

  /** What the server says about the feature, once it has arrived. */
  configuration: CustomTrackingConfiguration | null = null;

  private readonly _configurationService = inject(
    CustomTrackingConfigurationService,
  );
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  private readonly _shownTabs = new Map<string, string>();

  /**
   * Fetches the palette and the picture shapes, if there is anything to draw.
   */
  ngOnInit(): void {
    if (this.sections.length === 0) {
      return;
    }

    this._configurationService
      .getConfiguration()
      .pipe(
        take(1),
        catchError(() => of(null)),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(configuration => (this.configuration = configuration));
  }

  /**
   * The tab currently shown in a section.
   *
   * @param section - The section.
   * @returns The shown tab, or null where the section has none.
   */
  activeTab(
    section: CustomTrackingDisplaySection,
  ): CustomTrackingDisplayTab | null {
    const chosen = this._shownTabs.get(section.id);
    const shown = section.tabs.find(tab => tab.id === chosen);

    return shown ?? section.tabs[0] ?? null;
  }

  /**
   * Shows one of a section's tabs.
   *
   * @param sectionId - The section.
   * @param tabId - The tab to show.
   */
  showTab(sectionId: string, tabId: string): void {
    this._shownTabs.set(sectionId, tabId);
  }

  /**
   * Moves between a section's tabs with the arrow keys.
   *
   * The same roving behaviour as everywhere else on the site, taken from the
   * shared helper rather than written again — a tab row that wrapped one way
   * here and another way in Settings would be a difference somebody has to
   * learn for no reason.
   *
   * @param event - The key pressed.
   * @param section - The section whose tabs are being moved through.
   */
  onTabKeydown(
    event: KeyboardEvent,
    section: CustomTrackingDisplaySection,
  ): void {
    const current = section.tabs.findIndex(
      tab => tab.id === this.activeTab(section)?.id,
    );
    const next = nextTabIndex(event.key, current, section.tabs.length);

    if (next === null) {
      return;
    }

    event.preventDefault();
    this.showTab(section.id, section.tabs[next].id);
    this.focusTab(section.tabs[next].id);
  }

  /**
   * Builds the identifier of one of this block's elements.
   *
   * @param part - Which element.
   * @param id - What it belongs to.
   * @returns The identifier.
   */
  elementId(part: string, id: string): string {
    return `${this.idPrefix}-${part}-${id}`;
  }

  /**
   * Moves the focus onto a tab after the arrow keys chose it.
   *
   * @param tabId - The tab to focus.
   */
  private focusTab(tabId: string): void {
    setTimeout(() => {
      const element = document.getElementById(this.elementId('tab', tabId));

      element?.focus();
    });
  }
}
