import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PageTitleService {
  private readonly _defaultSiteTitle = 'Star Trek Online Info Portal';

  private readonly _title = inject(Title);
  private readonly _router = inject(Router);
  private readonly _activatedRoute = inject(ActivatedRoute);

  /**
   * Starts listening for navigation changes and updates the document title.
   */
  init(): void {
    this._router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this._activatedRoute),
        map(route => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        mergeMap(route => route.data),
      )
      .subscribe(event => {
        const pageTitle = event['title'];
        const titleSuffix = this.getTitleSuffix();
        if (pageTitle) {
          this._title.setTitle(`${pageTitle} - ${titleSuffix}`);
        } else if (titleSuffix) {
          this._title.setTitle(titleSuffix);
        } else {
          this._title.setTitle(this._defaultSiteTitle);
        }
      });
  }

  /**
   * Sets the document title for a specific page, applying the standard suffix.
   *
   * Use this for dynamic, content-driven pages (e.g. a news post) whose title
   * is not known from static route data at navigation time.
   *
   * @param pageTitle The page-specific title.
   */
  setTitle(pageTitle: string): void {
    const titleSuffix = this.getTitleSuffix();
    if (pageTitle) {
      this._title.setTitle(`${pageTitle} - ${titleSuffix}`);
    } else {
      this._title.setTitle(titleSuffix || this._defaultSiteTitle);
    }
  }

  /**
   * Builds the environment-specific title suffix.
   *
   * @returns The configured site title with any environment tag appended.
   */
  getTitleSuffix(): string {
    // Tags to add to titles to help identify the environment in use
    let appTitleTestTag = '';
    if (environment.env_name === 'local') appTitleTestTag = ' [Local Dev]';
    if (environment.env_name === 'dev') appTitleTestTag = ' [Dev]';

    const siteTitle = environment.appTitle
      ? environment.appTitle
      : 'Star Trek Online Info Portal';

    return `${siteTitle}${appTitleTestTag}`;
  }
}
