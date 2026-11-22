import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';

import { HelpPageDirective } from '../help-page.directive';
import {
  blockingFeature,
  findHelpTopic,
  HELP_FEATURE_NAMES,
  isFeatureOffered,
  switchedOffFeature,
  switchedOffNote,
  unreachableFeature,
  isGuidePermitted,
  isTopicPermitted,
} from '../help.data';
import { HelpFeature, HelpGuide, HelpTopic } from '../help.models';

/**
 * One section of the help: its introduction and the guides in it (FC-048).
 *
 * Each section has a page of its own at `/help/topics/<id>`, which the Help
 * home's tiles open and each guide's breadcrumb leads back to. The address
 * has two parts where a guide's has one, so a section can never answer for a
 * guide, or a guide for a section.
 *
 * It decides what to show the way a guide does. An unknown section, one for
 * site administrators asked for by anybody else (FC-050), and one whose
 * every guide asks for a permission the reader does not hold, go to the
 * not-found page. A section about a feature that is out of reach (Storytime,
 * or Fleet Community since FC-049) is answered with a notice saying why,
 * since that is temporary rather than a wrong address.
 */
@Component({
  selector: 'app-help-topic',
  templateUrl: './help-topic.component.html',
  standalone: true,
  imports: [RouterModule, FeatureUnavailableComponent],
})
export class HelpTopicComponent extends HelpPageDirective implements OnInit {
  /** The section being read, once it has been resolved. */
  topic: HelpTopic | null = null;

  /** Its guides that this reader may open, in reading order. */
  guides: HelpGuide[] = [];

  /** The note on each shown guide whose own switch is off, or null (FC-050). */
  guideNotes: (string | null)[] = [];

  /** The note that the section's feature is switched off, or null (FC-050). */
  switchedOff: string | null = null;

  /**
   * Resolves the section named in the address, and watches it, so moving
   * between sections re-renders in place.
   *
   * A permission lookup that fails leaves the reader with the guides anybody
   * may read, as the Help home does.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.watchPage('topicId', (topicId, features, permissions) => {
      const topic = findHelpTopic(topicId);

      if (!topic || !isTopicPermitted(topic, this._authService.isAdmin())) {
        this.sendToNotFound();
        return;
      }

      const blocking = blockingFeature(features, topic.requiresFeature);

      if (blocking) {
        this.showUnavailable(blocking);
        return;
      }

      const guides = topic.guides.filter(
        guide =>
          isGuidePermitted(guide, permissions) &&
          isFeatureOffered(guide.requiresFeature, features),
      );

      if (guides.length === 0) {
        this.sendToNotFound();
        return;
      }

      const off = switchedOffFeature(features, topic.requiresFeature);

      this.markShown(unreachableFeature(features, topic.requiresFeature));
      this.topic = topic;
      this.guides = guides;
      this.switchedOff = off === null ? null : switchedOffNote(off, 'topic');
      // A guide says nothing more while the whole section is noted.
      this.guideNotes = guides.map(guide => {
        const guideOff = switchedOffFeature(features, guide.requiresFeature);

        return off !== null || guideOff === null
          ? null
          : `${HELP_FEATURE_NAMES[guideOff]} is switched off at the moment.`;
      });
      this._pageTitleService.setTitle(topic.title);
    });
  }

  /**
   * Says why a section cannot be read, in place of it.
   *
   * @param feature The feature out of reach.
   * @returns void
   */
  private showUnavailable(feature: HelpFeature): void {
    this.topic = null;
    this.guides = [];
    this.markUnavailable(feature);
  }
}
