export type ContactTopic =
  'volunteer' | 'developer' | 'feedback' | 'question' | 'partnership' | 'other';

export interface ContactSubmissionRequest {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

export interface ContactSubmissionResponse {
  id: string;
  status: 'received';
  receivedAt: string;
}
