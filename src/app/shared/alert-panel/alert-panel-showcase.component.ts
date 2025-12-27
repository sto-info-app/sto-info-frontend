import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AlertPanelComponent } from './alert-panel.component';

@Component({
  selector: 'app-alert-panel-showcase',
  standalone: true,
  imports: [CommonModule, AlertPanelComponent],
  template: `
    <h1>Alert Panel Showcase</h1>
    <div class="stack">
      <app-alert-panel />
      <app-alert-panel
        state="yellow"
        subtitle="CONDITION: YELLOW" />
      <app-alert-panel
        state="green"
        title="All Clear"
        subtitle="Condition: Green" />
      <app-alert-panel
        state="blue"
        title="NOTICE"
        subtitle="CONDITION: BLUE" />
      <app-alert-panel
        state="grey"
        title="STATUS"
        subtitle="CONDITION: GREY" />
    </div>
  `,
  styles: [
    `
      .stack {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
    `,
  ],
})
export class AlertPanelShowcaseComponent {}
