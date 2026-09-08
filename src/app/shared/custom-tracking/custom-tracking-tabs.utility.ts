import {
  CustomTrackingSectionTree,
  CustomTrackingTabTree,
} from 'src/app/models/custom-tracking.models';
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';

/** Returns the selected tab, falling back when filtering hides it. */
export function activeTrackingTab(
  section: CustomTrackingSectionTree,
  activeTabs: Record<string, string>,
): CustomTrackingTabTree | null {
  return (
    section.tabs.find(tab => tab.id === activeTabs[section.id]) ??
    section.tabs[0] ??
    null
  );
}

/** Selects and focuses the next tab for a supported navigation key. */
export function navigateTrackingTabs(
  event: KeyboardEvent,
  section: CustomTrackingSectionTree,
  activeTabs: Record<string, string>,
  focus: (tabId: string) => void,
): void {
  if (section.tabs.length === 0) {
    return;
  }

  const selected = activeTrackingTab(section, activeTabs)!;
  const current = section.tabs.indexOf(selected);
  const moved = nextTabIndex(event.key, current, section.tabs.length);
  if (moved === null) {
    return;
  }
  event.preventDefault();
  const tab = section.tabs[moved];
  activeTabs[section.id] = tab.id;
  focus(tab.id);
}
