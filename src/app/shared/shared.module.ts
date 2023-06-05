import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LcarsErrorMessageComponent } from './components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from './components/lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from './components/lcars-success-message/lcars-success-message.component';
import { LcarsWarningMessageComponent } from './components/lcars-warning-message/lcars-warning-message.component';
import { RefreshSessionDialogComponent } from './components/refresh-session-dialog/refresh-session-dialog.component';
import { ResizeObserverDirective } from './directives/resize-observer.directive';
import { TimeFormatPipe } from './pipes/time-format.pipe';

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
export class SharedModule {}
