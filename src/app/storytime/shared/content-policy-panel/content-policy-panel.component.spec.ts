import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedStory } from 'src/app/models/storytime.models';
import { StoryService } from '../../story.service';
import {
  PUBLISHING_REPRESENTATIONS,
  STORYTIME_COPY,
} from '../../storytime.constants';
import { ContentPolicyPanelComponent } from './content-policy-panel.component';

describe('ContentPolicyPanelComponent', () => {
  let fixture: ComponentFixture<ContentPolicyPanelComponent>;
  let storyService: { acceptContentPolicy: jest.Mock };

  /**
   * Builds a Story.
   *
   * @param overrides - Fields to change.
   * @returns The Story.
   */
  const buildStory = (overrides: Partial<ManagedStory> = {}): ManagedStory =>
    ({
      id: 'story-1',
      title: 'A Story',
      contentPolicyAcceptedAt: null,
      contentPolicyCurrent: false,
      ...overrides,
    }) as ManagedStory;

  /**
   * Builds and renders the panel for a Story.
   *
   * @param story - The Story the terms are being accepted for.
   * @returns The rendered element.
   */
  const render = (story: ManagedStory = buildStory()): HTMLElement => {
    fixture = TestBed.createComponent(ContentPolicyPanelComponent);
    fixture.componentRef.setInput('story', story);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    storyService = {
      acceptContentPolicy: jest
        .fn()
        .mockReturnValue(of(buildStory({ contentPolicyCurrent: true }))),
    };

    TestBed.configureTestingModule({
      imports: [ContentPolicyPanelComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
      ],
    });
  });

  it('asks for the terms to be accepted', () => {
    expect(render().textContent).toContain(
      STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT,
    );
  });

  // The promises are made here, so they have to be readable here rather than
  // only on the document being agreed to.
  it.each(PUBLISHING_REPRESENTATIONS)('sets out that %s', representation => {
    expect(render().textContent).toContain(representation);
  });

  // Being told to do something a second time is confusing unless you are told
  // why, so the wording changes rather than simply reappearing.
  it('explains itself when the terms have been superseded', () => {
    const text =
      render(buildStory({ contentPolicyAcceptedAt: '2026-06-01T00:00:00Z' }))
        .textContent ?? '';

    expect(text).toContain(STORYTIME_COPY.POLICY_REACCEPTANCE_PROMPT);
    expect(text).not.toContain(STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT);
  });

  // Nothing at all when there is nothing to ask, so a caller can place it
  // without repeating the test.
  it('says nothing once the terms are current', () => {
    const element = render(
      buildStory({
        contentPolicyAcceptedAt: '2026-06-01T00:00:00Z',
        contentPolicyCurrent: true,
      }),
    );

    expect(element.textContent?.trim()).toBe('');
  });

  it('records the confirmation and announces the Story', () => {
    const accepted: ManagedStory[] = [];
    const element = render();

    fixture.componentInstance.accepted.subscribe(story => accepted.push(story));
    element.querySelector('button')?.click();

    expect(storyService.acceptContentPolicy).toHaveBeenCalledWith('story-1');
    expect(accepted[0].contentPolicyCurrent).toBe(true);
  });

  it('shows the reason the server refused', () => {
    storyService.acceptContentPolicy.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'That Story has been removed.' },
          }),
      ),
    );

    const element = render();
    element.querySelector('button')?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('has been removed');
  });

  it('falls back to a generic message when the server gives none', () => {
    storyService.acceptContentPolicy.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const element = render();
    element.querySelector('button')?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('could not be recorded');
  });
});
