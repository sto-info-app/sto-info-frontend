import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ServiceInterruptionComponent } from './service-interruption/service-interruption.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    PageNotFoundComponent,
    ServiceInterruptionComponent,
  ],
  exports: [PageNotFoundComponent, ServiceInterruptionComponent],
})
export class ErrorPagesModule {}
