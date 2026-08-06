import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommunityTabsComponent } from './community-tabs/community-tabs.component';

/**
 * The Community landing page — the About tab — introducing the Galactic
 * Personnel Registry and the friends list. Every other section of the community
 * is reached from the tab strip.
 */
@Component({
  selector: 'app-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, CommunityTabsComponent],
})
export class CommunityComponent {}
