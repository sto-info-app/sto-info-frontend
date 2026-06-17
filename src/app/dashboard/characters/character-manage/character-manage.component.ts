import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  combineLatest,
  EMPTY,
  Observable,
  Subject,
  catchError,
  forkJoin,
  of,
  switchMap,
  takeUntil,
  startWith,
} from 'rxjs';
import {
  Character,
  CharacterClass,
  Faction,
  GeneralFaction,
  RecruitType,
  Sex,
  Species,
} from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { CHARACTER_NAME_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import {
  decodeStoHandle,
  encodeStoHandle,
} from 'src/app/shared/utils/sto-handle.utils';

@Component({
  selector: 'app-character-manage',
  templateUrl: './character-manage.component.html',
  styleUrls: ['./character-manage.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CharacterManageComponent implements OnInit, OnDestroy {
  characterForm: FormGroup;
  isSubmitting = false;
  isLoading = true;
  errorMessage = '';
  mode: 'add' | 'edit' = 'add';

  accountId = '';
  accountHandle = '';
  characterId = '';
  characterHandle = '';

  generalFactions: GeneralFaction[] = [];
  factions: Faction[] = [];
  sexes: Sex[] = [];
  classes: CharacterClass[] = [];
  recruitTypes: RecruitType[] = [];
  speciesList: Species[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly characterService = inject(CharacterService);
  private readonly stoAccountService = inject(StoAccountService);
  private readonly lookupService = inject(CharacterLookupService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private readonly dashboardAccountsRoute = '/dashboard/accounts';

  constructor() {
    this.characterForm = this.fb.group({
      handle: [
        '',
        [Validators.required, Validators.pattern(CHARACTER_NAME_PATTERN)],
      ], // Captain Name
      firstName: [''],
      middleName: [''],
      lastName: [''],
      biography: [''],
      notes: [''],
      createdDate: [null],
      level: [0, [Validators.required, Validators.min(0), Validators.max(65)]],
      generalFactionId: ['', Validators.required],
      factionId: ['', Validators.required],
      sexId: ['', Validators.required],
      classId: ['', Validators.required],
      recruitTypeId: ['', Validators.required],
      speciesId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.accountHandle = decodeStoHandle(params['handle']);
      this.characterHandle = params['characterHandle'];
      this.mode = this.characterHandle ? 'edit' : 'add';

      this.loadInitialData();
    });

    // Setup dynamic filtering
    this.characterForm
      .get('factionId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .pipe(
        switchMap(factionId => {
          if (!factionId) {
            return of({
              recruitTypes: [] as RecruitType[],
              generalFactions: [] as GeneralFaction[],
            });
          }

          return forkJoin({
            recruitTypes: this.lookupService.getRecruitTypes(factionId),
            generalFactions: this.lookupService.getGeneralFactions(factionId),
          });
        }),
      )
      .subscribe(({ recruitTypes, generalFactions }) => {
        this.recruitTypes = recruitTypes;
        this.generalFactions = generalFactions;

        this.clearInvalidSelection('recruitTypeId', recruitTypes);
        this.clearInvalidSelection('generalFactionId', generalFactions);

        if (generalFactions.length === 1) {
          this.characterForm.patchValue({
            generalFactionId: generalFactions[0].id,
          });
        }
        this.cdr.markForCheck();
      });

    this.bindSpeciesUpdates();
  }

  loadInitialData(): void {
    this.isLoading = true;

    const observables: {
      generalFactions: Observable<GeneralFaction[]>;
      factions: Observable<Faction[]>;
      sexes: Observable<Sex[]>;
      classes: Observable<CharacterClass[]>;
      recruitTypes: Observable<RecruitType[]>;
      accounts: Observable<StoAccount[]>;
    } = {
      generalFactions: this.lookupService.getGeneralFactions(),
      factions: this.lookupService.getFactions(),
      sexes: this.lookupService.getSexes(),
      classes: this.lookupService.getClasses(),
      recruitTypes: this.lookupService.getRecruitTypes(),
      accounts: this.stoAccountService.getAccounts(),
    };

    forkJoin(observables)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.generalFactions = res.generalFactions;
          this.factions = res.factions;
          this.sexes = res.sexes;
          this.classes = res.classes;
          if (this.mode === 'add') {
            this.recruitTypes = res.recruitTypes;
          }

          const account = res.accounts.find(
            (a: StoAccount) => a.handle === this.accountHandle,
          );
          if (account) {
            this.accountId = account.id;

            if (this.mode === 'edit') {
              this.loadCharacter();
            } else {
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          } else {
            this.errorMessage = 'Account not found';
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        },
        error: err => {
          this.errorMessage = 'Failed to load form data';
          this.isLoading = false;
          this.cdr.markForCheck();
          console.error(err);
        },
      });
  }

  loadCharacter(): void {
    this.characterService
      .getCharactersByAccount(this.accountId)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(characters => {
          const char = characters.find(c => c.handle === this.characterHandle);
          if (!char) {
            this.errorMessage = 'Character not found';
            this.isLoading = false;
            this.cdr.markForCheck();
            return EMPTY;
          }

          this.characterId = char.id;

          return this.characterService.getCharacter(char.id).pipe(
            catchError(err => {
              this.errorMessage = 'Failed to load character details';
              this.isLoading = false;
              this.cdr.markForCheck();
              console.error(err);
              return EMPTY;
            }),
          );
        }),
        switchMap(fullChar => {
          this.patchCharacterForm(fullChar);

          return forkJoin({
            recruitTypes: fullChar.factionId
              ? this.lookupService.getRecruitTypes(fullChar.factionId)
              : of([] as RecruitType[]),
            species: this.lookupService.getSpecies(
              fullChar.factionId,
              fullChar.recruitTypeId,
            ),
          }).pipe(
            catchError(err => {
              this.errorMessage = 'Failed to load character options';
              this.isLoading = false;
              this.cdr.markForCheck();
              console.error(err);
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe({
        next: ({ recruitTypes, species }) => {
          this.recruitTypes = recruitTypes;
          this.speciesList = species;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          this.errorMessage = 'Failed to load characters';
          this.isLoading = false;
          this.cdr.markForCheck();
          console.error(err);
        },
      });
  }

  private patchCharacterForm(fullChar: Character): void {
    this.characterForm.patchValue(
      {
        handle: fullChar.handle,
        firstName: fullChar.firstName,
        middleName: fullChar.middleName,
        lastName: fullChar.lastName,
        biography: fullChar.biography,
        notes: fullChar.notes,
        createdDate: fullChar.createdDate
          ? new Date(fullChar.createdDate).toISOString().split('T')[0]
          : null,
        level: fullChar.level,
        generalFactionId: fullChar.generalFactionId,
        factionId: fullChar.factionId,
        sexId: fullChar.sexId,
        classId: fullChar.classId,
        recruitTypeId: fullChar.recruitTypeId,
        speciesId: fullChar.speciesId,
      },
      { emitEvent: false },
    );
  }

  private bindSpeciesUpdates(): void {
    const factionControl = this.characterForm.get('factionId');
    const recruitTypeControl = this.characterForm.get('recruitTypeId');

    if (!factionControl || !recruitTypeControl) {
      return;
    }

    combineLatest([
      factionControl.valueChanges.pipe(startWith(factionControl.value)),
      recruitTypeControl.valueChanges.pipe(startWith(recruitTypeControl.value)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([factionId, recruitTypeId]) => {
          if (!factionId) {
            this.speciesList = [];
            this.characterForm.patchValue({ speciesId: '' });
            return of([] as Species[]);
          }

          return this.lookupService.getSpecies(factionId, recruitTypeId).pipe(
            catchError(err => {
              console.error('Failed to load species', err);
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe(species => {
        this.speciesList = species;
        this.clearInvalidSelection('speciesId', species);
        this.cdr.markForCheck();
      });
  }

  onSave(): void {
    if (this.characterForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const formData = {
      ...this.characterForm.value,
      accountId: this.accountId,
      createdDate: this.characterForm.value.createdDate
        ? new Date(this.characterForm.value.createdDate).toISOString()
        : undefined,
    };

    if (this.mode === 'add') {
      this.characterService
        .createCharacter(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.navigateToAccount(),
          error: err => {
            this.handleSaveError(err, 'Failed to create character.');
          },
        });
    } else {
      this.characterService
        .updateCharacter(this.characterId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.navigateToCharacter(formData.handle),
          error: err => {
            this.handleSaveError(err, 'Failed to update character.');
          },
        });
    }
  }

  onCancel(): void {
    if (this.mode === 'edit') {
      this.navigateToCharacter(this.characterHandle);
    } else {
      this.navigateToAccount();
    }
  }

  private clearInvalidSelection<T extends { id: string }>(
    controlName: string,
    items: readonly T[],
  ): void {
    const currentValue = this.characterForm.get(controlName)?.value;
    if (currentValue && !items.some(item => item.id === currentValue)) {
      this.characterForm.patchValue({ [controlName]: '' });
    }
  }

  private navigateToAccount(): void {
    this.router.navigate([
      this.dashboardAccountsRoute,
      encodeStoHandle(this.accountHandle),
    ]);
  }

  private navigateToCharacter(characterHandle: string): void {
    this.router.navigate([
      this.dashboardAccountsRoute,
      encodeStoHandle(this.accountHandle),
      characterHandle,
    ]);
  }

  private handleSaveError(error: unknown, fallbackMessage: string): void {
    this.isSubmitting = false;

    if (
      error instanceof HttpErrorResponse &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof (error.error as { message?: unknown }).message === 'string'
    ) {
      this.errorMessage = (error.error as { message: string }).message;
    } else {
      this.errorMessage = fallbackMessage;
    }

    console.error(error);
    this.cdr.markForCheck();
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   * Completes the destroy$ subject to unsubscribe from all active subscriptions
   * including route params, form value changes, and API calls.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
