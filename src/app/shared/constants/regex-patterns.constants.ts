import {
  MAX_CHARS_PASSWORD,
  MAX_CHARS_USERNAME,
  MIN_CHARS_PASSWORD,
  MIN_CHARS_USERNAME,
} from './forms.constants';

export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const USERNAME_PATTERN = new RegExp(
  `^[a-zA-Z0-9]{${MIN_CHARS_USERNAME},${MAX_CHARS_USERNAME}}$`,
);

export const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\n\r\t]).{${MIN_CHARS_PASSWORD},${MAX_CHARS_PASSWORD}}$`,
);
