import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';

import {
  CustomTrackingAgreement,
  CustomTrackingAnswerSubmission,
  CustomTrackingConfiguration,
  CustomTrackingDeletionImpact,
  CustomTrackingField,
  CustomTrackingImageAnswer,
  CustomTrackingOption,
  CustomTrackingPolicyStatus,
  CustomTrackingRecord,
  CustomTrackingSection,
  CustomTrackingSectionTree,
  CustomTrackingTab,
  CustomTrackingTarget,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { CustomTrackingConfigurationService } from 'src/app/shared/custom-tracking/custom-tracking-configuration.service';

/** What a caller may set when creating or changing a section or tab. */
export interface CustomTrackingGroupInput {
  name?: string;
  description?: string | null;
  publiclyVisible?: boolean;
}

/** What a caller may set when creating a field. */
export interface CustomTrackingFieldInput extends CustomTrackingGroupInput {
  fieldType?: string;
  required?: boolean;
  ownerEmptyMode?: string;
  publicEmptyMode?: string;
  emptyPlaceholder?: string | null;
  configuration?: Record<string, unknown>;
}

/** What a caller may set when creating or changing an option. */
export interface CustomTrackingOptionInput {
  label?: string;
  isDefault?: boolean;
}

/**
 * The definition hierarchy, as Settings manages it.
 *
 * Every ceiling, every field type and every palette colour comes from the
 * configuration endpoint rather than from constants compiled in here. The
 * server is authoritative about all three, and a second copy in the frontend
 * would be a second statement that could disagree — which shows up to a user
 * as a form that accepts what the server then refuses.
 *
 * The configuration is fetched once and shared. It describes the shape of the
 * feature rather than anybody's data, so re-fetching it per component would be
 * a request per panel for an answer that cannot have changed.
 *
 * Every other call carries the access token explicitly, as the rest of the
 * site's services do. The interceptor only replaces a token the API has
 * already rejected; it does not put one on a request that never had one, so a
 * call relying on it would answer 401 first and spend a refresh recovering.
 */
@Injectable({ providedIn: 'root' })
export class CustomTrackingService {
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(AuthService);
  private readonly _configuration = inject(CustomTrackingConfigurationService);

  /**
   * The access token, as request options.
   *
   * Empty when there is none. A request without it is answered 401, which is
   * what a signed-out caller should be told; inventing a different failure
   * here would only describe the same thing less accurately.
   *
   * @returns Options carrying the authorization header, or none.
   */
  private get _authOptions(): { headers?: HttpHeaders } {
    return this._auth.getHttpOptionsWithAccessToken() ?? {};
  }

  /**
   * Describes the feature: capabilities, field types, palette and limits.
   *
   * Delegated to the shared service, which is where the one cached copy lives.
   * The detail pages need the same answer and cannot reach into Settings for
   * it, and two fetches of one unchanging document is one too many.
   *
   * @returns An observable of the configuration, shared between callers.
   */
  getConfiguration(): Observable<CustomTrackingConfiguration> {
    return this._configuration.getConfiguration();
  }

  /**
   * Reads the content agreement.
   *
   * @returns An observable of the current wording, version and dates.
   */
  getAgreement(): Observable<CustomTrackingAgreement> {
    return this._http.get<CustomTrackingAgreement>(
      API_URLS.CUSTOM_TRACKING_AGREEMENT,
      this._authOptions,
    );
  }

  /**
   * Reads where the user stands with the agreement.
   *
   * @returns An observable of their acceptance status.
   */
  getPolicyStatus(): Observable<CustomTrackingPolicyStatus> {
    return this._http.get<CustomTrackingPolicyStatus>(
      API_URLS.CUSTOM_TRACKING_AGREEMENT_STATUS,
      this._authOptions,
    );
  }

  /**
   * Records acceptance of the agreement.
   *
   * The version displayed travels with it, so a page left open across a
   * wording change cannot record agreement to terms the user never saw.
   *
   * @param acceptedVersion - The version the interface displayed.
   * @returns An observable of their acceptance status afterwards.
   */
  acceptPolicy(
    acceptedVersion: string,
  ): Observable<CustomTrackingPolicyStatus> {
    return this._http.post<CustomTrackingPolicyStatus>(
      API_URLS.CUSTOM_TRACKING_AGREEMENT_ACCEPTANCE,
      { acceptedVersion },
      this._authOptions,
    );
  }

  /**
   * Lists the user's sections for one scope.
   *
   * @param scope - Which of their two hierarchies to list.
   * @returns An observable of the sections, in order.
   */
  getSections(
    scope: CustomTrackingTargetScope,
  ): Observable<CustomTrackingSection[]> {
    return this._http.get<CustomTrackingSection[]>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/sections`,
      this._authOptions,
    );
  }

  /**
   * Reads a whole scope in one request, nested.
   *
   * The builder searches and filters across the whole hierarchy, so it needs
   * all of it. Fetching each branch as it is opened would leave a search able
   * to see only what somebody had already looked at.
   *
   * @param scope - Which of their two hierarchies to read.
   * @returns An observable of the sections, each with its tabs and fields.
   */
  getDefinitions(
    scope: CustomTrackingTargetScope,
  ): Observable<CustomTrackingSectionTree[]> {
    return this._http.get<CustomTrackingSectionTree[]>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/definitions`,
      this._authOptions,
    );
  }

  /**
   * Creates a section.
   *
   * @param scope - Which hierarchy to create it in.
   * @param input - What the user asked for.
   * @returns An observable of the new section.
   */
  createSection(
    scope: CustomTrackingTargetScope,
    input: CustomTrackingGroupInput,
  ): Observable<CustomTrackingSection> {
    return this._http.post<CustomTrackingSection>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/sections`,
      input,
      this._authOptions,
    );
  }

  /**
   * Changes a section.
   *
   * @param sectionId - The section to change.
   * @param input - What to change.
   * @returns An observable of the section as it now stands.
   */
  updateSection(
    sectionId: string,
    input: CustomTrackingGroupInput,
  ): Observable<CustomTrackingSection> {
    return this._http.patch<CustomTrackingSection>(
      `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${sectionId}`,
      input,
      this._authOptions,
    );
  }

  /**
   * Reports what deleting a section would take with it.
   *
   * Read before the confirmation is shown, because "delete this section" and
   * "delete this section, four tabs and nineteen fields" are different
   * decisions and only one of them is the one being made.
   *
   * @param sectionId - The section being considered.
   * @returns An observable of the counts affected.
   */
  getSectionDeletionImpact(
    sectionId: string,
  ): Observable<CustomTrackingDeletionImpact> {
    return this._http.get<CustomTrackingDeletionImpact>(
      `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${sectionId}/deletion-impact`,
      this._authOptions,
    );
  }

  /**
   * Deletes a section and everything beneath it.
   *
   * @param sectionId - The section to delete.
   * @returns An observable that completes when it is done.
   */
  deleteSection(sectionId: string): Observable<void> {
    return this._http.delete<void>(
      `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${sectionId}`,
      this._authOptions,
    );
  }

  /**
   * Puts the user's sections into a new order.
   *
   * The whole ordered list travels, not one item and a position: a complete
   * list either describes the collection exactly or does not, and the server
   * says which.
   *
   * @param scope - Which hierarchy is being ordered.
   * @param orderedIds - Every live section in it, in order.
   * @returns An observable that completes when it is done.
   */
  reorderSections(
    scope: CustomTrackingTargetScope,
    orderedIds: string[],
  ): Observable<void> {
    return this._http.put<void>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/sections/order`,
      { orderedIds },
      this._authOptions,
    );
  }

  /**
   * Lists a section's tabs.
   *
   * @param sectionId - The section.
   * @returns An observable of its tabs, in order.
   */
  getTabs(sectionId: string): Observable<CustomTrackingTab[]> {
    return this._http.get<CustomTrackingTab[]>(
      `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${sectionId}/tabs`,
      this._authOptions,
    );
  }

  /**
   * Creates a tab in a section.
   *
   * @param sectionId - The section to create it in.
   * @param input - What the user asked for.
   * @returns An observable of the new tab.
   */
  createTab(
    sectionId: string,
    input: CustomTrackingGroupInput,
  ): Observable<CustomTrackingTab> {
    return this._http.post<CustomTrackingTab>(
      `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${sectionId}/tabs`,
      input,
      this._authOptions,
    );
  }

  /**
   * Changes a tab.
   *
   * @param tabId - The tab to change.
   * @param input - What to change.
   * @returns An observable of the tab as it now stands.
   */
  updateTab(
    tabId: string,
    input: CustomTrackingGroupInput,
  ): Observable<CustomTrackingTab> {
    return this._http.patch<CustomTrackingTab>(
      `${API_URLS.CUSTOM_TRACKING_TABS}/${tabId}`,
      input,
      this._authOptions,
    );
  }

  /**
   * Reports what deleting a tab would take with it.
   *
   * @param tabId - The tab being considered.
   * @returns An observable of the counts affected.
   */
  getTabDeletionImpact(
    tabId: string,
  ): Observable<CustomTrackingDeletionImpact> {
    return this._http.get<CustomTrackingDeletionImpact>(
      `${API_URLS.CUSTOM_TRACKING_TABS}/${tabId}/deletion-impact`,
      this._authOptions,
    );
  }

  /**
   * Deletes a tab and the fields beneath it.
   *
   * @param tabId - The tab to delete.
   * @returns An observable that completes when it is done.
   */
  deleteTab(tabId: string): Observable<void> {
    return this._http.delete<void>(
      `${API_URLS.CUSTOM_TRACKING_TABS}/${tabId}`,
      this._authOptions,
    );
  }

  /**
   * Puts a section's tabs into a new order.
   *
   * @param sectionId - The section being ordered.
   * @param orderedIds - Every live tab in it, in order.
   * @returns An observable that completes when it is done.
   */
  reorderTabs(sectionId: string, orderedIds: string[]): Observable<void> {
    return this._http.put<void>(
      `${API_URLS.CUSTOM_TRACKING_SECTIONS}/${sectionId}/tabs/order`,
      { orderedIds },
      this._authOptions,
    );
  }

  /**
   * Lists a tab's fields, each with the options it offers.
   *
   * @param tabId - The tab.
   * @returns An observable of its fields, in order.
   */
  getFields(tabId: string): Observable<CustomTrackingField[]> {
    return this._http.get<CustomTrackingField[]>(
      `${API_URLS.CUSTOM_TRACKING_TABS}/${tabId}/fields`,
      this._authOptions,
    );
  }

  /**
   * Creates a field in a tab.
   *
   * @param tabId - The tab to create it in.
   * @param input - What the user asked for, including its type.
   * @returns An observable of the new field.
   */
  createField(
    tabId: string,
    input: CustomTrackingFieldInput,
  ): Observable<CustomTrackingField> {
    return this._http.post<CustomTrackingField>(
      `${API_URLS.CUSTOM_TRACKING_TABS}/${tabId}/fields`,
      input,
      this._authOptions,
    );
  }

  /**
   * Changes a field.
   *
   * The type is never sent. It is fixed at creation, and the server refuses a
   * request naming one rather than ignoring it.
   *
   * @param fieldId - The field to change.
   * @param input - What to change.
   * @returns An observable of the field as it now stands.
   */
  updateField(
    fieldId: string,
    input: Omit<CustomTrackingFieldInput, 'fieldType'>,
  ): Observable<CustomTrackingField> {
    return this._http.patch<CustomTrackingField>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}`,
      input,
      this._authOptions,
    );
  }

  /**
   * Reports what deleting a field would take with it.
   *
   * No definitions go with a field, so what is reported is how many answers
   * are recorded against it — which is the number that matters, because those
   * are what cannot be typed again from memory.
   *
   * @param fieldId - The field being considered.
   * @returns An observable of the counts affected.
   */
  getFieldDeletionImpact(
    fieldId: string,
  ): Observable<CustomTrackingDeletionImpact> {
    return this._http.get<CustomTrackingDeletionImpact>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}/deletion-impact`,
      this._authOptions,
    );
  }

  /**
   * Deletes a field and its options.
   *
   * @param fieldId - The field to delete.
   * @returns An observable that completes when it is done.
   */
  deleteField(fieldId: string): Observable<void> {
    return this._http.delete<void>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}`,
      this._authOptions,
    );
  }

  /**
   * Puts a tab's fields into a new order.
   *
   * @param tabId - The tab being ordered.
   * @param orderedIds - Every live field in it, in order.
   * @returns An observable that completes when it is done.
   */
  reorderFields(tabId: string, orderedIds: string[]): Observable<void> {
    return this._http.put<void>(
      `${API_URLS.CUSTOM_TRACKING_TABS}/${tabId}/fields/order`,
      { orderedIds },
      this._authOptions,
    );
  }

  /**
   * Lists the options a field offers, withdrawn ones included.
   *
   * @param fieldId - The field.
   * @returns An observable of its options, in order.
   */
  getOptions(fieldId: string): Observable<CustomTrackingOption[]> {
    return this._http.get<CustomTrackingOption[]>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}/options`,
      this._authOptions,
    );
  }

  /**
   * Adds an option to a field.
   *
   * @param fieldId - The field to add it to.
   * @param input - What the user asked for.
   * @returns An observable of the new option.
   */
  createOption(
    fieldId: string,
    input: CustomTrackingOptionInput,
  ): Observable<CustomTrackingOption> {
    return this._http.post<CustomTrackingOption>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}/options`,
      input,
      this._authOptions,
    );
  }

  /**
   * Changes an option.
   *
   * @param optionId - The option to change.
   * @param input - What to change.
   * @returns An observable of the option as it now stands.
   */
  updateOption(
    optionId: string,
    input: CustomTrackingOptionInput,
  ): Observable<CustomTrackingOption> {
    return this._http.patch<CustomTrackingOption>(
      `${API_URLS.CUSTOM_TRACKING_OPTIONS}/${optionId}`,
      input,
      this._authOptions,
    );
  }

  /**
   * Withdraws an option.
   *
   * Always soft: a value that already chose it keeps displaying the wording it
   * had, and only new selections are refused.
   *
   * @param optionId - The option to withdraw.
   * @returns An observable that completes when it is done.
   */
  deleteOption(optionId: string): Observable<void> {
    return this._http.delete<void>(
      `${API_URLS.CUSTOM_TRACKING_OPTIONS}/${optionId}`,
      this._authOptions,
    );
  }

  /**
   * Puts a field's options into a new order.
   *
   * @param fieldId - The field being ordered.
   * @param orderedIds - Every live option on it, in order.
   * @returns An observable that completes when it is done.
   */
  reorderOptions(fieldId: string, orderedIds: string[]): Observable<void> {
    return this._http.put<void>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}/options/order`,
      { orderedIds },
      this._authOptions,
    );
  }

  /**
   * Lists the user's own accounts or characters, to record against.
   *
   * @param scope - Whether accounts or characters are wanted.
   * @returns An observable of their records.
   */
  getTargets(
    scope: CustomTrackingTargetScope,
  ): Observable<CustomTrackingTarget[]> {
    return this._http.get<CustomTrackingTarget[]>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/targets`,
      this._authOptions,
    );
  }

  /**
   * Loads one account or character: its definitions and what is recorded.
   *
   * The definitions travel with the answers rather than being fetched
   * separately, so the editor cannot draw a form from one version of the
   * hierarchy and fill it from another.
   *
   * @param scope - Whether an account or a character is wanted.
   * @param targetId - The record wanted.
   * @returns An observable of the record.
   */
  getRecord(
    scope: CustomTrackingTargetScope,
    targetId: string,
  ): Observable<CustomTrackingRecord> {
    return this._http.get<CustomTrackingRecord>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/targets/${targetId}/record`,
      this._authOptions,
    );
  }

  /**
   * Saves one record, whole.
   *
   * Whole rather than field by field, because the required-field rule is a
   * statement about the record: saving a field at a time would let one come to
   * rest half-written, which is the state that rule exists to prevent. The
   * server writes it in one transaction, so a refusal anywhere leaves
   * everything exactly as it was.
   *
   * @param scope - Whether an account or a character is being saved.
   * @param targetId - The record being saved.
   * @param answers - Every answer being recorded.
   * @returns An observable of the record as it now stands.
   */
  saveRecord(
    scope: CustomTrackingTargetScope,
    targetId: string,
    answers: CustomTrackingAnswerSubmission[],
  ): Observable<CustomTrackingRecord> {
    return this._http.put<CustomTrackingRecord>(
      `${API_URLS.CUSTOM_TRACKING_SCOPES}/${scope}/targets/${targetId}/record`,
      { answers },
      this._authOptions,
    );
  }

  /**
   * Stores the picture answering one image field, replacing any already there.
   *
   * A picture travels on its own rather than in the record payload. It arrives
   * as bytes and is checked as bytes, and accepting an image identifier in a
   * value would let a caller point a field at any picture in the account.
   *
   * @param fieldId - The image field being answered.
   * @param scope - Whether an account or a character is described.
   * @param targetId - The record described.
   * @param image - The cropped picture.
   * @param altText - What the picture shows.
   * @param fileName - What to call the part carrying the picture.
   * @returns An observable of the stored picture.
   */
  uploadImage(
    fieldId: string,
    scope: CustomTrackingTargetScope,
    targetId: string,
    image: Blob,
    altText: string,
    fileName: string,
  ): Observable<CustomTrackingImageAnswer> {
    const body = new FormData();

    body.append('image', image, fileName);
    body.append('altText', altText);

    return this._http.post<CustomTrackingImageAnswer>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}/scopes/${scope}/targets/${targetId}/image`,
      body,
      this._authOptions,
    );
  }

  /**
   * Removes the picture answering one image field.
   *
   * @param fieldId - The image field.
   * @param scope - Whether an account or a character is described.
   * @param targetId - The record described.
   * @returns An observable that completes when it is done.
   */
  removeImage(
    fieldId: string,
    scope: CustomTrackingTargetScope,
    targetId: string,
  ): Observable<void> {
    return this._http.delete<void>(
      `${API_URLS.CUSTOM_TRACKING_FIELDS}/${fieldId}/scopes/${scope}/targets/${targetId}/image`,
      this._authOptions,
    );
  }
}
