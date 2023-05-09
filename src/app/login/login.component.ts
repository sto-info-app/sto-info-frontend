import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  inputsValid: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    const credentials = {
      email: this.email,
      password: this.password,
    };

    this.authService.login(credentials).subscribe({
      next: (response: any) => {
        this.authService.saveToken(response.access_token);
        this.router.navigate(['/info']);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          const errMessage = 'Unauthorised: Invalid email or password.';
          console.error('Login error:', errMessage);
          this.displayErrorMessage(errMessage);
        } else {
          console.error('Login error:', error);
          this.displayErrorMessage(error.error.message);
        }
      },
      complete: () => {
        console.log('Login complete');
      },
    });
    //TODO: Delete console logging!
  }

  displayErrorMessage(message: string) {
    this.errorMessage = message;

    setTimeout(() => {
      this.errorMessage = ''; // Reset error message
    }, 5000); // 5000 milliseconds = 5 seconds
  }

  validateInputs() {
    // check if both inputs are non-empty and email is valid
    this.inputsValid =
      this.email.trim() !== '' &&
      this.password.trim() !== '' &&
      this.validateEmail(this.email);
  }

  validateEmail(email: string): boolean {
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return regex.test(email);
  }
}
