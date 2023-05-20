import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('scrollTopButton')
  scrollTopButton!: ElementRef;

  appTitle = environment.appTitle;
  appLoggedInHome = environment.appLoggedInHome;
  appVersion = environment.version;

  isLoggedIn = false;
  currentYear: number;
  dataCascade: string;
  showScrollTop = false;
  sideColumnRandomTextItems: string[] = [];
  maxNumberOfSideColumnRandomTextItems = 5;

  constructor(
    @Inject('API_URL') private apiUrl: string,

    private authService: AuthService,
    private titleService: Title,

    private http: HttpClient,
    private renderer: Renderer2,
    private el: ElementRef,
  ) {
    this.titleService.setTitle(environment.appTitle);
    this.currentYear = new Date().getFullYear();
    this.dataCascade = this.createDynamicDataCascade(8, 7, 3, 6);
  }

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.populateSideColumnRandomTextItems();
  }

  ngAfterViewInit() {
    window.addEventListener('scroll', () => {
      this.toggleScrollTopButton();
    });
  }

  toggleScrollTopButton() {
    if (window.pageYOffset > 100) {
      this.scrollTopButton.nativeElement.style.display = 'block';
    } else {
      this.scrollTopButton.nativeElement.style.display = 'none';
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  populateSideColumnRandomTextItems(): void {
    for (let i = 0; i < this.maxNumberOfSideColumnRandomTextItems; i++) {
      this.sideColumnRandomTextItems.push(this.createDynamicSideColumnText());
    }
  }

  randomCharacter(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return characters.charAt(Math.floor(Math.random() * characters.length));
  }

  generateRandomValue(minChars: number, maxChars: number): string {
    const numbers = '0123456789';
    const special = ' -';
    let value = '';

    const length =
      Math.floor(Math.random() * (maxChars - minChars + 1)) + minChars;
    const numLetters = Math.floor(Math.random() * Math.min(3, length + 1)); // 0 to 2 letters, but not more than the length
    const numNumbers = length - numLetters;

    for (let i = 0; i < numLetters; i++) {
      value += this.randomCharacter();
    }

    for (let i = 0; i < numNumbers; i++) {
      value += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Add space or hyphen with a 1 in 20 chance, but not for the first or last character
    if (length >= 3 && Math.random() < 1 / 20) {
      const specialIndex = Math.floor(Math.random() * (length - 3)) + 1;
      value =
        value.slice(0, specialIndex) +
        special.charAt(Math.floor(Math.random() * special.length)) +
        value.slice(specialIndex);
    }

    // Shuffle the characters in the value to mix letters and numbers
    value = value
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');

    return value;
  }

  createDynamicDataCascade(
    rows: number,
    itemsPerRow: number,
    minChars: number,
    maxChars: number,
  ): string {
    let html = '';

    for (let i = 1; i <= rows; i++) {
      html += `<div class="row-${i}">`;
      for (let j = 1; j <= itemsPerRow; j++) {
        const value = this.generateRandomValue(minChars, maxChars);
        html += `<div class="dc${j}">${value}</div>`;
      }
      html += '</div>';
    }

    return html;
  }

  createDynamicSideColumnText(): string {
    const value1 = this.generateRandomValue(2, 2);
    const value2 = this.generateRandomValue(6, 6);
    const html = `<span class="random-lcars-ref">${value1}<span class="hop">-${value2}</span></span>`;
    return html;
  }

  logout(): void {
    this.authService.performLogout();
  }
}
