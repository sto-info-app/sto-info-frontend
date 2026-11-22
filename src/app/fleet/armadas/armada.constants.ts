import {
  ArmadaPosition,
  ArmadaRequestStatus,
} from 'src/app/models/fleet-armada.models';

/** The capability that answers requests and arranges an Armada (FC-025). */
export const ARMADA_MANAGE_CAPABILITY = 'armada.manage';

/** The capability that asks to join, and leaves, for a Fleet (FC-025). */
export const ARMADA_REQUEST_CAPABILITY = 'armada.request';

/** The longest message or reason the server keeps. */
export const ARMADA_TEXT_LIMIT = 500;

/** How each position reads as a label. */
export const ARMADA_POSITION_LABELS: Readonly<Record<ArmadaPosition, string>> =
  {
    [ArmadaPosition.ALPHA]: 'Alpha',
    [ArmadaPosition.BETA]: 'Beta',
    [ArmadaPosition.GAMMA]: 'Gamma',
  };

/** How each request status reads. */
export const ARMADA_REQUEST_STATUS_LABELS: Readonly<
  Record<ArmadaRequestStatus, string>
> = {
  [ArmadaRequestStatus.PENDING]: 'Open',
  [ArmadaRequestStatus.APPROVED]: 'Approved',
  [ArmadaRequestStatus.REJECTED]: 'Rejected',
  [ArmadaRequestStatus.WITHDRAWN]: 'Withdrawn',
  [ArmadaRequestStatus.LAPSED]: 'Lapsed',
  [ArmadaRequestStatus.CANCELLED]: 'Cancelled',
};

/** What a Fleet the reader may not see is called. */
export const HIDDEN_FLEET = 'A Fleet you cannot see';
