import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ParamMap, Router, RouterLink } from '@angular/router';

import {
  catchError,
  defer,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { GeneralFaction } from 'src/app/dashboard/models/character.model';
import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { FleetExactNameComponent } from 'src/app/fleet/components/fleet-exact-name/fleet-exact-name.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import {
  COMMUNITY_AUDIENCE_HINT,
  FLEET_AUDIENCE_CHOICES,
  FLEET_RECRUITMENT_CHOICES,
} from 'src/app/fleet/constants/fleet-scope.constants';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  COMMUNITY_NAME_TOO_LONG,
  EXACT_GAME_NAME_TOO_LONG,
  inputCeilingFor,
  maxCodepointsValidator,
} from 'src/app/fleet/fleet-name-length';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import { SCOPE_SETTINGS_MANAGE_CAPABILITY } from 'src/app/fleet/governance/governance.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  COMMUNITY_DESCRIPTION_MAX_LENGTH,
  COMMUNITY_NAME_MAX_LENGTH,
  COMMUNITY_SLUG_MAX_LENGTH,
} from 'src/app/fleet/register/community-register/community-register.component';
import {
  FLEET_NAME_MAX_LENGTH,
  FLEET_SLUG_MAX_LENGTH,
} from 'src/app/fleet/register/fleet-register/fleet-register.component';
import { FleetScopeRole } from 'src/app/models/fleet-governance.models';
import {
  FleetCommunity,
  FleetScopeStatus,
  StoFleet,
  UpdateFleetCommunity,
  UpdateStoFleet,
} from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { availableTimezones } from 'src/app/shared/utils/timezone.utils';

import {
  communityChangesOf,
  communityValuesOf,
  fleetChangesOf,
  fleetValuesOf,
  hasChanges,
  ScopeSettingsValues,
} from './scope-settings.changes';

/** What to say to anybody but the Owner. */
export const SCOPE_SETTINGS_NOT_PERMITTED =
  'Changing its settings is for its Owner.';

/** What to say once the settings are saved. */
export const SCOPE_SETTINGS_SAVED = 'Saved.';

/** What to say once they are saved at a new web address. */
export const SCOPE_SETTINGS_MOVED =
  'Saved. Its web address has changed, and links to the old one still lead ' +
  'here.';

/** What to say when nothing was changed. */
export const SCOPE_SETTINGS_UNCHANGED = 'Nothing has changed to save.';

/** What to say when a save failed for a reason the server did not give. */
export const SCOPE_SETTINGS_SAVE_FAILED =
  'The settings could not be saved. Please try again.';

/** What to say when the web address was taken while the Owner was typing. */
export const SCOPE_SETTINGS_SLUG_TAKEN =
  'Somebody took that web address a moment before you did. Change it, or ' +
  'leave it blank and one will be made from the name.';

/** What to say when a Fleet's settings cannot change for its Community. */
export const FLEET_SETTINGS_LOCKED =
  'Its settings cannot be changed while the Community holding it is closed ' +
  'or suspended.';

/** What to say when a Community's settings cannot change just now. */
export const COMMUNITY_SETTINGS_LOCKED =
  'Its settings cannot be changed just now.';

/**
 * The part of the server's refusal that says the record changed meanwhile.
 *
 * A stale revision and a web address taken in a race are both a 409, so the
 * sentence is what tells them apart, as on registration.
 */
const STALE_REFUSAL_FRAGMENT = 'changed since';

/** The part of the server's refusal that says the web address was taken. */
const SLUG_REFUSAL_FRAGMENT = 'web address';

/** A name must have something in it besides spaces. */
const NOT_ONLY_SPACES = /\S/;

/**
 * Says the record changed since the Owner opened the page.
 *
 * @param noun - Community or Fleet.
 * @returns The sentence.
 */
export function settingsStaleMessage(noun: string): string {
  return (
    `This ${noun} has changed since you opened this page. Reload it to see ` +
    'how it stands now, then make your change again.'
  );
}

