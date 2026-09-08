export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  /** Access token lifetime in seconds. */
  expires_in: number;
  /**
   * The user's chosen inactivity window in minutes. The session ends this long
   * after their last sign of activity, whatever the access token's own life.
   */
  session_timeout_minutes: number;
  user_id: string;
}

export interface RegistrationFormValues {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordValues {
  token: string;
  password: string;
}

export interface EditPersonalDetailsFormValues {
  firstName: string;
  lastName: string;
  username: string;
  /** Opt-in to appearing in the public Galactic Personnel Registry. */
  publiclyVisible: boolean;
}
