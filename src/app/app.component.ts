import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  appTitle = 'Star Trek Online Info App';
  backendResponse = '';

  constructor(
    private http: HttpClient,
    @Inject('API_URL') private apiUrl: string,
    private titleService: Title,
  ) {
    this.titleService.setTitle(environment.appTitle);
  }

  ngOnInit() {
    this.http.get(`${this.apiUrl}`, { responseType: 'text' }).subscribe({
      next: data => {
        this.backendResponse = data;
      },
      error: error => {
        this.backendResponse = 'Error fetching data from backend';
      },
    });
  }
}