/** What the Community and Fleet pages share. */
interface ScopeSettingsCommon {
  /** Community or Fleet, for the page's sentences. */
  readonly noun: 'Community' | 'Fleet';
  /** The slug as read, to tell whether a save moved it. */
  readonly slug: string;
  /** The revision as read, sent back so a stale save is refused. */
  readonly revision: number;
  /** Why its settings cannot be changed, or null when they can. */
  readonly lock: string | null;
  /** The longest name the server keeps, in codepoints. */
  readonly nameMaxCodepoints: number;
  /** The name field's `maxlength`: a ceiling, since the rule is codepoints. */
  readonly nameMaxLength: number;
  /** Shown when the name is over the server's budget. */
  readonly nameTooLong: string;
  /** The longest web address the server keeps. */
  readonly slugMaxLength: number;
}

/** A Community's settings page. */
export interface CommunitySettingsData extends ScopeSettingsCommon {
  readonly kind: 'COMMUNITY';
  readonly community: FleetCommunity;
  /** The zones to choose from, its own included. */
  readonly timezones: readonly string[];
}

/** A Fleet's settings page. */
export interface FleetSettingsData extends ScopeSettingsCommon {
  readonly kind: 'FLEET';
  readonly fleet: StoFleet;
  readonly communityId: string;
  /** The holding Community's current slug. */
  readonly communitySlug: string;
  /** Where how it recruits is changed. */
  readonly recruitmentLink: string[];
}

/** What the settings page shows. */
export type ScopeSettingsData = CommunitySettingsData | FleetSettingsData;

/** Where a save left the scope. */
interface ScopeSettingsSaved {
  /** Its slug now. */
  readonly slug: string;
  /** This page at its current address. */
  readonly settingsLink: string[];
  /** Its Former names, when a Fleet was renamed; otherwise null. */
  readonly formerNamesLink: string[] | null;
}

/** The note shown once a Fleet is renamed. */
export interface FleetRenamedNote {
  readonly oldName: string;
  readonly formerNamesLink: string[];
}

/**
 * Where a Community's or Fleet's Owner changes its own settings: its name,
 * web address and who can see it, and for a Community its description, how
 * people join and the timezone its dates are shown in.
 *
 * A Manage page, and the Owner's alone: `scope.settings.manage` is not
 * delegable. The fields are registration's, word for word. Only what changed
 * is sent, with the revision read, so a save made after somebody else's is
 * refused rather than overwriting it.
 *
 * Renaming makes a new web address from the new name. The old one is kept by
 * the server as a redirect, so a link posted anywhere still arrives, and this
 * page follows the scope to its new address. A Fleet's name is the game's,
 * never trimmed, and roster exports taken before a rename carry the old one —
 * so the page points at Former names afterwards, and records nothing itself.
 *
 * A Fleet's recruitment state is not here: its recruitment settings keep a
 * version of every change (FC-021), and the page links there. Nor is its
 * platform, which is half of its address and cannot change.
 */
@Component({
  selector: 'app-scope-settings',
  templateUrl: './scope-settings.component.html',
  styleUrls: ['./scope-settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    FleetExactNameComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    LoadingBarComponent,
  ],
})
export class ScopeSettingsComponent extends GovernancePageDirective<ScopeSettingsData> {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _registration = inject(FleetRegistrationService);
  private readonly _lookup = inject(CharacterLookupService);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = SCOPE_SETTINGS_NOT_PERMITTED;
  readonly recruitmentChoices = Object.entries(FLEET_RECRUITMENT_CHOICES);
  readonly audienceChoices = Object.entries(FLEET_AUDIENCE_CHOICES);

  /** Who each audience means when it is a Community's own. */
  readonly audienceHint = COMMUNITY_AUDIENCE_HINT;
  readonly descriptionMaxLength = COMMUNITY_DESCRIPTION_MAX_LENGTH;

  /**
   * The allegiances a Fleet can be recorded as, drawn only on a Fleet's page.
   *
   * A list that cannot be read offers "Not stated" alone. The field keeps the
   * Fleet's own allegiance meanwhile, so nothing changes unless the Owner
   * chooses.
   */
  readonly allegiances$: Observable<GeneralFaction[]> = defer(() =>
    this._lookup.getGeneralFactions(),
  ).pipe(catchError(() => of<GeneralFaction[]>([])));

