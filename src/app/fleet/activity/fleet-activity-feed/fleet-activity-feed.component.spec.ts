import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, Subject, throwError } from 'rxjs';

import { FleetActivityService } from 'src/app/fleet/activity/fleet-activity.service';
import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetActivityItem,
  FleetActivityPage,
} from 'src/app/models/fleet-activity.models';

import {
  FLEET_ACTIVITY_FAILED,
  FleetActivityFeedComponent,
  FleetActivitySource,
} from './fleet-activity-feed.component';

/**
 * Builds an item.
 *
 * @param id - Its ID.
 * @param overrides - What differs.
 * @returns The item.
 */
function item(
  id: string,
  overrides: Partial<FleetActivityItem> = {},
): FleetActivityItem {
  return {
    id,
    type: 'NEWS_PUBLISHED',
    occurredAt: '2026-09-28T10:00:00.000Z',
    sentence: `Item ${id}.`,
    path: `/fleets/communities/ufa/news/${id}`,
    scope: {
      kind: 'COMMUNITY',
      name: 'United Federation Alliance',
      path: '/fleets/communities/ufa',
    },
    ...overrides,
  };
}

const SCOPE: FleetActivitySource = {
  kind: 'SCOPE',
  target: { communityId: 'community-1', fleetId: null },
};

describe('FleetActivityFeedComponent', () => {
  let fixture: ComponentFixture<FleetActivityFeedComponent>;
  let activity: { scopeFeed: jest.Mock; mine: jest.Mock };

  /**
   * Draws the feed.
   *
   * @param source - Which feed.
   * @param inputs - Anything else set on it.
   */
  async function render(
    source: FleetActivitySource = SCOPE,
    inputs: Partial<FleetActivityFeedComponent> = {},
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FleetActivityFeedComponent],
      providers: [
        provideRouter([]),
        { provide: FleetActivityService, useValue: activity },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetActivityFeedComponent);
    Object.assign(fixture.componentInstance, inputs);
    fixture.componentRef.setInput('source', source);
    fixture.detectChanges();
  }

  /**
   * The links shown.
   *
   * @returns Each link's text and address.
   */
  function links(): { text: string; href: string | null }[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => ({
      text: String(link.textContent).trim(),
      href: link.getAttribute('href'),
    }));
  }

  beforeEach(() => {
    activity = {
      scopeFeed: jest.fn((): ReturnType<FleetActivityService['scopeFeed']> =>
        of({ items: [item('a'), item('b', { path: null })], next: 'cursor-1' }),
      ),
      mine: jest.fn(() => of({ items: [item('c')], next: null })),
    };
  });

  it('reads a scope’s feed, linking each item that leads somewhere', async () => {
    await render();

    expect(activity.scopeFeed).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: null },
      null,
    );
    expect(pageText(fixture)).toContain('Item a.');
    expect(pageText(fixture)).toContain('Item b.');
    expect(links()).toEqual([
      { text: 'Item a.', href: '/fleets/communities/ufa/news/a' },
    ]);
  });

  it('reads older items below, until there are none', async () => {
    await render();
    activity.scopeFeed.mockReturnValue(
      of({ items: [item('d')], next: null } as FleetActivityPage),
    );

    pressButton(fixture, 'Older');

    expect(activity.scopeFeed).toHaveBeenLastCalledWith(
      { communityId: 'community-1', fleetId: null },
      'cursor-1',
    );
    expect(fixture.componentInstance.items().map(one => one.id)).toEqual([
      'a',
      'b',
      'd',
    ]);
    expect(findButton(fixture, 'Older')).toBeUndefined();
  });

  it('holds the Older button while a page is being read', async () => {
    const pending = new Subject<FleetActivityPage>();

    await render();
    activity.scopeFeed.mockReturnValue(pending);

    pressButton(fixture, 'Older');

    expect(findButton(fixture, 'Older')?.disabled).toBe(true);
  });

  it('names each item’s scope in the person’s own feed', async () => {
    await render({ kind: 'MINE' }, { showScope: true });

    expect(activity.mine).toHaveBeenCalledWith(null);
    expect(links()).toContainEqual({
      text: 'United Federation Alliance',
      href: '/fleets/communities/ufa',
    });
  });

  it('shows only the latest, with a link to the rest', async () => {
    await render(SCOPE, {
      latest: 1,
      allLink: ['/fleets', 'communities', 'ufa', 'activity'],
    });

    expect(pageText(fixture)).not.toContain('Item b.');
    expect(links()).toContainEqual({
      text: 'All activity',
      href: '/fleets/communities/ufa/activity',
    });
    expect(findButton(fixture, 'Older')).toBeUndefined();
  });

  it('shows only the latest without a link where there is none', async () => {
    await render(SCOPE, { latest: 1 });

    expect(links().map(link => link.text)).not.toContain('All activity');
  });

  it('says when nothing has happened', async () => {
    activity.scopeFeed.mockReturnValue(of({ items: [], next: null }));

    await render();

    expect(pageText(fixture)).toContain('Nothing has happened here yet.');
  });

  it('says when the feed could not be read', async () => {
    activity.scopeFeed.mockReturnValue(throwError(() => new Error('offline')));

    await render();

    expect(pageText(fixture)).toContain(FLEET_ACTIVITY_FAILED);
    expect(pageText(fixture)).not.toContain('Nothing has happened');
  });

  it('starts again when given another feed', async () => {
    await render();

    fixture.componentRef.setInput('source', { kind: 'MINE' });
    fixture.detectChanges();

    expect(fixture.componentInstance.items().map(one => one.id)).toEqual(['c']);
  });
});
