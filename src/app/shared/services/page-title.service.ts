import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PageTitleService {
  private readonly defaultSiteTitle = 'Star Trek Online Info Portal';

  constructor(
    private readonly title: Title,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
  ) {}

  init() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
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
          this.title.setTitle(`${pageTitle} - ${titleSuffix}`);
        } else if (titleSuffix) {
          this.title.setTitle(titleSuffix);
        } else {
          this.title.setTitle(this.defaultSiteTitle);
        }
      });
  }

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
