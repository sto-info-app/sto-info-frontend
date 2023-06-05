import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { MainContentBarPanelComponent } from './main-content-bar-panel/main-content-bar-panel.component';
import { MainContentComponent } from './main-content/main-content.component';
import { SideBarComponent } from './side-bar/side-bar.component';

@NgModule({
  declarations: [
    FooterComponent,
    HeaderComponent,
    MainContentComponent,
    MainContentBarPanelComponent,
    SideBarComponent,
  ],
  imports: [CommonModule, SharedModule],
  exports: [
    FooterComponent,
    HeaderComponent,
    MainContentComponent,
    MainContentBarPanelComponent,
    SideBarComponent,
  ],
})
export class TemplateModule {}
