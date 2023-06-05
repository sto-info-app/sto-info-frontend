import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { ProfileComponent } from './profile/profile.component';

@NgModule({
  declarations: [DashboardComponent, ProfileComponent],
  imports: [CommonModule, SharedModule],
  exports: [DashboardComponent],
})
export class DashboardModule {}
