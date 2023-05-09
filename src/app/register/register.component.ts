import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    const credentials = {
      email: this.email,
      password: this.password,
    };

    this.authService.register(credentials).subscribe({
      next: (response: any) => {
        this.authService.saveToken(response.token);
        this.router.navigate(['/protected']);
      },
      error: error => {
        console.error('Registration error:', error);
        // Handle login errors here (e.g., display an error message)
      },
      complete: () => {
        console.log('Registration complete');
      },
    });
  }
}
