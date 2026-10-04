import { FleetConfiguration } from 'src/app/models/fleet.models';

/**
 * Fleet Community switched on, with the policy figures the server sends at
 * launch: for specs of anything that says them to a reader.
 */
export const FLEET_CONFIGURATION: FleetConfiguration = {
  features: {
    isEnabled: true,
    registrationEnabled: true,
    importsEnabled: true,
    chatEnabled: true,
  },
  policy: {
    chatMemberHistoryHours: 4,
    chatTranscriptHistoryDays: 7,
    customChannelLimit: 3,
    chatRetentionDays: 45,
    importSourceRetentionDays: 180,
  },
};
