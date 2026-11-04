export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthenticatedUser;
}
