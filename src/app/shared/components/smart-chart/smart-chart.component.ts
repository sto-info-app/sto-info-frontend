import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { LcarsInformationMessageComponent } from '../lcars-information-message/lcars-information-message.component';

export interface ChartDataItem {
  name: string;
  count: number;
}

export interface PieSegment {
  path: string;
  color: string;
  name: string;
  count: number;
  percentage: number;
}

/**
 * A smart chart component that switches between a Pie/Donut chart and a Bar chart
 * based on the number of data points.
 */
@Component({
  selector: 'app-smart-chart',
  templateUrl: './smart-chart.component.html',
  styleUrls: ['./smart-chart.component.scss'],
  standalone: true,
  imports: [CommonModule, LcarsInformationMessageComponent],
})
export class SmartChartComponent implements OnChanges {
  /** The data to display. */
  @Input() data: ChartDataItem[] = [];

  /** The threshold for switching from Pie to Bar chart. */
  @Input() threshold: number = 5;

  /** Force a specific mode if desired. */
  @Input() mode: 'pie' | 'donut' | 'bar' | 'auto' = 'auto';

  /** Calculated pie segments. */
  pieSegments: PieSegment[] = [];

  /** Maximum count for bar scaling. */
  maxCount: number = 0;

  /** Total count of all items. */
  get totalCount(): number {
    return this.data.reduce((sum, d) => sum + d.count, 0);
  }

  /** Colours to loop through. */
  private readonly colors = [
    '#99ccff', // perano
    '#7788ff', // bluey
    '#ff7700', // orange
    '#33cc99', // green
    '#9944ff', // violet
    '#ffaa00', // gold
    '#5588ff', // cool
    '#ff8833', // tangerine
    '#aaffff', // sky
    '#ffcc66', // sunflower
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.calculateChartData();
    }
  }

  /**
   * Returns whether to show the pie chart based on data length and mode.
   */
  get showPie(): boolean {
    if (this.mode === 'pie' || this.mode === 'donut') return true;
    if (this.mode === 'bar') return false;
    return this.data.length <= this.threshold && this.data.length > 0;
  }

  /**
   * Returns whether to show the donut hole.
   */
  get isDonut(): boolean {
    return this.mode === 'donut' || (this.mode === 'auto' && this.showPie);
  }

  private calculateChartData(): void {
    if (!this.data || this.data.length === 0) return;

    this.maxCount = Math.max(...this.data.map(d => d.count));
    const total = this.data.reduce((sum, d) => sum + d.count, 0);

    let cumulativePercentage = 0;
    this.pieSegments = this.data.map((d, i) => {
      const percentage = d.count / total;
      const segment = {
        path: this.getPiePath(
          cumulativePercentage,
          cumulativePercentage + percentage,
        ),
        color: this.colors[i % this.colors.length],
        name: d.name,
        count: d.count,
        percentage: Math.round(percentage * 100),
      };
      cumulativePercentage += percentage;
      return segment;
    });
  }

  private getPiePath(startPercent: number, endPercent: number): string {
    const startX = Math.cos(2 * Math.PI * startPercent);
    const startY = Math.sin(2 * Math.PI * startPercent);
    const endX = Math.cos(2 * Math.PI * endPercent);
    const endY = Math.sin(2 * Math.PI * endPercent);

    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;

    // SVG path: Move to center, Line to start edge, Arc to end edge, Close
    return `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }

  /**
   * Returns a bar width percentage.
   */
  getBarWidth(count: number): string {
    if (this.maxCount <= 0) return '0%';
    return Math.round((count / this.maxCount) * 100) + '%';
  }

  /**
   * Returns a colour class for the bar bars.
   */
  getBarColorClass(index: number): string {
    const colorNames = [
      'perano',
      'bluey',
      'orange',
      'green',
      'violet',
      'gold',
      'cool',
      'tangerine',
      'sky',
      'sunflower',
    ];
    return colorNames[index % colorNames.length] + '-bar';
  }
}
