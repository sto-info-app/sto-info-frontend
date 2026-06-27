import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs';

import {
  SEO_APP_TITLE,
  SEO_AUTHOR,
  SEO_DESCRIPTION,
  SEO_OG_IMAGE_URL,
  SEO_SITE_URL,
  SEO_TWITTER_HANDLE,
  SEO_TWITTER_IMAGE_URL,
} from '../constants/seo.constants';
import { PageTitleService } from './page-title.service';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly document = inject(DOCUMENT);

  /**
   * Initializes SEO handling for the application.
   * Sets default meta tags and subscribes to router navigation events
   * to update tags when the active route changes.
   */
  init(): void {
    // Apply default tags on initial load
    this.updateStandardTags(this.buildFullTitle());

    // Update on every navigation end based on route data title
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        mergeMap(route => route.data),
      )
      .subscribe(data => {
        const pageTitle = data['title'] as string | undefined;
        const fullTitle = this.buildFullTitle(pageTitle);

        this.updateStandardTags(fullTitle);
      });
  }

  /**
   * Updates SEO meta tags for a dynamic, content-driven page (e.g. a news
   * post) once its data has loaded after navigation.
   *
   * @param pageTitle The page-specific title.
   * @param description Optional page-specific description; falls back to the
   *   site default when omitted or empty.
   * @param imageUrl Optional absolute Open Graph/Twitter image URL; falls back
   *   to the site default when omitted or empty.
   */
  setPageMeta(
    pageTitle: string,
    description?: string,
    imageUrl?: string,
  ): void {
    const fullTitle = this.buildFullTitle(pageTitle);
    const customImage = imageUrl?.trim();
    this.updateStandardTags(
      fullTitle,
      description?.trim() || SEO_DESCRIPTION,
      customImage || SEO_OG_IMAGE_URL,
      customImage || SEO_TWITTER_IMAGE_URL,
    );
  }

  /**
   * Builds the full page title including the global suffix.
   *
   * @param pageTitle Optional page-specific title.
   * @returns The composed title used for meta and document title.
   */
  private buildFullTitle(pageTitle?: string): string {
    const titleSuffix = this.pageTitleService.getTitleSuffix();

    if (pageTitle) {
      return `${pageTitle} - ${titleSuffix}`;
    }

    return titleSuffix || 'Star Trek Online Info Portal';
  }

  /**
   * Updates standard SEO-related meta tags for the given page title.
   * Also ensures the canonical link tag is present and up to date.
   *
   * @param title The full page title to apply to meta tags.
   * @param description The description to apply; defaults to the site default.
   * @param ogImageUrl The Open Graph image URL; defaults to the site default.
   * @param twitterImageUrl The Twitter image URL; defaults to the site default.
   */
  private updateStandardTags(
    title: string,
    description: string = SEO_DESCRIPTION,
    ogImageUrl: string = SEO_OG_IMAGE_URL,
    twitterImageUrl: string = SEO_TWITTER_IMAGE_URL,
  ): void {
    const canonicalUrl = this.getCanonicalUrl();

    // Generic meta tags
    this.meta.updateTag({
      name: 'description',
      content: description,
    });
    this.meta.updateTag({ name: 'application-name', content: SEO_APP_TITLE });
    this.meta.updateTag({ name: 'author', content: SEO_AUTHOR });

    // Open Graph tags
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: title });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({
      property: 'og:description',
      content: description,
    });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({
      property: 'og:image',
      content: ogImageUrl,
    });

    // Twitter Card tags
    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: description,
    });
    this.meta.updateTag({
      name: 'twitter:image',
      content: twitterImageUrl,
    });
    this.meta.updateTag({
      name: 'twitter:site',
      content: SEO_TWITTER_HANDLE,
    });
    this.meta.updateTag({
      name: 'twitter:creator',
      content: SEO_TWITTER_HANDLE,
    });

    this.updateCanonicalLink(canonicalUrl);
  }

  /**
   * Resolves the canonical URL for the current router state.
   * Falls back to the configured site URL if resolution fails.
   *
   * @returns The canonical URL as an absolute string.
   */
  private getCanonicalUrl(): string {
    try {
      const currentPath = this.router.url || '/';
      /* istanbul ignore next */
      const origin = globalThis.location?.origin || SEO_SITE_URL;
      return new URL(currentPath, origin).toString();
    } catch {
      return SEO_SITE_URL;
    }
  }

  /**
   * Creates or updates the canonical link element in the document head.
   *
   * @param canonicalUrl The canonical URL to set on the link element.
   */
  private updateCanonicalLink(canonicalUrl: string): void {
    const head = this.document.head;
    if (!head) {
      return;
    }

    let linkEl = head.querySelector<HTMLLinkElement>("link[rel='canonical']");

    if (!linkEl) {
      linkEl = this.document.createElement('link');
      linkEl.setAttribute('rel', 'canonical');
      head.appendChild(linkEl);
    }

    linkEl.setAttribute('href', canonicalUrl);
  }
}
