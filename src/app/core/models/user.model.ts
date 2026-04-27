export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}
