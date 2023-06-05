import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JwtModule } from '@auth0/angular-jwt';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ErrorPagesModule } from './error-pages/error-pages.module';
import { HomeModule } from './home/home.module';
import { SharedModule } from './shared/shared.module';
import { StaticPagesModule } from './static-pages/static-pages.module';
import { FooterComponent } from './template/footer/footer.component';
import { HeaderComponent } from './template/header/header.component';
import { MainContentBarPanelComponent } from './template/main-content-bar-panel/main-content-bar-panel.component';
import { MainContentComponent } from './template/main-content/main-content.component';
import { SideBarComponent } from './template/side-bar/side-bar.component';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    MainContentComponent,
    SideBarComponent,
    FooterComponent,
    MainContentBarPanelComponent,
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
    MatDialogModule,
    SharedModule,
    CoreModule,
    DashboardModule,
    ErrorPagesModule,
    HomeModule,
    StaticPagesModule,
  ],
  providers: [
    {
      provide: 'API_URL',
      useValue: environment.apiUrl,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
