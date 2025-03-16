export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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
}
