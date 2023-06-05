import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { ChangePasswordComponent } from './auth/change-password/change-password.component';
import { ResetPasswordRequestComponent } from './auth/reset-password-request/reset-password-request.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RegistrationCompleteComponent } from './registration-complete/registration-complete.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';

@NgModule({
  declarations: [
    ChangePasswordComponent,
    ResetPasswordRequestComponent,
    LoginComponent,
    RegisterComponent,
    RegistrationCompleteComponent,
    VerifyEmailComponent,
  ],
  imports: [CommonModule, SharedModule],
  providers: [AuthService, AuthGuard],
})
export class CoreModule {}
