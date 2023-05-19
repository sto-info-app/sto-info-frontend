import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  appTitle: string = environment.appTitle;
  isLoggedIn = false;

  constructor(private authService: AuthService) {
    authService.isAuthenticated$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });
  }
}
