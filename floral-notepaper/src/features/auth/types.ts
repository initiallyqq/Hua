export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  session: boolean;
  user: {
    id: string;
    email: string | null;
  } | null;
  profile: UserProfile | null;
  loading: boolean;
}
