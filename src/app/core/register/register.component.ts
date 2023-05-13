import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth.service';
import { MustMatch } from '../../_helpers/must-match.validator';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  submitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.registerForm = this.formBuilder.group(
      {
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(5),
            Validators.pattern('^[a-zA-Z0-9]*$'),
          ],
        ],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              '^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\n\r\t]).{8,}$',
            ),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validator: MustMatch('password', 'confirmPassword') },
    );
  }

  onRegister() {
    this.submitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    const credentials = this.registerForm.value;

    this.authService.register(credentials).subscribe({
      next: (response: any) => {
        this.router.navigate(['/register/complete']);
      },
      error: error => {
        if (error.status === 409) {
          console.error('Registration Conflict Exception error:', error);
          if (error.error.message.includes('Email')) {
            this.registerForm.controls['email'].setErrors({
              uniqueEmail: true,
            });
          } else if (error.error.message.includes('Username')) {
            this.registerForm.controls['username'].setErrors({
              uniqueUsername: true,
            });
          }
        } else {
          console.error('Registration error:', error);
          // Handle other types of errors
        }
      },
      complete: () => {
        console.log('Registration complete');
      },
    });
  }
}