  /** The form, rebuilt from the record whenever it is read. */
  readonly form = signal<ScopeSettingsForm | null>(null);

  /** Whether a save is under way. */
  readonly busy = signal(false);

  /** What the last save came to, if it was made or not needed. */
  readonly notice = signal<string | null>(null);

  /** What the last save came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /** Whether the last refusal was because the record changed meanwhile. */
  readonly stale = signal(false);

  /** Set once a Fleet is renamed, pointing at its Former names. */
  readonly renamed = signal<FleetRenamedNote | null>(null);

  /**
   * Saves what changed, when anything did.
   *
   * @param data - The page, with the record as read.
   * @param form - The form.
   */
  onSubmit(data: ScopeSettingsData, form: ScopeSettingsForm): void {
    if (form.invalid) {
      form.markAllAsTouched();

      return;
    }

    // Pressing Enter in a field submits the form whatever the button says.
    if (this.busy()) {
      return;
    }

    const values: ScopeSettingsValues = form.getRawValue();
    const changes =
      data.kind === 'COMMUNITY'
        ? communityChangesOf(data.community, values)
        : fleetChangesOf(data.fleet, values);

    this.clearMessages();

    if (!hasChanges(changes)) {
      this.notice.set(SCOPE_SETTINGS_UNCHANGED);

      return;
    }

    this.busy.set(true);
    this.save(data, changes)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: saved => this.onSaved(data, saved),
        error: (error: unknown) => this.onRefused(data, error),
      });
  }

  /** Reads the record again after a refusal, dropping what was typed. */
  onReload(): void {
    this.clearMessages();
    this.reload();
  }

  /**
   * Opens to the Owner of a Community or Fleet, and to whoever the server
   * says holds its settings.
   *
   * The Owner is let in without the capability, which a closed or suspended
   * scope withdraws, so that they are told why nothing can change rather
   * than that the page is not theirs.
   *
   * @param scope - The scope.
   * @returns True when they may.
   */
  protected override mayOpen(scope: GovernanceScopeVm): boolean {
    return (
      !scope.isArmada &&
      (scope.roles.includes(FleetScopeRole.OWNER) ||
        scope.capabilities.includes(SCOPE_SETTINGS_MANAGE_CAPABILITY))
    );
  }

  /**
   * Reads the record as it stands, and starts the form from it.
   *
   * Read again rather than taken from the page's own resolution, which keeps
   * only who the reader is: the form needs every setting, the revision, and
   * the current segments of the address to follow a rename to.
   *
   * @param scope - The scope.
   * @returns The page.
   */
  protected load(scope: GovernanceScopeVm): Observable<ScopeSettingsData> {
    return this._route.paramMap.pipe(
      take(1),
      map(addressOf),
      switchMap(address =>
        scope.isCommunity
          ? this.readCommunity(address.communitySlug)
          : this.readFleet(scope.target.communityId, address),
      ),
      tap(data => this.form.set(settingsFormOf(this._formBuilder, data))),
    );
  }

  /**
   * Reads a Community's settings.
   *
   * @param communitySlug - Its address.
   * @returns The page.
   */
  private readCommunity(
    communitySlug: string,
  ): Observable<CommunitySettingsData> {
    return this._scopeService.resolveCommunity(communitySlug).pipe(
      map(({ community, viewer }): CommunitySettingsData => {
        const timezones = availableTimezones();

        return {
          kind: 'COMMUNITY',
          noun: 'Community',
          community,
          slug: community.slug,
          revision: community.revision,
          lock: lockOf(
            'Community',
            community.status,
            viewer.capabilities,
            COMMUNITY_SETTINGS_LOCKED,
          ),
          nameMaxCodepoints: COMMUNITY_NAME_MAX_LENGTH,
          nameMaxLength: inputCeilingFor(COMMUNITY_NAME_MAX_LENGTH),
          nameTooLong: COMMUNITY_NAME_TOO_LONG,
          slugMaxLength: COMMUNITY_SLUG_MAX_LENGTH,
          // Its own zone is offered even when this browser does not list it,
          // so opening the page cannot quietly change it.
          timezones: timezones.includes(community.preferredTimezone)
            ? timezones
            : [community.preferredTimezone, ...timezones],
        };
      }),
    );
  }

  /**
   * Reads a Fleet's settings.
   *
   * @param communityId - The Community holding it.
   * @param address - Its address.
   * @returns The page.
   */
  private readFleet(
    communityId: string,
    address: ScopeAddress,
  ): Observable<FleetSettingsData> {
    return this._scopeService
      .resolveFleet(
        address.communitySlug,
        address.platformSegment,
        address.slug,
      )
      .pipe(
        map((resolved): FleetSettingsData => {
          const { fleet } = resolved;

          return {
            kind: 'FLEET',
            noun: 'Fleet',
            fleet,
            communityId,
            communitySlug: resolved.communitySlug,
            slug: fleet.slug,
            revision: fleet.revision,
            lock: lockOf(
              'Fleet',
              fleet.status,
              resolved.viewer.capabilities,
              FLEET_SETTINGS_LOCKED,
            ),
            nameMaxCodepoints: FLEET_NAME_MAX_LENGTH,
            nameMaxLength: inputCeilingFor(FLEET_NAME_MAX_LENGTH),
            nameTooLong: EXACT_GAME_NAME_TOO_LONG,
            slugMaxLength: FLEET_SLUG_MAX_LENGTH,
            recruitmentLink: FLEET_LINKS.fleetRecruitmentSettings(
              resolved.communitySlug,
              resolved.platformSegment,
              fleet.slug,
            ),
          };
        }),
      );
  }

  /**
   * Sends the changes with the revision read.
   *
   * @param data - The page.
   * @param changes - What changed.
   * @returns Where the save left the scope.
   */
  private save(
    data: ScopeSettingsData,
    changes: UpdateFleetCommunity | UpdateStoFleet,
  ): Observable<ScopeSettingsSaved> {
    if (data.kind === 'COMMUNITY') {
      return this._registration
        .updateCommunity(data.community.id, {
          ...(changes as UpdateFleetCommunity),
          revision: data.revision,
        })
        .pipe(
          map(saved => ({
            slug: saved.slug,
            settingsLink: FLEET_LINKS.communitySettings(saved.slug),
            formerNamesLink: null,
          })),
        );
    }

    const renamed = 'exactGameName' in changes;

    return this._registration
      .updateFleet(data.communityId, data.fleet.id, {
        ...(changes as UpdateStoFleet),
        revision: data.revision,
      })
      .pipe(
        map(saved => ({
          slug: saved.slug,
          settingsLink: FLEET_LINKS.fleetSettings(
            data.communitySlug,
            saved.platformSegment,
            saved.slug,
          ),
          formerNamesLink: renamed
            ? FLEET_LINKS.fleetFormerNames(
                data.communitySlug,
                saved.platformSegment,
                saved.slug,
              )
            : null,
        })),
      );
  }

  /**
   * Says it is saved, and follows the scope to its new address if it moved.
   *
   * Following it is navigation to this same page, which Angular keeps: what
   * the page has just said survives the move.
   *
   * @param data - The page as it was.
   * @param saved - Where the save left the scope.
   */
  private onSaved(data: ScopeSettingsData, saved: ScopeSettingsSaved): void {
    const moved = saved.slug !== data.slug;

    this.busy.set(false);
    this.notice.set(moved ? SCOPE_SETTINGS_MOVED : SCOPE_SETTINGS_SAVED);

    if (data.kind === 'FLEET' && saved.formerNamesLink !== null) {
      this.renamed.set({
        oldName: data.fleet.exactGameName,
        formerNamesLink: saved.formerNamesLink,
      });
    }

    if (moved) {
      void this._router.navigate(saved.settingsLink);

      return;
    }

    this.reload();
  }

  /**
   * Says why a save was refused.
   *
   * @param data - The page.
   * @param error - What came back.
   */
  private onRefused(data: ScopeSettingsData, error: unknown): void {
    this.busy.set(false);

    const conflict = conflictOf(error);

    if (conflict?.includes(STALE_REFUSAL_FRAGMENT)) {
      this.stale.set(true);
      this.error.set(settingsStaleMessage(data.noun));

      return;
    }

    this.error.set(
      conflict?.includes(SLUG_REFUSAL_FRAGMENT)
        ? SCOPE_SETTINGS_SLUG_TAKEN
        : recruitmentRefusalOf(error, SCOPE_SETTINGS_SAVE_FAILED),
    );
  }

  /** Clears what the last save said. */
  private clearMessages(): void {
    this.notice.set(null);
    this.error.set(null);
    this.stale.set(false);
    this.renamed.set(null);
  }
}

