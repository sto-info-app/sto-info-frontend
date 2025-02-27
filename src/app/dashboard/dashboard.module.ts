import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { EditPersonalDetailsComponent } from './profile/dialogs/edit-personal-details/edit-personal-details.component';
import { ProfilePicComponent } from './profile/dialogs/profile-pic/profile-pic.component';
import { ProfileComponent } from './profile/profile.component';

@NgModule({
  declarations: [
    DashboardComponent,
    ProfileComponent,
    EditPersonalDetailsComponent,
  ],
  imports: [CommonModule, SharedModule, ProfilePicComponent],
  exports: [DashboardComponent],
})
export class DashboardModule {}
