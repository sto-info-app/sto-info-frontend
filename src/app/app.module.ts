import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JwtModule } from '@auth0/angular-jwt';
import {
  FaIconLibrary,
  FontAwesomeModule,
} from '@fortawesome/angular-fontawesome';
import { faExternalLink, faHandSpock } from '@fortawesome/free-solid-svg-icons';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PageNotFoundComponent } from './error-pages/page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { SharedModule } from './shared/shared.module';
import { AboutComponent } from './static-pages/about/about.component';
import { ContactComponent } from './static-pages/contact/contact.component';
import { CreditsComponent } from './static-pages/credits/credits.component';
import { TermsOfUseComponent } from './static-pages/terms-of-use/terms-of-use.component';
import { FooterComponent } from './template/footer/footer.component';
import { HeaderComponent } from './template/header/header.component';
import { MainContentBarPanelComponent } from './template/main-content-bar-panel/main-content-bar-panel.component';
import { MainContentComponent } from './template/main-content/main-content.component';
import { SideBarComponent } from './template/side-bar/side-bar.component';

// NOTE: This imports all icons into the bundle and increases app size!
// import { fas } from '@fortawesome/pro-solid-svg-icons';
// import { far } from '@fortawesome/pro-regular-svg-icons';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ContactComponent,
    AboutComponent,
    TermsOfUseComponent,
    PageNotFoundComponent,
    HeaderComponent,
    MainContentComponent,
    SideBarComponent,
    FooterComponent,
    MainContentBarPanelComponent,
    CreditsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: [new URL(environment.apiUrl).host],
        disallowedRoutes: [],
      },
    }),
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    MatDialogModule,
    SharedModule,
    CoreModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: 'API_URL',
      useValue: environment.apiUrl,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    // Add an individual FontAwesome icon to the library for convenient access in other components
    // NOTE: Use `<fa-icon [icon]="['fas', 'hand-spock']"></fa-icon>` to use icon in the HTML
    // NOTE: FontAwesome prefixes are: fas = solid, far = regular, fal = light, fat = thin, fad = duotone
    library.addIcons(faHandSpock, faExternalLink);

    // Add entire icon packs
    // NOTE: This imports all icons into the bundle and increases app size!
    // library.addIconPacks(fas, far);
  }
}