/**
 * Builds the form from the record as read.
 *
 * Registration's rules, with one more: a name of nothing but spaces is
 * refused here rather than by the server. A name's length is counted in
 * codepoints, as the server counts it — a Community's trimmed, since it is
 * sent trimmed, and a Fleet's whole, since its edge spaces are stored.
 *
 * @param formBuilder - Angular's form builder.
 * @param data - The page.
 * @returns The form.
 */
function settingsFormOf(formBuilder: FormBuilder, data: ScopeSettingsData) {
  const values =
    data.kind === 'COMMUNITY'
      ? communityValuesOf(data.community)
      : fleetValuesOf(data.fleet);

  return formBuilder.nonNullable.group({
    // A Fleet's name is not trimmed on the way in or out: what the game shows
    // is what gets stored.
    name: [
      values.name,
      [
        Validators.required,
        Validators.pattern(NOT_ONLY_SPACES),
        maxCodepointsValidator(
          data.nameMaxCodepoints,
          data.kind === 'COMMUNITY',
        ),
      ],
    ],
    slug: [values.slug, [Validators.maxLength(data.slugMaxLength)]],
    description: [
      values.description,
      [Validators.maxLength(COMMUNITY_DESCRIPTION_MAX_LENGTH)],
    ],
    recruitmentState: [values.recruitmentState],
    visibility: [values.visibility],
    preferredTimezone: [values.preferredTimezone],
    allegianceFactionId: [values.allegianceFactionId],
  });
}

