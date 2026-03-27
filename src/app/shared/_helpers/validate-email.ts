import { EMAIL_PATTERN } from '../constants/regex-patterns.constants';

export function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
