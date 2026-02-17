export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In production, this should be hashed on backend
  firstName: string;
  lastName: string;
  mobile: string;
  photoUrl: string;
  createdAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface UserKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: Date;
}

export interface CreateUserKeyInput {
  name?: string;
}