/** The settings form. */
export type ScopeSettingsForm = ReturnType<typeof settingsFormOf>;

/** The segments of a settings page's address. */
interface ScopeAddress {
  readonly communitySlug: string;
  readonly platformSegment: string;
  readonly slug: string;
}

/**
 * Reads the address, in segments.
 *
 * @param params - The route's parameters.
 * @returns The segments, empty where absent.
 */
function addressOf(params: ParamMap): ScopeAddress {
  return {
    communitySlug: params.get('communitySlug') ?? '',
    platformSegment: params.get('platformSegment') ?? '',
    slug: params.get('slug') ?? '',
  };
}

/**
 * Says why a scope's settings cannot be changed, if they cannot.
 *
 * The server refuses every change at a closed or suspended scope, and at a
 * Fleet whose Community is either, by withdrawing the capability there.
 *
 * @param noun - Community or Fleet.
 * @param status - Its own lifecycle state.
 * @param capabilities - What the reader holds there.
 * @param otherwise - What to say when it is open but the capability is gone.
 * @returns The sentence, or null when they can be changed.
 */
function lockOf(
  noun: string,
  status: FleetScopeStatus,
  capabilities: readonly string[],
  otherwise: string,
): string | null {
  if (status === FleetScopeStatus.CLOSED) {
    return `This ${noun} is closed, so its settings can no longer be changed.`;
  }

  if (status === FleetScopeStatus.SUSPENDED) {
    return (
      `This ${noun} is suspended, so its settings cannot be changed until a ` +
      'site administrator reinstates it.'
    );
  }

  return capabilities.includes(SCOPE_SETTINGS_MANAGE_CAPABILITY)
    ? null
    : otherwise;
}

/**
 * The server's sentence for a conflict.
 *
 * @param error - What came back.
 * @returns The sentence, or null for anything but a 409 carrying one.
 */
function conflictOf(error: unknown): string | null {
  if (
    !(error instanceof HttpErrorResponse) ||
    error.status !== HttpStatusCode.Conflict
  ) {
    return null;
  }

  const message: unknown = (error.error as { message?: unknown } | null)
    ?.message;

  return typeof message === 'string' ? message : null;
}
