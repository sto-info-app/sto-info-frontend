import { ContactTopic } from './models/contact-form.models';

export interface ContactTopicOption {
  value: ContactTopic;
  label: string;
}

export const CONTACT_TOPICS: ContactTopicOption[] = [
  { value: 'volunteer', label: 'Become a volunteer' },
  { value: 'developer', label: 'Become a developer' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

/**
 * Help with Fleet Communities (FC-045), offered only while the feature is
 * switched on, so the form does not advertise a feature that is not there.
 */
export const FLEET_CONTACT_TOPIC: ContactTopicOption = {
  value: 'fleet',
  label: 'Fleet Communities',
};

/**
 * The topics to offer.
 *
 * @param fleetEnabled - Whether Fleet Communities is switched on.
 * @returns Every topic, with Fleet Communities before Other while it is on.
 */
export function contactTopicsFor(
  fleetEnabled: boolean,
): readonly ContactTopicOption[] {
  if (!fleetEnabled) {
    return CONTACT_TOPICS;
  }

  return [
    ...CONTACT_TOPICS.slice(0, -1),
    FLEET_CONTACT_TOPIC,
    ...CONTACT_TOPICS.slice(-1),
  ];
}
