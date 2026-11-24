import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';

import {
  EmailUnsubscribeComponent,
  INVALID_LINK_MESSAGE,
} from './email-unsubscribe.component';

/** The emails a link names, as the API describes them. */
const NAMED = {
  types: [
    { type: 'STORYTIME_COMMENT', label: 'Comments on my work' },
    { type: 'FRIEND_REQUEST', label: 'Friend requests' },
  ],
};

describe('EmailUnsubscribeComponent (sc-1067)', () => {
  let fixture: ComponentFixture<EmailUnsubscribeComponent>;
  let http: HttpTestingController;

  const open = (token: string | null): HTMLElement => {
    TestBed.configureTestingModule({
      imports: [EmailUnsubscribeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(token === null ? {} : { token }),
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmailUnsubscribeComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const preview = () =>
    http.expectOne(
      request =>
        request.method === 'GET' &&
        request.url === API_URLS.EMAIL_UNSUBSCRIBE &&
        request.params.get('token') === 'abc',
    );

  const stopButton = (page: HTMLElement): HTMLButtonElement =>
    Array.from(page.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Stop these emails'),
    ) as HTMLButtonElement;

  afterEach(() => http.verify());

  // A mail scanner opening the link must not unsubscribe anybody.
  it('says what the link stops, and changes nothing until confirmed', () => {
    const page = open('abc');

    expect(page.textContent).toContain('Checking your link');
    preview().flush(NAMED);
    fixture.detectChanges();

    expect(
      Array.from(page.querySelectorAll('li')).map(item =>
        item.textContent?.trim(),
      ),
    ).toEqual(['Comments on my work', 'Friend requests']);
    expect(stopButton(page)).toBeTruthy();
  });

  it('stops them when confirmed, and says so', () => {
    const page = open('abc');

    preview().flush(NAMED);
    fixture.detectChanges();
    stopButton(page).click();
    fixture.detectChanges();

    expect(page.textContent).toContain('Stopping these emails');

    const post = http.expectOne(
      request =>
        request.method === 'POST' && request.params.get('token') === 'abc',
    );

    post.flush(NAMED);
    fixture.detectChanges();

    expect(page.textContent).toContain(
      'You will get no more emails about Comments on my work, Friend requests.',
    );
    expect(stopButton(page)).toBeUndefined();
  });

  it('refuses a link with no token, without asking the API', () => {
    const page = open(null);

    expect(page.textContent).toContain(INVALID_LINK_MESSAGE);
  });

  it('refuses a link the API does not accept', () => {
    const page = open('abc');

    preview().flush(
      { message: 'That unsubscribe link is not valid.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(page.textContent).toContain(INVALID_LINK_MESSAGE);
  });

  it('says when the API cannot be reached', () => {
    const page = open('abc');

    preview().error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(page.textContent).toContain(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
  });

  it('says when stopping them failed', () => {
    const page = open('abc');

    preview().flush(NAMED);
    fixture.detectChanges();
    stopButton(page).click();
    http
      .expectOne(request => request.method === 'POST')
      .flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(page.textContent).toContain(
      'Your emails could not be changed just now. Please try again.',
    );
  });

  it('always leads to the email settings', () => {
    const page = open(null);
    const link = page.querySelector('.unsubscribe-settings a');

    expect(link?.getAttribute('href')).toBe(
      '/dashboard/settings?tab=notifications',
    );
  });
});
