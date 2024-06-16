import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
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
import { TemplateModule } from './template/template.module';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

@NgModule({ declarations: [AppComponent],
    bootstrap: [AppComponent], imports: [
        // Routing modules
        AppRoutingModule,
        // Auth modules
        JwtModule.forRoot({
            config: {
                tokenGetter: tokenGetter,
                allowedDomains: [new URL(environment.apiUrl).host],
                disallowedRoutes: [],
            },
        }),
        // Angular modules
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        // Project modules
        SharedModule,
        CoreModule,
        DashboardModule,
        ErrorPagesModule,
        HomeModule,
        StaticPagesModule,
        TemplateModule], providers: [
        {
            provide: 'API_URL',
            useValue: environment.apiUrl,
        },
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}
