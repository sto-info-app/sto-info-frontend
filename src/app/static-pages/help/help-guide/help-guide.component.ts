import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';

import { HelpPageDirective } from '../help-page.directive';
import {
  blockingFeature,
  findHelpGuide,
  isFeatureOffered,
  switchedOffFeature,
  switchedOffNote,
  unreachableFeature,
  isGuidePermitted,
  isTopicPermitted,
  visibleSections,
} from '../help.data';
import {
  HelpFeature,
  HelpFeatures,
  HelpGuide,
  HelpGuideLocation,
  HelpGuideSection,
} from '../help.models';

/**
 * One help guide.
 *
 * A single page for every guide rather than a component each: the guides differ
 * only in their words, so giving each one a component would be seven copies of
 * the same template kept in step by hand.
 *
 * A slug that names no guide, one asking for a permission the visitor does
 * not hold, and one in the site administrators' topic asked for by anybody
 * else (FC-050), go to the not-found page: none is something to advertise to
 * somebody who cannot open it.
 *
 * A guide about a feature that is out of reach — Storytime, or since FC-049
 * Fleet Community or its chat — is a different case, and is answered with a
 * notice saying why rather than a 404. The switch being off and the backend
 * not answering are both temporary, and neither is a wrong address — a
 * visitor told their address is wrong will not come back when the feature
 * returns. A part of a guide about a switched-off feature is simply left out.
 */
@Component({
  selector: 'app-help-guide',
  templateUrl: './help-guide.component.html',
  standalone: true,
  imports: [
    RouterModule,
    CollapsibleSectionComponent,
    FeatureUnavailableComponent,
  ],
})
export class HelpGuideComponent extends HelpPageDirective implements OnInit {
  /** The guide being read, once it has been resolved. */
  guide: HelpGuide | null = null;

  /** The parts of it on offer: none about a switched-off feature. */
  sections: HelpGuideSection[] = [];

  /** The note over each shown part whose own switch is off, or null (FC-050). */
  sectionNotes: (string | null)[] = [];

  /** The note that the guide's feature is switched off, or null (FC-050). */
  switchedOff: string | null = null;

  /** The other guides in the same topic, offered at the end. */
  otherGuides: HelpGuide[] = [];

  /** The topic heading, shown above the guide's title. */
  topicTitle = '';

  /** The topic's own page, which the breadcrumb leads back to (FC-048). */
  topicLink = '';

  /**
   * Resolves the guide named in the address.
   *
   * Watches the parameter rather than reading it once, so following a link to
   * another guide from the foot of this one re-renders in place.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.watchPage('guideSlug', (slug, features, permissions) => {
      const location = findHelpGuide(slug);

      if (
        !location ||
        !isTopicPermitted(location.topic, this._authService.isAdmin())
      ) {
        this.sendToNotFound();
        return;
      }

      const blocking = blockingFeature(
        features,
        location.topic.requiresFeature,
        location.guide.requiresFeature,
      );

      if (blocking) {
        this.showUnavailable(blocking);
        return;
      }

      if (!isGuidePermitted(location.guide, permissions)) {
        this.sendToNotFound();
        return;
      }

      this.show(location, features, permissions);
    });
  }

  /**
   * Puts a resolved guide on screen.
   *
   * The title is set here rather than from route data because one route serves
   * every guide, so the address is the only thing that says which.
   *
   * What is offered at the foot is filtered the same way the index is. A
   * moderator reading about the queue should not be offered the Spotlight
   * guide when the Spotlight is not their job: the link would take them to the
   * not-found page.
   *
   * @param location The guide and the topic it belongs to.
   * @param features Where each feature switch stands.
   * @param permissions The permission codes the visitor holds.
   * @returns void
   */
  private show(
    location: HelpGuideLocation,
    features: HelpFeatures,
    permissions: ReadonlySet<string>,
  ): void {
    const off = switchedOffFeature(
      features,
      location.topic.requiresFeature,
      location.guide.requiresFeature,
    );

    const unreachable = unreachableFeature(
      features,
      location.topic.requiresFeature,
      location.guide.requiresFeature,
    );

    this.markShown(unreachable);
    this.guide = location.guide;
    this.switchedOff = off === null ? null : switchedOffNote(off, 'guide');
    this.sections = visibleSections(location.guide, features);
    // A part says nothing more while the whole guide is noted: chat is off
    // whenever Fleet Community is.
    this.sectionNotes = this.sections.map(section => {
      const sectionOff = switchedOffFeature(features, section.requiresFeature);

      return off !== null || sectionOff === null
        ? null
        : switchedOffNote(sectionOff, 'section');
    });
    this.topicTitle = location.topic.title;
    this.topicLink = this._routingService.getLink(
      this.appRoutes.HELP_TOPIC.replace(':topicId', location.topic.id),
    );
    this.otherGuides = location.topic.guides.filter(
      candidate =>
        candidate.slug !== location.guide.slug &&
        isGuidePermitted(candidate, permissions) &&
        isFeatureOffered(candidate.requiresFeature, features),
    );
    this._pageTitleService.setTitle(location.guide.title);
  }

  /**
   * Says why a guide cannot be read, in place of the guide.
   *
   * @param feature The feature out of reach.
   * @returns void
   */
  private showUnavailable(feature: HelpFeature): void {
    this.guide = null;
    this.sections = [];
    this.otherGuides = [];
    this.topicTitle = '';
    this.topicLink = '';
    this.markUnavailable(feature);
  }
}
