/** Visual treatment (LCARS colour class + Font Awesome icon) per severity. */

import { NotificationSeverity } from 'src/app/models/notification.models';

export const PAGE_SIZE = 15;
export const LOAD_TIMEOUT_MS = 12000;

export interface SeverityMeta {
  colourClass: string;
  icon: string;
  label: string;
}

export const SEVERITY_META: Record<NotificationSeverity, SeverityMeta> = {
  [NotificationSeverity.INFO]: {
    colourClass: 'severity-info',
    icon: 'fa-circle-info',
    label: 'Information',
  },
  [NotificationSeverity.SUCCESS]: {
    colourClass: 'severity-success',
    icon: 'fa-circle-check',
    label: 'Success',
  },
  [NotificationSeverity.WARNING]: {
    colourClass: 'severity-warning',
    icon: 'fa-triangle-exclamation',
    label: 'Warning',
  },
  [NotificationSeverity.CRITICAL]: {
    colourClass: 'severity-critical',
    icon: 'fa-circle-exclamation',
    label: 'Critical',
  },
};
