import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ApiHealthInterceptor } from '../core/health/api-health.interceptor';
import { ResizeObserverDirective } from './directives/resize-observer.directive';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ResizeObserverDirective,
  ],
  exports: [
    // Modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FontAwesomeModule,

    // Directives
    ResizeObserverDirective,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ApiHealthInterceptor, multi: true },
  ],
})
export class SharedModule {}
