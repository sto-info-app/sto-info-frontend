import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  FaIconLibrary,
  FontAwesomeModule,
} from '@fortawesome/angular-fontawesome';
import { faExternalLink, faHandSpock } from '@fortawesome/free-solid-svg-icons';
import { LcarsErrorMessageComponent } from './components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from './components/lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from './components/lcars-success-message/lcars-success-message.component';
import { LcarsWarningMessageComponent } from './components/lcars-warning-message/lcars-warning-message.component';
import { RefreshSessionDialogComponent } from './components/refresh-session-dialog/refresh-session-dialog.component';
import { ResizeObserverDirective } from './directives/resize-observer.directive';
import { TimeFormatPipe } from './pipes/time-format.pipe';

// NOTE: This imports all icons into the bundle and increases app size!
// import { fas } from '@fortawesome/pro-solid-svg-icons';
// import { far } from '@fortawesome/pro-regular-svg-icons';

@NgModule({
  declarations: [
    // Pipes
    TimeFormatPipe,

    // Directives
    ResizeObserverDirective,

    // Components
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LcarsSuccessMessageComponent,
    LcarsWarningMessageComponent,
    RefreshSessionDialogComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  exports: [
    // Modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FontAwesomeModule,

    // Pipes
    TimeFormatPipe,

    // Directives
    ResizeObserverDirective,

    // Components
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LcarsSuccessMessageComponent,
    LcarsWarningMessageComponent,
    RefreshSessionDialogComponent,
  ],
})
export class SharedModule {
  constructor(library: FaIconLibrary) {
    // Add an individual FontAwesome icon to the library for convenient access in other components
    // NOTE: Use `<fa-icon [icon]="['fas', 'hand-spock']"></fa-icon>` to use icon in the HTML
    // NOTE: FontAwesome prefixes are: fas = solid, far = regular, fal = light, fat = thin, fad = duotone
    library.addIcons(faHandSpock, faExternalLink);

    // Add entire icon packs
    // NOTE: This imports all icons into the bundle and increases app size!
    // library.addIconPacks(fas, far);
  }
}
