import { MIN_CHARS_PASSWORD, MIN_CHARS_USERNAME } from './forms.constants';

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
export const FORM_ERROR_FIRSTNAME_REQUIRED = `First Name is required.`;
export const FORM_ERROR_LASTNAME_REQUIRED = `Last Name is required.`;
export const FORM_ERROR_USERNAME_REQUIRED = `Username is required.`;
export const FORM_ERROR_USERNAME_MIN_LENGTH = ` Username must be at least ${MIN_CHARS_USERNAME} characters.`;
export const FORM_ERROR_USERNAME_TAKEN = `Username is already taken.`;
export const FORM_ERROR_USERNAME_PATTERN = `Username must contain only alphanumeric characters.`;
export const FORM_ERROR_EMAIL_REQUIRED = `An email address is required.`;
export const FORM_ERROR_EMAIL_ALREADY_REGISTERED = `This email address is already registered.`;
