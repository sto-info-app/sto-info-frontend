import { MIN_CHARS_PASSWORD } from './forms.constants';

// API Response error messages
export const MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT = `Subspace frequencies are getting jammed, and we cannot connect to the server. Please try again later.`;
export const MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT = `Login error: Could not connect to the server.`;

export const MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT = `Unauthorised: Invalid email or password.`;
export const MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT = `Please verify your email before logging in. Check your inbox for the verification email.`;

// Form helper error messages
export const FORM_ERROR_PASSWORD_REQUIRED = `Password is required.`;
export const FORM_ERROR_PASSWORD_MIN_LENGTH = `Password must be at least ${MIN_CHARS_PASSWORD} characters
long.`;
export const FORM_ERROR_PASSWORD_COMPLEXITY = `Password must contain at least one number, one uppercase and
lowercase letter, one special character and be at least ${MIN_CHARS_PASSWORD} characters long.`;
export const FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED = `Confirmation password is required.`;
export const FORM_ERROR_PASSWORDS_DO_NOT_MATCH = `Passwords do not match.`;
export const FORM_ERROR_INVALID_EMAIL_FORMAT = `Invalid email format.`;
