import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
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

/** A single precomputed row for the bar chart. */
export interface BarRow {
  name: string;
  count: number;
  /** Precomputed width percentage string, e.g. '75%'. */
  width: string;
  /** Precomputed colour class, e.g. 'perano-bar'. */
  colorClass: string;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LcarsInformationMessageComponent],
})
export class SmartChartComponent {
  /** The data to display. */
  readonly data = input<ChartDataItem[]>([]);

  /** The threshold for switching from Pie to Bar chart. */
  readonly threshold = input<number>(5);

  /** Force a specific mode if desired. */
  readonly mode = input<'pie' | 'donut' | 'bar' | 'auto'>('auto');

  /** Total count of all items, derived from data. */
  readonly totalCount = computed(() => {
    const data = this.data() ?? [];
    return data.reduce((sum, d) => sum + d.count, 0);
  });

  /** Maximum count across all items, used for bar scaling. */
  readonly maxCount = computed(() => {
    const data = this.data() ?? [];
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => d.count));
  });

  /** Whether to render the pie/donut chart, derived from mode and threshold. */
  readonly showPie = computed(() => {
    const m = this.mode();
    if (m === 'pie' || m === 'donut') return true;
    if (m === 'bar') return false;
    const data = this.data() ?? [];
    return data.length <= this.threshold() && data.length > 0;
  });

  /** Whether to render the donut hole over the pie chart. */
  readonly isDonut = computed(
    () => this.mode() === 'donut' || (this.mode() === 'auto' && this.showPie()),
  );

  /** Precomputed SVG segments for the pie/donut chart. */
  readonly pieSegments = computed<PieSegment[]>(() => {
    const data = this.data() ?? [];
    if (data.length === 0) return [];
    const total = this.totalCount();
    if (total === 0) return [];
    let cumulative = 0;
    return data.map((d, i) => {
      const pct = d.count / total;
      const segment: PieSegment = {
        path: this._getPiePath(cumulative, cumulative + pct),
        color: this._colors[i % this._colors.length],
        name: d.name,
        count: d.count,
        percentage: Math.round(pct * 100),
      };
      cumulative += pct;
      return segment;
    });
  });

  /** Precomputed rows for the bar chart, with width and colour class already resolved. */
  readonly barRows = computed<BarRow[]>(() => {
    const maxCount = this.maxCount();
    return (this.data() ?? []).map((item, i) => ({
      name: item.name,
      count: item.count,
      width:
        maxCount <= 0 ? '0%' : Math.round((item.count / maxCount) * 100) + '%',
      colorClass: this.getBarColorClass(i),
    }));
  });

  /** Colours to loop through for chart segments. */
  private readonly _colors = [
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

  /**
   * Returns a bar width percentage string for the given count.
   *
   * @param count The count value for a single bar.
   * @returns A CSS percentage string, e.g. '75%'.
   */
  getBarWidth(count: number): string {
    const maxCount = this.maxCount();
    if (maxCount <= 0) return '0%';
    return Math.round((count / maxCount) * 100) + '%';
  }

  /**
   * Returns a colour class for a bar at the given index.
   *
   * @param index Zero-based position in the data array.
   * @returns A CSS class string, e.g. 'perano-bar'.
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

  private _getPiePath(startPercent: number, endPercent: number): string {
    const startX = Math.cos(2 * Math.PI * startPercent);
    const startY = Math.sin(2 * Math.PI * startPercent);
    const endX = Math.cos(2 * Math.PI * endPercent);
    const endY = Math.sin(2 * Math.PI * endPercent);

    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;

    // SVG path: Move to centre, Line to start edge, Arc to end edge, Close
    return `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }
}
