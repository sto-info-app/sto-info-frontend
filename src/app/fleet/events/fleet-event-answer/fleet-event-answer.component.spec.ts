import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import { FleetOccurrenceSummary } from 'src/app/models/fleet-events.models';

import { occurrenceSummary } from '../fleet-events.testing';
import {
  FleetEventAnswer,
  FleetEventAnswerComponent,
} from './fleet-event-answer.component';

const CHARACTERS = [
  { id: 'character-1', label: 'Kira@kira#1234' },
  { id: 'character-2', label: 'Nerys@kira#1234' },
];

describe('FleetEventAnswerComponent', () => {
  let fixture: ComponentFixture<FleetEventAnswerComponent>;
  let answered: FleetEventAnswer[];
  let withdrawn: number;

  /**
   * Draws the control.
   *
   * @param occurrence - What differs about the occurrence.
   * @param inputs - The capacity, Characters and whether it is busy.
   */
  function render(
    occurrence: Partial<FleetOccurrenceSummary> = {},
    inputs: {
      capacity?: number | null;
      characters?: typeof CHARACTERS;
      busy?: boolean;
    } = {},
  ): void {
    fixture = TestBed.createComponent(FleetEventAnswerComponent);
    fixture.componentRef.setInput('occurrence', occurrenceSummary(occurrence));
    fixture.componentRef.setInput('capacity', inputs.capacity ?? null);
    fixture.componentRef.setInput('characters', inputs.characters ?? []);
    fixture.componentRef.setInput('busy', inputs.busy ?? false);
    answered = [];
    withdrawn = 0;
    fixture.componentInstance.answered.subscribe(answer =>
      answered.push(answer),
    );
    fixture.componentInstance.withdrawn.subscribe(() => (withdrawn += 1));
    fixture.detectChanges();
  }

  /**
   * The Character picker.
   *
   * @returns It, or null.
   */
  const picker = (): HTMLSelectElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('select');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetEventAnswerComponent],
    }).compileComponents();
  });

  it('asks somebody who has not answered, offering no Character when they have none', () => {
    render();

    expect(pageText(fixture)).toContain('You have not answered.');
    expect(picker()).toBeNull();
    expect(findButton(fixture, 'Take my answer back')).toBeUndefined();

    pressButton(fixture, 'Going');

    expect(answered).toEqual([{ response: 'GOING', characterId: null }]);
  });

  it('answers as the Character chosen', () => {
    render({}, { characters: CHARACTERS });

    const select = picker()!;

    select.value = 'character-2';
    select.dispatchEvent(new Event('change'));
    pressButton(fixture, 'Maybe');

    expect(answered).toEqual([
      { response: 'MAYBE', characterId: 'character-2' },
    ]);
  });

  it.each([
    [
      { response: 'GOING' as const, waitlistPosition: null },
      'You are going, with a place.',
    ],
    [
      { response: 'GOING' as const, waitlistPosition: 2 },
      'waiting for a place: 2 in line',
    ],
    [
      { response: 'MAYBE' as const, waitlistPosition: null },
      'Maybe holds no place.',
    ],
    [
      { response: 'NOT_GOING' as const, waitlistPosition: null },
      'You can’t go.',
    ],
  ])('says what their answer means', (mine, said) => {
    render({ mine: { ...mine, characterId: null } });

    expect(pageText(fixture)).toContain(said);
  });

  it('keeps the Character they answered with, and takes the answer back', () => {
    render(
      {
        mine: {
          response: 'GOING',
          characterId: 'character-1',
          waitlistPosition: null,
        },
      },
      { characters: CHARACTERS },
    );

    expect(picker()!.value).toBe('character-1');
    expect(findButton(fixture, 'Going')?.getAttribute('aria-pressed')).toBe(
      'true',
    );

    pressButton(fixture, 'Take my answer back');

    expect(withdrawn).toBe(1);
  });

  it('warns that Going waits once every place is taken', () => {
    render(
      { counts: { going: 10, maybe: 0, waitlisted: 3, notGoing: null } },
      { capacity: 10 },
    );

    expect(pageText(fixture)).toContain(
      'Every place is taken, so answering Going puts you on the waitlist.',
    );
  });

  it.each([
    ['with places left', { going: 3 }, 10, null],
    ['with no limit', { going: 30 }, null, null],
    ['to somebody already Going', { going: 10 }, 10, 'GOING' as const],
  ])('gives no warning %s', (_label, counts, capacity, response) => {
    render(
      {
        counts: {
          going: 0,
          maybe: 0,
          waitlisted: 0,
          notGoing: null,
          ...counts,
        },
        mine:
          response === null
            ? null
            : { response, characterId: null, waitlistPosition: null },
      },
      { capacity },
    );

    expect(pageText(fixture)).not.toContain('Every place is taken');
  });

  it('holds every button while a change is being made', () => {
    render({}, { busy: true });

    expect(findButton(fixture, 'Going')?.disabled).toBe(true);
  });
});
