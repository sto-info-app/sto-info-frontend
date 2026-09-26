import { Provider } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

/** The Fleet's own address, which every recruitment page hangs below. */
export const RECRUITMENT_FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';

/**
 * Builds the Fleet as the server resolves it, for a reader holding some
 * capabilities.
 *
 * @param capabilities - What they hold.
 * @param fleet - Changes to the Fleet.
 * @returns The resolved Fleet.
 */
export function recruitmentFleet(
  capabilities: string[],
  fleet: Partial<ResolvedStoFleet['fleet']> = {},
): ResolvedStoFleet {
  return {
    fleet: {
      id: 'fleet-1',
      slug: 'ninth-fleet',
      exactGameName: 'Ninth Fleet',
      communityId: 'community-1',
      platformName: 'Windows',
      platformProvidesRosterExport: true,
      ...fleet,
    },
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: { capabilities },
  } as unknown as ResolvedStoFleet;
}

/** The address a recruitment page is opened at, and the Fleet it names. */
export interface RecruitmentRouteStubs {
  readonly params$: BehaviorSubject<ParamMap>;
  readonly query$: BehaviorSubject<ParamMap>;
  readonly scopes: { resolveFleet: jest.Mock };
  readonly providers: Provider[];
}

/**
 * The providers a recruitment page needs to resolve its Fleet.
 *
 * @param capabilities - What the reader holds.
 * @param params - Address segments beyond the Fleet's.
 * @returns The stubs, and the providers built on them.
 */
export function recruitmentRoute(
  capabilities: string[],
  params: Record<string, string> = {},
): RecruitmentRouteStubs {
  const params$ = new BehaviorSubject<ParamMap>(
    convertToParamMap({
      communitySlug: 'united-federation-alliance',
      platformSegment: 'pc',
      slug: 'ninth-fleet',
      ...params,
    }),
  );
  const query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  const scopes = {
    resolveFleet: jest.fn(() => of(recruitmentFleet(capabilities))),
  };

  return {
    params$,
    query$,
    scopes,
    providers: [
      provideRouter([]),
      { provide: FleetReportService, useValue: { visible: () => of([]) } },
      { provide: FleetScopeService, useValue: scopes },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: params$, queryParamMap: query$ },
      },
    ],
  };
}

/**
 * The page's text, whitespace collapsed.
 *
 * @param fixture - The page.
 * @returns The text.
 */
export function pageText(fixture: ComponentFixture<unknown>): string {
  return String((fixture.nativeElement as HTMLElement).textContent).replace(
    /\s+/g,
    ' ',
  );
}

/**
 * Presses a button by its label.
 *
 * @param fixture - The page.
 * @param label - What the button says.
 */
export function pressButton(
  fixture: ComponentFixture<unknown>,
  label: string,
): void {
  // Undefined when there is none, which fails the test that pressed it.
  (findButton(fixture, label) as HTMLButtonElement).click();
  fixture.detectChanges();
}

/**
 * Finds a button by its label.
 *
 * @param fixture - The page.
 * @param label - What the button says.
 * @returns The button, or undefined.
 */
export function findButton(
  fixture: ComponentFixture<unknown>,
  label: string,
): HTMLButtonElement | undefined {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find(candidate => String(candidate.textContent).trim() === label);
}

/**
 * Types into a field as a reader would.
 *
 * @param fixture - The page.
 * @param selector - The field.
 * @param value - What is typed.
 */
export function typeInto(
  fixture: ComponentFixture<unknown>,
  selector: string,
  value: string,
): void {
  const field = (fixture.nativeElement as HTMLElement).querySelector(
    selector,
  ) as HTMLInputElement | HTMLTextAreaElement;

  field.value = value;
  field.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

/**
 * Chooses from a list as a reader would.
 *
 * @param fixture - The page.
 * @param selector - The list.
 * @param value - The option's value.
 */
export function chooseFrom(
  fixture: ComponentFixture<unknown>,
  selector: string,
  value: string,
): void {
  const select = (fixture.nativeElement as HTMLElement).querySelector(
    selector,
  ) as HTMLSelectElement;

  select.value = value;
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}
