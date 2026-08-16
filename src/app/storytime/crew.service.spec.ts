import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CrewService } from './crew.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';
const COLLABORATOR_ID = 'collaborator-1';
const CREDIT_ID = 'credit-1';

describe('CrewService', () => {
  let service: CrewService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CrewService, { provide: AuthService, useValue: authService }],
    });

    service = TestBed.inject(CrewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('reading', () => {
    // The roles are a taxonomy a client needs to render credits at all, so
    // they are readable without an account.
    it('lists the roles without a token', async () => {
      const roles = firstValueFrom(service.getRoles());

      const request = httpMock.expectOne(API_URLS.STORYTIME_CREW_ROLES);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush([]);

      await expect(roles).resolves.toEqual([]);
    });

    it('reads a Story’s credits through its slug', async () => {
      const credits = firstValueFrom(service.getCredits('a-story'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/a-story/credits`)
        .flush([]);

      await expect(credits).resolves.toEqual([]);
    });
  });

  describe('collaborators', () => {
    it('lists who is helping write a Story', async () => {
      const collaborators = firstValueFrom(service.getCollaborators(STORY_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/collaborators`,
      );
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      request.flush([]);

      await expect(collaborators).resolves.toEqual([]);
    });

    it('lists the caller’s own invitations', async () => {
      const invitations = firstValueFrom(service.getMyInvitations());

      httpMock
        .expectOne(`${API_URLS.STORYTIME_MANAGE_COLLABORATIONS}/invitations`)
        .flush([]);

      await expect(invitations).resolves.toEqual([]);
    });

    it('invites somebody', async () => {
      const invited = firstValueFrom(
        service.invite(STORY_ID, {
          userId: 'member-1',
          canManageChapters: true,
        }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/collaborators`,
      );
      expect(request.request.body).toEqual({
        userId: 'member-1',
        canManageChapters: true,
      });
      request.flush({ id: COLLABORATOR_ID });

      await expect(invited).resolves.toBeDefined();
    });

    it('changes what a collaborator may do', async () => {
      const updated = firstValueFrom(
        service.updateCollaborator(COLLABORATOR_ID, { canManageCrew: true }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_COLLABORATORS}/${COLLABORATOR_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      request.flush({ id: COLLABORATOR_ID });

      await expect(updated).resolves.toBeDefined();
    });

    it.each([
      ['accept', () => service.accept(COLLABORATOR_ID)],
      ['decline', () => service.decline(COLLABORATOR_ID)],
      ['revoke', () => service.revoke(COLLABORATOR_ID)],
    ])('%ss a collaboration', async (action, act) => {
      const result = firstValueFrom(act());

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_COLLABORATORS}/${COLLABORATOR_ID}/${action}`,
      );
      expect(request.request.method).toBe('POST');
      request.flush({ id: COLLABORATOR_ID });

      await expect(result).resolves.toBeDefined();
    });
  });

  describe('credits', () => {
    it('credits somebody', async () => {
      const credit = firstValueFrom(
        service.addCredit(STORY_ID, {
          userId: 'member-1',
          roleId: 'role-1',
        }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${STORY_ID}/credits`,
      );
      expect(request.request.body).toEqual({
        userId: 'member-1',
        roleId: 'role-1',
      });
      request.flush({ id: CREDIT_ID });

      await expect(credit).resolves.toBeDefined();
    });

    it('rewords a credit', async () => {
      const credit = firstValueFrom(
        service.updateCredit(CREDIT_ID, { creditLabel: 'Additional dialogue' }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CREDITS}/${CREDIT_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      request.flush({ id: CREDIT_ID });

      await expect(credit).resolves.toBeDefined();
    });

    it('removes a credit', async () => {
      const removed = firstValueFrom(service.removeCredit(CREDIT_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_MANAGE_CREDITS}/${CREDIT_ID}`,
      );
      expect(request.request.method).toBe('DELETE');
      request.flush(null);

      await expect(removed).resolves.toBeNull();
    });
  });

  // Managing a team is something only a signed-in creator does, so failing is
  // honest; sending the request anyway would only earn a 401.
  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each([
      ['getCollaborators', () => service.getCollaborators(STORY_ID)],
      ['getMyInvitations', () => service.getMyInvitations()],
      ['invite', () => service.invite(STORY_ID, { userId: 'm' })],
      [
        'updateCollaborator',
        () => service.updateCollaborator(COLLABORATOR_ID, {}),
      ],
      ['accept', () => service.accept(COLLABORATOR_ID)],
      ['decline', () => service.decline(COLLABORATOR_ID)],
      ['revoke', () => service.revoke(COLLABORATOR_ID)],
      [
        'addCredit',
        () => service.addCredit(STORY_ID, { userId: 'm', roleId: 'r' }),
      ],
      ['updateCredit', () => service.updateCredit(CREDIT_ID, {})],
      ['removeCredit', () => service.removeCredit(CREDIT_ID)],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });

    // Reading a published Story's credits needs no account at all.
    it('still reads a public credits roll', async () => {
      const credits = firstValueFrom(service.getCredits('a-story'));

      httpMock
        .expectOne(`${API_URLS.STORYTIME_STORIES}/a-story/credits`)
        .flush([]);

      await expect(credits).resolves.toEqual([]);
    });
  });
});
