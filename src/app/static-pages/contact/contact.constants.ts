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
