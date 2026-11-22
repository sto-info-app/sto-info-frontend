import { TestBed } from '@angular/core/testing';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';

import { FleetEventWhenComponent } from './fleet-event-when.component';

describe('FleetEventWhenComponent', () => {
  let zone: string;

  /**
   * Draws the time.
   *
   * @param startsAt - When it starts.
   * @param timezone - The event's zone.
   * @returns What it says.
   */
  function render(startsAt: string, timezone: string): string {
    TestBed.configureTestingModule({
      imports: [FleetEventWhenComponent],
      providers: [
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => zone },
        },
      ],
    });

    const fixture = TestBed.createComponent(FleetEventWhenComponent);

    fixture.componentRef.setInput('startsAt', startsAt);
    fixture.componentRef.setInput(
      'endsAt',
      new Date(new Date(startsAt).getTime() + 7_200_000).toISOString(),
    );
    fixture.componentRef.setInput('timezone', timezone);
    fixture.detectChanges();

    return (fixture.nativeElement as HTMLElement)
      .textContent!.replace(/\s+/g, ' ')
      .trim();
  }

  it('says the zones agree when the reader shares the event’s clock', () => {
    zone = 'Europe/London';

    expect(render('2026-10-02T19:00:00.000Z', 'Europe/London')).toBe(
      'Fri 2 Oct 2026, 20:00–22:00 (Europe/London time)',
    );
  });

  it('gives the event’s own time and zone beside the reader’s', () => {
    zone = 'Europe/London';

    expect(render('2026-10-02T19:00:00.000Z', 'Europe/Berlin')).toContain(
      '20:00–22:00 your time · 21:00 Europe/Berlin',
    );
  });

  it('gives the event’s day too where it differs', () => {
    zone = 'Europe/London';

    expect(render('2026-10-02T23:30:00.000Z', 'America/New_York')).toContain(
      'your time · Fri 2 Oct 19:30 America/New_York',
    );
  });
});
