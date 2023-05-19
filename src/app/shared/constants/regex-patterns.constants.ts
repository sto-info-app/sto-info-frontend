import { MIN_CHARS_PASSWORD } from './forms.constants';

export const EMAIL_PATTERN =
  // eslint-disable-next-line no-useless-escape
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const USERNAME_PATTERN = '^[a-zA-Z0-9]*$';

export const PASSWORD_PATTERN =
  '^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\n\r\t]).{' +
  MIN_CHARS_PASSWORD +
  ',}$';
