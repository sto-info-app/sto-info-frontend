import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import { FleetActivityService } from 'src/app/fleet/activity/fleet-activity.service';
import {
  GovernanceReader,
  governanceRoute,
} from 'src/app/fleet/governance/governance.testing';
import { pageText } from 'src/app/fleet/recruitment/recruitment.testing';

import { FleetActivityPageComponent } from './fleet-activity-page.component';

describe('FleetActivityPageComponent', () => {
  let fixture: ComponentFixture<FleetActivityPageComponent>;
  let activity: { scopeFeed: jest.Mock };

  /**
   * Draws the page.
   *
   * @param reader - Who is reading, and where.
   */
  async function render(reader: GovernanceReader): Promise<void> {
    activity = { scopeFeed: jest.fn(() => of({ items: [], next: null })) };

    await TestBed.configureTestingModule({
      imports: [FleetActivityPageComponent],
      providers: [
        ...governanceRoute(reader, {}).providers,
        { provide: FleetActivityService, useValue: activity },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetActivityPageComponent);
    fixture.detectChanges();
  }

  it('shows a Fleet’s activity to anybody who may see it', async () => {
    await render({ onFleet: true });

    expect(activity.scopeFeed).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: 'fleet-1' },
      null,
    );
    expect(pageText(fixture)).toContain('last twelve months');
    expect(fixture.componentInstance.notPermittedMessage).toBe('');
  });

  it('shows an Armada’s under its own tabs', async () => {
    await render({ onArmada: true });

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-armada-tabs'),
    ).not.toBeNull();
  });

  it('leads a Community’s back to the Community', async () => {
    await render({});

    expect(pageText(fixture)).toContain('Back to United Federation Alliance');
  });
});
