import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

    // Directives
    ResizeObserverDirective,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ApiHealthInterceptor, multi: true },
  ],
})
export class SharedModule {}
