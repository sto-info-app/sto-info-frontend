export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string;
  lastLogin?: Date;
  lastPasswordReset?: Date;
  isAccountDisabled?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
