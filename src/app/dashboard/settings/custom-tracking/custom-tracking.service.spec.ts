import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { CustomTrackingService } from './custom-tracking.service';

const SECTION_ID = 'section-1';
const TAB_ID = 'tab-1';
const FIELD_ID = 'field-1';
const OPTION_ID = 'option-1';
const TARGET_ID = 'target-1';

describe('CustomTrackingService', () => {
  let service: CustomTrackingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CustomTrackingService],
    });

    service = TestBed.inject(CustomTrackingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('configuration', () => {
    // It describes the shape of the feature rather than anybody's data, so
    // asking per panel would be a request each for an answer that cannot have
    // changed.
    it('fetches the configuration once and shares it', async () => {
      const first = firstValueFrom(service.getConfiguration());
      const second = firstValueFrom(service.getConfiguration());

      httpMock.expectOne(API_URLS.CUSTOM_TRACKING_CONFIGURATION).flush({
        features: { isEnabled: true },
      } as CustomTrackingConfiguration);

      await expect(first).resolves.toMatchObject({
        features: { isEnabled: true },
      });
      await expect(second).resolves.toMatchObject({
        features: { isEnabled: true },
      });
    });
  });

  describe('the content agreement', () => {
    it('reads the wording', async () => {
      const result = firstValueFrom(service.getAgreement());

      httpMock
        .expectOne(API_URLS.CUSTOM_TRACKING_AGREEMENT)
        .flush({ version: '1.0' });

      await expect(result).resolves.toMatchObject({ version: '1.0' });
    });

    it('reads where the user stands', async () => {
      const result = firstValueFrom(service.getPolicyStatus());

      httpMock
        .expectOne(API_URLS.CUSTOM_TRACKING_AGREEMENT_STATUS)
        .flush({ acceptanceRequired: true });

      await expect(result).resolves.toMatchObject({ acceptanceRequired: true });
    });

    // A page left open across a wording change would otherwise record
    // agreement to terms the user never saw.
    it('sends the version it displayed when accepting', async () => {
      const result = firstValueFrom(service.acceptPolicy('1.0'));

      const request = httpMock.expectOne(
        API_URLS.CUSTOM_TRACKING_AGREEMENT_ACCEPTANCE,
      );

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ acceptedVersion: '1.0' });

      request.flush({ acceptanceRequired: false });

      await expect(result).resolves.toMatchObject({
        acceptanceRequired: false,
      });
    });
  });

  describe('sections', () => {
    const scope = CustomTrackingTargetScope.CHARACTER;
    const scopeUrl = `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}`;

    it('lists them for one scope', async () => {
      const result = firstValueFrom(service.getSections(scope));

      httpMock.expectOne(`${scopeUrl}/sections`).flush([{ id: SECTION_ID }]);

      await expect(result).resolves.toEqual([{ id: SECTION_ID }]);
    });

    // The builder searches across the whole hierarchy, so it reads all of it
    // rather than one branch at a time.
    it('reads the whole scope nested, in one request', async () => {
      const result = firstValueFrom(service.getDefinitions(scope));

      httpMock
        .expectOne(`${scopeUrl}/definitions`)
        .flush([{ id: SECTION_ID, tabs: [{ id: TAB_ID, fields: [] }] }]);

      await expect(result).resolves.toEqual([
        { id: SECTION_ID, tabs: [{ id: TAB_ID, fields: [] }] },
      ]);
    });

    it('creates one in the scope named by the path', async () => {
      const result = firstValueFrom(
        service.createSection(scope, { name: 'Ships' }),
      );

      const request = httpMock.expectOne(`${scopeUrl}/sections`);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ name: 'Ships' });

      request.flush({ id: SECTION_ID });

      await expect(result).resolves.toMatchObject({ id: SECTION_ID });
    });

    it('changes one', async () => {
      const result = firstValueFrom(
        service.updateSection(SECTION_ID, { publiclyVisible: true }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${SECTION_ID}`,
      );

      expect(request.request.method).toBe('PATCH');

      request.flush({ id: SECTION_ID, publiclyVisible: true });

      await expect(result).resolves.toMatchObject({ publiclyVisible: true });
    });

    it('asks what a deletion would remove', async () => {
      const result = firstValueFrom(
        service.getSectionDeletionImpact(SECTION_ID),
      );

      httpMock
        .expectOne(
          `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${SECTION_ID}/deletion-impact`,
        )
        .flush({ tabs: 4, fields: 19, values: 63 });

      await expect(result).resolves.toEqual({
        tabs: 4,
        fields: 19,
        values: 63,
      });
    });

    it('deletes one', async () => {
      const result = firstValueFrom(service.deleteSection(SECTION_ID));

      const request = httpMock.expectOne(
        `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${SECTION_ID}`,
      );

      expect(request.request.method).toBe('DELETE');

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });

    // A complete list either describes the collection exactly or does not, and
    // the server says which; one item and a position could not.
    it('sends the whole order when reordering', async () => {
      const result = firstValueFrom(service.reorderSections(scope, ['b', 'a']));

      const request = httpMock.expectOne(`${scopeUrl}/sections/order`);

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ orderedIds: ['b', 'a'] });

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });
  });

  describe('tabs', () => {
    const sectionUrl = `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${SECTION_ID}`;

    it('lists them for a section', async () => {
      const result = firstValueFrom(service.getTabs(SECTION_ID));

      httpMock.expectOne(`${sectionUrl}/tabs`).flush([{ id: TAB_ID }]);

      await expect(result).resolves.toEqual([{ id: TAB_ID }]);
    });

    it('creates one inside the section named by the path', async () => {
      const result = firstValueFrom(
        service.createTab(SECTION_ID, { name: 'Escorts' }),
      );

      httpMock
        .expectOne(request => request.url === `${sectionUrl}/tabs`)
        .flush({ id: TAB_ID });

      await expect(result).resolves.toMatchObject({ id: TAB_ID });
    });

    it('changes one', async () => {
      const result = firstValueFrom(
        service.updateTab(TAB_ID, { name: 'Cruisers' }),
      );

      httpMock
        .expectOne(`${API_URLS.CUSTOM_TRACKING_TABS}/${TAB_ID}`)
        .flush({ id: TAB_ID, name: 'Cruisers' });

      await expect(result).resolves.toMatchObject({ name: 'Cruisers' });
    });

    it('asks what a deletion would remove', async () => {
      const result = firstValueFrom(service.getTabDeletionImpact(TAB_ID));

      httpMock
        .expectOne(`${API_URLS.CUSTOM_TRACKING_TABS}/${TAB_ID}/deletion-impact`)
        .flush({ tabs: 0, fields: 7, values: 21 });

      await expect(result).resolves.toEqual({
        tabs: 0,
        fields: 7,
        values: 21,
      });
    });

    it('deletes one', async () => {
      const result = firstValueFrom(service.deleteTab(TAB_ID));

      httpMock
        .expectOne(`${API_URLS.CUSTOM_TRACKING_TABS}/${TAB_ID}`)
        .flush(null);

      await expect(result).resolves.toBeNull();
    });

    it('sends the whole order when reordering', async () => {
      const result = firstValueFrom(
        service.reorderTabs(SECTION_ID, ['b', 'a']),
      );

      const request = httpMock.expectOne(`${sectionUrl}/tabs/order`);

      expect(request.request.body).toEqual({ orderedIds: ['b', 'a'] });

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });
  });

  describe('fields', () => {
    const tabUrl = `${API_URLS.CUSTOM_TRACKING_TABS}/${TAB_ID}`;

    it('lists them for a tab', async () => {
      const result = firstValueFrom(service.getFields(TAB_ID));

      httpMock.expectOne(`${tabUrl}/fields`).flush([{ id: FIELD_ID }]);

      await expect(result).resolves.toEqual([{ id: FIELD_ID }]);
    });

    it('creates one with its type', async () => {
      const result = firstValueFrom(
        service.createField(TAB_ID, {
          fieldType: 'TEXT_SINGLE_LINE',
          name: 'Ship name',
          configuration: {},
        }),
      );

      const request = httpMock.expectOne(`${tabUrl}/fields`);

      expect(request.request.body).toMatchObject({
        fieldType: 'TEXT_SINGLE_LINE',
      });

      request.flush({ id: FIELD_ID });

      await expect(result).resolves.toMatchObject({ id: FIELD_ID });
    });

    // The type is fixed at creation, and the server refuses a request naming
    // one rather than ignoring it, so the interface must not send it.
    it('never sends a type when changing one', async () => {
      const result = firstValueFrom(
        service.updateField(FIELD_ID, { name: 'Registry' }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.CUSTOM_TRACKING_FIELDS}/${FIELD_ID}`,
      );

      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).not.toHaveProperty('fieldType');

      request.flush({ id: FIELD_ID, name: 'Registry' });

      await expect(result).resolves.toMatchObject({ name: 'Registry' });
    });

    // No definitions go with a field, so what matters is how many answers do.
    it('asks how many answers a deletion would remove', async () => {
      const result = firstValueFrom(service.getFieldDeletionImpact(FIELD_ID));

      httpMock
        .expectOne(
          `${API_URLS.CUSTOM_TRACKING_FIELDS}/${FIELD_ID}/deletion-impact`,
        )
        .flush({ tabs: 0, fields: 0, values: 19 });

      await expect(result).resolves.toEqual({
        tabs: 0,
        fields: 0,
        values: 19,
      });
    });

    it('deletes one', async () => {
      const result = firstValueFrom(service.deleteField(FIELD_ID));

      httpMock
        .expectOne(`${API_URLS.CUSTOM_TRACKING_FIELDS}/${FIELD_ID}`)
        .flush(null);

      await expect(result).resolves.toBeNull();
    });

    it('sends the whole order when reordering', async () => {
      const result = firstValueFrom(service.reorderFields(TAB_ID, ['b', 'a']));

      const request = httpMock.expectOne(`${tabUrl}/fields/order`);

      expect(request.request.body).toEqual({ orderedIds: ['b', 'a'] });

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });
  });

  describe('options', () => {
    const fieldUrl = `${API_URLS.CUSTOM_TRACKING_FIELDS}/${FIELD_ID}`;

    it('lists them for a field', async () => {
      const result = firstValueFrom(service.getOptions(FIELD_ID));

      httpMock.expectOne(`${fieldUrl}/options`).flush([{ id: OPTION_ID }]);

      await expect(result).resolves.toEqual([{ id: OPTION_ID }]);
    });

    it('adds one', async () => {
      const result = firstValueFrom(
        service.createOption(FIELD_ID, { label: 'Escort' }),
      );

      const request = httpMock.expectOne(`${fieldUrl}/options`);

      expect(request.request.body).toEqual({ label: 'Escort' });

      request.flush({ id: OPTION_ID });

      await expect(result).resolves.toMatchObject({ id: OPTION_ID });
    });

    it('changes one', async () => {
      const result = firstValueFrom(
        service.updateOption(OPTION_ID, { isDefault: true }),
      );

      httpMock
        .expectOne(`${API_URLS.CUSTOM_TRACKING_OPTIONS}/${OPTION_ID}`)
        .flush({ id: OPTION_ID, isDefault: true });

      await expect(result).resolves.toMatchObject({ isDefault: true });
    });

    it('withdraws one', async () => {
      const result = firstValueFrom(service.deleteOption(OPTION_ID));

      const request = httpMock.expectOne(
        `${API_URLS.CUSTOM_TRACKING_OPTIONS}/${OPTION_ID}`,
      );

      expect(request.request.method).toBe('DELETE');

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });

    it('sends the whole order when reordering', async () => {
      const result = firstValueFrom(
        service.reorderOptions(FIELD_ID, ['b', 'a']),
      );

      const request = httpMock.expectOne(`${fieldUrl}/options/order`);

      expect(request.request.body).toEqual({ orderedIds: ['b', 'a'] });

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });
  });

  describe('signing requests', () => {
    // The interceptor only replaces a token the API has already rejected. A
    // call that never carried one would be answered 401 and spend a refresh
    // recovering, so the token goes on before the request leaves.
    it('carries the access token on a call about the user', async () => {
      localStorage.setItem('access_token', 'a-token');

      const result = firstValueFrom(service.getPolicyStatus());
      const request = httpMock.expectOne(
        API_URLS.CUSTOM_TRACKING_AGREEMENT_STATUS,
      );

      expect(request.request.headers.get('Authorization')).toBe(
        'Bearer a-token',
      );

      request.flush({ currentVersion: '1.0' });

      await expect(result).resolves.toMatchObject({ currentVersion: '1.0' });
    });

    // Signed out, the request goes without one and is answered 401. Inventing
    // a different failure here would describe the same thing less accurately.
    it('sends nothing where there is no token', async () => {
      const result = firstValueFrom(service.getPolicyStatus());
      const request = httpMock.expectOne(
        API_URLS.CUSTOM_TRACKING_AGREEMENT_STATUS,
      );

      expect(request.request.headers.has('Authorization')).toBe(false);

      request.flush({ currentVersion: '1.0' });

      await expect(result).resolves.toMatchObject({ currentVersion: '1.0' });
    });

    // The configuration describes the feature rather than anybody's data, and
    // is served to anonymous callers.
    it('leaves the configuration unsigned', async () => {
      localStorage.setItem('access_token', 'a-token');

      const result = firstValueFrom(service.getConfiguration());
      const request = httpMock.expectOne(
        API_URLS.CUSTOM_TRACKING_CONFIGURATION,
      );

      expect(request.request.headers.has('Authorization')).toBe(false);

      request.flush({} as CustomTrackingConfiguration);

      await expect(result).resolves.toEqual({});
    });
  });

  describe('targets and records', () => {
    const scopeUrl = `${API_URLS.CUSTOM_TRACKING_SCOPES}/${CustomTrackingTargetScope.ACCOUNT}`;
    const recordUrl = `${scopeUrl}/targets/${TARGET_ID}/record`;

    it('lists the records a scope may be recorded against', async () => {
      const result = firstValueFrom(
        service.getTargets(CustomTrackingTargetScope.CHARACTER),
      );

      httpMock
        .expectOne(
          `${API_URLS.CUSTOM_TRACKING_SCOPES}/${CustomTrackingTargetScope.CHARACTER}/targets`,
        )
        .flush([{ id: TARGET_ID, label: 'Kolan' }]);

      await expect(result).resolves.toMatchObject([{ label: 'Kolan' }]);
    });

    // The definitions travel with the answers rather than being fetched
    // separately, so the editor cannot draw a form from one version of the
    // hierarchy and fill it from another.
    it('loads one record with its definitions', async () => {
      const result = firstValueFrom(
        service.getRecord(CustomTrackingTargetScope.ACCOUNT, TARGET_ID),
      );

      httpMock
        .expectOne(recordUrl)
        .flush({ target: { id: TARGET_ID }, sections: [], answers: [] });

      await expect(result).resolves.toMatchObject({ sections: [] });
    });

    it('saves every answer in one request', async () => {
      const answers = [{ fieldId: FIELD_ID, value: { text: 'Adama' } }];
      const result = firstValueFrom(
        service.saveRecord(
          CustomTrackingTargetScope.ACCOUNT,
          TARGET_ID,
          answers,
        ),
      );

      const request = httpMock.expectOne(recordUrl);

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ answers });

      request.flush({ target: { id: TARGET_ID }, sections: [], answers: [] });

      await expect(result).resolves.toMatchObject({ answers: [] });
    });
  });

  describe('pictures', () => {
    const imageUrl = `${API_URLS.CUSTOM_TRACKING_FIELDS}/${FIELD_ID}/scopes/${CustomTrackingTargetScope.ACCOUNT}/targets/${TARGET_ID}/image`;

    // The bytes travel on their own rather than in the record payload:
    // accepting an image identifier in a value would let a caller point a
    // field at any picture in the account.
    it('sends the picture and its description together', async () => {
      const picture = new Blob(['bytes'], { type: 'image/png' });
      const result = firstValueFrom(
        service.uploadImage(
          FIELD_ID,
          CustomTrackingTargetScope.ACCOUNT,
          TARGET_ID,
          picture,
          'A ship',
          'square.png',
        ),
      );

      const request = httpMock.expectOne(imageUrl);
      const body = request.request.body as FormData;

      expect(request.request.method).toBe('POST');
      expect(body.get('altText')).toBe('A ship');
      expect(body.get('image')).toBeInstanceOf(Blob);

      request.flush({ imageId: 'image-1', altText: 'A ship' });

      await expect(result).resolves.toMatchObject({ imageId: 'image-1' });
    });

    it('removes the picture', async () => {
      const result = firstValueFrom(
        service.removeImage(
          FIELD_ID,
          CustomTrackingTargetScope.ACCOUNT,
          TARGET_ID,
        ),
      );

      const request = httpMock.expectOne(imageUrl);

      expect(request.request.method).toBe('DELETE');

      request.flush(null);

      await expect(result).resolves.toBeNull();
    });
  });
});
