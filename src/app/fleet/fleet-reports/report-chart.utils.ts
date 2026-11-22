import { ChartDataItem } from 'src/app/shared/components/smart-chart/smart-chart.component';

/** A report's chart, and how many of its figures were hidden from it. */
export interface ReportChart {
  readonly data: ChartDataItem[];
  /** How many figures an aggregate view hid, and so are not drawn. */
  readonly hidden: number;
}

/**
 * Draws a report's figures, leaving out the hidden ones (FC-020).
 *
 * A hidden figure is not drawn at all: a bar of nought would say there was
 * nothing, and a bar of any other height would say how much. The chart says
 * how many it left out instead.
 *
 * @param entries - Each bar's name and figure; null when hidden.
 * @returns The bars drawn, and how many were left out.
 */
export function reportChartOf(
  entries: readonly { name: string; value: number | string | null }[],
): ReportChart {
  const shown = entries.filter(
    (entry): entry is { name: string; value: number | string } =>
      entry.value !== null,
  );

  return {
    data: shown.map(entry => ({
      name: entry.name,
      count: Number(entry.value),
    })),
    hidden: entries.length - shown.length,
  };
}
