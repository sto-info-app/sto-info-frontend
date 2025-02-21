import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { EditPersonalDetailsComponent } from './profile/dialogs/edit-personal-details/edit-personal-details.component';
import { ProfileComponent } from './profile/profile.component';

@NgModule({
  declarations: [
    DashboardComponent,
    ProfileComponent,
    EditPersonalDetailsComponent,
  ],
  imports: [CommonModule, SharedModule],
  exports: [DashboardComponent],
})
export class DashboardModule {}
