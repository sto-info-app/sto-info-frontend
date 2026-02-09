import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, forkJoin, takeUntil } from 'rxjs';
import {
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
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
  private readonly destroy$ = new Subject<void>();

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
      .subscribe(factionId => {
        this.updateSpecies();
        if (factionId) {
          this.lookupService
            .getRecruitTypes(factionId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(types => {
              this.recruitTypes = types;
              const currentRecruitId =
                this.characterForm.get('recruitTypeId')?.value;
              if (
                currentRecruitId &&
                !types.some(t => t.id === currentRecruitId)
              ) {
                this.characterForm.patchValue({ recruitTypeId: '' });
              }
            });
        }
      });

    this.characterForm
      .get('recruitTypeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateSpecies();
      });
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
          this.recruitTypes = res.recruitTypes;

          const account = res.accounts.find(
            (a: StoAccount) => a.handle === this.accountHandle,
          );
          if (account) {
            this.accountId = account.id;

            if (this.mode === 'edit') {
              this.loadCharacter();
            } else {
              this.isLoading = false;
            }
          } else {
            this.errorMessage = 'Account not found';
            this.isLoading = false;
          }
        },
        error: err => {
          this.errorMessage = 'Failed to load form data';
          this.isLoading = false;
          console.error(err);
        },
      });
  }

  loadCharacter(): void {
    this.characterService
      .getCharactersByAccount(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: characters => {
          const char = characters.find(c => c.handle === this.characterHandle);
          if (char) {
            this.characterId = char.id;
            // Fetch full character data
            this.characterService
              .getCharacter(char.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: fullChar => {
                  this.characterForm.patchValue({
                    handle: fullChar.handle,
                    firstName: fullChar.firstName,
                    middleName: fullChar.middleName,
                    lastName: fullChar.lastName,
                    biography: fullChar.biography,
                    notes: fullChar.notes,
                    createdDate: fullChar.createdDate
                      ? new Date(fullChar.createdDate)
                      : null,
                    level: fullChar.level,
                    generalFactionId: fullChar.generalFactionId,
                    factionId: fullChar.factionId,
                    sexId: fullChar.sexId,
                    classId: fullChar.classId,
                    recruitTypeId: fullChar.recruitTypeId,
                    speciesId: fullChar.speciesId,
                  });
                  this.updateSpecies();
                  this.isLoading = false;
                },
                error: err => {
                  this.errorMessage = 'Failed to load character details';
                  this.isLoading = false;
                  console.error(err);
                },
              });
          } else {
            this.errorMessage = 'Character not found';
            this.isLoading = false;
          }
        },
        error: err => {
          this.errorMessage = 'Failed to load characters';
          this.isLoading = false;
          console.error(err);
        },
      });
  }

  updateSpecies(): void {
    const factionId = this.characterForm.get('factionId')?.value;
    const recruitTypeId = this.characterForm.get('recruitTypeId')?.value;

    if (factionId) {
      this.lookupService
        .getSpecies(factionId, recruitTypeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: species => {
            this.speciesList = species;
            const currentSpeciesId = this.characterForm.get('speciesId')?.value;
            if (
              currentSpeciesId &&
              !species.some(s => s.id === currentSpeciesId)
            ) {
              this.characterForm.patchValue({ speciesId: '' });
            }
          },
          error: err => console.error('Failed to load species', err),
        });
    } else {
      this.speciesList = [];
      this.characterForm.patchValue({ speciesId: '' });
    }
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
        ? this.characterForm.value.createdDate.toISOString()
        : undefined,
    };

    if (this.mode === 'add') {
      this.characterService
        .createCharacter(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.router.navigate([
              '/dashboard/accounts',
              encodeStoHandle(this.accountHandle),
            ]);
          },
          error: err => {
            this.isSubmitting = false;
            this.errorMessage =
              err.error?.message || 'Failed to create character.';
            console.error(err);
          },
        });
    } else {
      this.characterService
        .updateCharacter(this.characterId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.router.navigate([
              '/dashboard/accounts',
              encodeStoHandle(this.accountHandle),
              formData.handle,
            ]);
          },
          error: err => {
            this.isSubmitting = false;
            this.errorMessage =
              err.error?.message || 'Failed to update character.';
            console.error(err);
          },
        });
    }
  }

  onCancel(): void {
    if (this.mode === 'edit') {
      this.router.navigate([
        '/dashboard/accounts',
        encodeStoHandle(this.accountHandle),
        this.characterHandle,
      ]);
    } else {
      this.router.navigate([
        '/dashboard/accounts',
        encodeStoHandle(this.accountHandle),
      ]);
    }
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
