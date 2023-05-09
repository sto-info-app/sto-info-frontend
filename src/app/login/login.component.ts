import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Renderer2 } from '@angular/core';
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
  showErrorMilliseconds = 10000;
  showRedAlertMilliseconds = 7000;
  inputsValid: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private el: ElementRef,
  ) {}

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
    this.applyErrorStylesheet();
    this.errorMessage = message;

    setTimeout(() => {
      this.errorMessage = ''; // Reset error message
    }, this.showErrorMilliseconds);
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

  private applyErrorStylesheet() {
    // Create a link element for the red alert stylesheet
    const errorStyleLink = this.renderer.createElement('link');

    // Set the link element attributes
    this.renderer.setAttribute(errorStyleLink, 'rel', 'stylesheet');
    this.renderer.setAttribute(
      errorStyleLink,
      'href',
      'assets/lcars/lcars-red-alert.css',
    );
    this.renderer.setAttribute(errorStyleLink, 'id', 'red-alert-style-link');

    // Add the red alert stylesheet to the head of the document
    this.renderer.appendChild(
      this.el.nativeElement.ownerDocument.head,
      errorStyleLink,
    );

    // Remove the red alert stylesheet after 30 seconds
    setTimeout(() => {
      this.renderer.removeChild(
        this.el.nativeElement.ownerDocument.head,
        errorStyleLink,
      );
    }, this.showRedAlertMilliseconds);
  }
}
