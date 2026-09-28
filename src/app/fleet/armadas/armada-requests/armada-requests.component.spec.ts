import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { of, throwError } from 'rxjs';

import {
  armadaBeta,
  armadaFleet,
  armadaNode,
  armadaRequest,
  armadaRoute,
  ArmadaRouteStubs,
  armadaStructure,
  armadaView,
  HIDDEN_ARMADA_FLEET,
} from 'src/app/fleet/armadas/armada.testing';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ArmadaPosition,
  ArmadaRequestPage,
  ArmadaRequestStatus,
} from 'src/app/models/fleet-armada.models';

import {
  ARMADA_ANSWER_FAILED,
  ARMADA_REQUESTS_NOT_PERMITTED,
  ArmadaRequestsComponent,
} from './armada-requests.component';

const TENTH = armadaFleet('Tenth Fleet');

/**
 * Builds a page of requests.
 *
 * @param overrides - Fields to override.
 * @returns One open request from the Ninth Fleet.
 */
function requestPage(
  overrides: Partial<ArmadaRequestPage> = {},
): ArmadaRequestPage {
  return {
    items: [armadaRequest()],
    page: 1,
    pageSize: 25,
    total: 1,
    ...overrides,
  };
}

describe('ArmadaRequestsComponent', () => {
  let fixture: ComponentFixture<ArmadaRequestsComponent>;
  let route: ArmadaRouteStubs;
  let service: {
    requests: jest.Mock;
    view: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
  };
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param query - The address's query.
   */
  async function render(query: Record<string, string> = {}): Promise<void> {
    route.query$.next(convertToParamMap(query));

    await TestBed.configureTestingModule({
      imports: [ArmadaRequestsComponent],
      providers: [
        ...route.providers,
        { provide: FleetArmadaService, useValue: service },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(ArmadaRequestsComponent);
    fixture.detectChanges();
  }

  /**
   * Finds an element.
   *
   * @param selector - The selector.
   * @returns The element, or null.
   */
  function find(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  /** Submits the answer form. */
  function submit(): void {
    (find('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * The answer form's submit button.
   *
   * @returns Whether it is disabled.
   */
  function submitDisabled(): boolean {
    return (find('form button[type="submit"]') as HTMLButtonElement).disabled;
  }

  beforeEach(() => {
    route = armadaRoute(['armada.manage']);
    service = {
      requests: jest.fn(() => of(requestPage())),
      view: jest.fn(() =>
        of(
          armadaView({
            mayManage: true,
            structure: armadaStructure({
              alpha: armadaNode(
                armadaFleet('Sol Flagship'),
                ArmadaPosition.ALPHA,
              ),
              betas: [armadaBeta(TENTH), armadaBeta(HIDDEN_ARMADA_FLEET)],
            }),
          }),
        ),
      ),
      approve: jest.fn(() => of(armadaView())),
      reject: jest.fn(() => of(armadaView())),
    };
  });

  describe('who may answer', () => {
    it('turns away a reader who may not answer requests', async () => {
      route = armadaRoute([]);

      await render();

      expect(pageText(fixture)).toContain(ARMADA_REQUESTS_NOT_PERMITTED);
      expect(pageText(fixture)).toContain('Sol Armada');
      expect(find('app-armada-tabs')).not.toBeNull();
      expect(service.requests).not.toHaveBeenCalled();
    });
  });

  describe('the list', () => {
    it('shows the open requests by default', async () => {
      await render();

      const text = pageText(fixture);

      expect(service.requests).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        ArmadaRequestStatus.PENDING,
        1,
      );
      expect(service.view).toHaveBeenCalledWith('community-1', 'armada-1');
      expect(text).toContain('Open requests, newest first');
      expect(text).toContain('Ninth Fleet');
      expect(text).toContain('FleetOwner');
      expect(text).toContain('We would like to join.');
      expect(findButton(fixture, 'Approve…')).not.toBeUndefined();
    });

    it('shows the status the address asks for, and its reasons', async () => {
      service.requests.mockReturnValue(
        of(
          requestPage({
            items: [
              armadaRequest({
                status: ArmadaRequestStatus.REJECTED,
                fleet: HIDDEN_ARMADA_FLEET,
                requestedBy: null,
                message: null,
                reason: 'No room',
              }),
            ],
          }),
        ),
      );

      await render({ status: 'REJECTED' });

      const text = pageText(fixture);

      expect(service.requests).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        ArmadaRequestStatus.REJECTED,
        1,
      );
      expect(text).toContain('A Fleet you cannot see');
      expect(text).toContain('Rejected: No room');
      expect(text).toContain('—');
      expect(findButton(fixture, 'Approve…')).toBeUndefined();
    });

    it('falls back to the open requests for a status it does not know', async () => {
      await render({ status: 'MISLAID' });

      expect(service.requests).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        ArmadaRequestStatus.PENDING,
        1,
      );
    });

    it('says when there are none in that status', async () => {
      service.requests.mockReturnValue(
        of(requestPage({ items: [], total: 0 })),
      );

      await render({ status: 'LAPSED' });

      expect(pageText(fixture)).toContain('No lapsed requests.');
    });

    it('changes status by the address, from its first page', async () => {
      await render();

      chooseFrom(fixture, '#armada-request-status', 'WITHDRAWN');
      expect(navigate).toHaveBeenLastCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { status: 'WITHDRAWN', page: null },
        queryParamsHandling: 'merge',
      });

      chooseFrom(fixture, '#armada-request-status', 'PENDING');
      expect(navigate).toHaveBeenLastCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { status: null, page: null },
        queryParamsHandling: 'merge',
      });
    });
  });

  describe('paging', () => {
    it('offers no paging for a single page', async () => {
      await render();

      expect(findButton(fixture, 'Older')).toBeUndefined();
    });

    it('asks for the page the address names, and never a bad one', async () => {
      await render({ page: '2' });

      expect(service.requests).toHaveBeenLastCalledWith(
        'community-1',
        'armada-1',
        ArmadaRequestStatus.PENDING,
        2,
      );

      route.query$.next(convertToParamMap({ page: 'next' }));

      expect(service.requests).toHaveBeenLastCalledWith(
        'community-1',
        'armada-1',
        ArmadaRequestStatus.PENDING,
        1,
      );
    });

    it('moves between pages by the address', async () => {
      service.requests.mockReturnValue(
        of(requestPage({ page: 2, pageSize: 1, total: 3 })),
      );

      await render();

      expect(pageText(fixture)).toContain('Page 2 of 3');

      pressButton(fixture, 'Older');
      expect(navigate).toHaveBeenLastCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { page: 3 },
        queryParamsHandling: 'merge',
      });

      pressButton(fixture, 'Newer');
      expect(navigate).toHaveBeenLastCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { page: null },
        queryParamsHandling: 'merge',
      });
    });

    it('counts no pages of an empty page size', () => {
      expect(
        ArmadaRequestsComponent.prototype.totalPages(
          requestPage({ pageSize: 0 }),
        ),
      ).toBe(0);
    });
  });

  describe('approving', () => {
    it('asks where the Fleet goes, as a Beta unless told otherwise', async () => {
      await render();
      pressButton(fixture, 'Approve…');

      expect(pageText(fixture)).toContain('Where does Ninth Fleet go?');
      expect(pageText(fixture)).toContain(
        'The Armada has an Alpha and 2 of 3 Betas.',
      );
      expect(findButton(fixture, 'Approve…')).toBeUndefined();

      submit();

      expect(service.approve).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        'request-1',
        { position: ArmadaPosition.BETA },
      );
      expect(find('[role="status"]')?.textContent).toContain(
        'Ninth Fleet joined the Armada.',
      );
      expect(service.requests).toHaveBeenCalledTimes(2);
    });

    it('says so when the Alpha slot is empty', async () => {
      service.view.mockReturnValue(of(armadaView()));

      await render();
      pressButton(fixture, 'Approve…');

      expect(pageText(fixture)).toContain(
        'The Armada has no Alpha and 0 of 3 Betas.',
      );
    });

    it('needs a Beta, from those the reader may see, for a Gamma', async () => {
      await render();
      pressButton(fixture, 'Approve…');
      chooseFrom(fixture, '#armada-approve-position', ArmadaPosition.GAMMA);

      const options = Array.from(
        (find('#armada-approve-parent') as HTMLSelectElement).options,
      ).map(option => option.textContent?.replace(/\s+/g, ' ').trim());

      expect(options).toEqual(['Choose a Beta', 'Tenth Fleet (0 of 3)']);
      expect(submitDisabled()).toBe(true);

      chooseFrom(fixture, '#armada-approve-parent', TENTH.id as string);
      submit();

      expect(service.approve).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        'request-1',
        { position: ArmadaPosition.GAMMA, parentFleetId: TENTH.id },
      );
    });

    it('shows the server’s refusal and keeps the form', async () => {
      service.approve.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'An Armada has at most 3 Betas.' },
            }),
        ),
      );

      await render();
      pressButton(fixture, 'Approve…');
      submit();

      expect(pageText(fixture)).toContain('An Armada has at most 3 Betas.');
      expect(find('form')).not.toBeNull();
      expect(fixture.componentInstance.busy()).toBe(false);
    });

    it('closes the form on Cancel', async () => {
      await render();
      pressButton(fixture, 'Approve…');
      pressButton(fixture, 'Cancel');

      expect(find('form')).toBeNull();
    });
  });

  describe('rejecting', () => {
    it('needs a reason, then rejects and says so', async () => {
      await render();
      pressButton(fixture, 'Reject…');

      expect(pageText(fixture)).toContain(
        'Reject the request from Ninth Fleet?',
      );
      expect(submitDisabled()).toBe(true);

      submit();
      expect(service.reject).not.toHaveBeenCalled();

      typeInto(fixture, '#armada-reject-reason', '  No room  ');
      submit();

      expect(service.reject).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        'request-1',
        'No room',
      );
      expect(pageText(fixture)).toContain(
        'The request from Ninth Fleet was rejected.',
      );
    });

    it('says a failure it cannot explain plainly', async () => {
      service.reject.mockReturnValue(throwError(() => new Error('down')));

      await render();
      pressButton(fixture, 'Reject…');
      typeInto(fixture, '#armada-reject-reason', 'No room');
      submit();

      expect(pageText(fixture)).toContain(ARMADA_ANSWER_FAILED);
    });
  });

  it('sends nothing with no answer open', async () => {
    await render();

    expect(fixture.componentInstance.ready()).toBe(false);
  });
});
