import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { CreditsComponent } from './credits/credits.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsOfUseComponent } from './terms-of-use/terms-of-use.component';

@NgModule({
  declarations: [
    AboutComponent,
    ContactComponent,
    TermsOfUseComponent,
    CreditsComponent,
    PrivacyPolicyComponent,
  ],
  imports: [CommonModule, SharedModule],
  exports: [
    AboutComponent,
    ContactComponent,
    TermsOfUseComponent,
    CreditsComponent,
    PrivacyPolicyComponent,
  ],
})
export class StaticPagesModule {}
