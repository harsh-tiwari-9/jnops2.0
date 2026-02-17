import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterInput, UserKey, CreateUserKeyInput } from '../models/user.model';
import { environment } from '../../environments/environment';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  apiKeys: Array<{
    id: string;
    keyId: string;
    name: string;
    createdAt: string;
    lastUsed: string | null;
    isActive: boolean;
  }>;
}

interface ApiKeyResponse {
  id: string;
  keyId: string;
  keyValue: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkStoredSession();
  }

  private checkStoredSession(): void {
    const token = localStorage.getItem('jnops-auth-token');
    const storedUser = localStorage.getItem('jnops-current-user');

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        // Refresh user data from backend
        this.getCurrentUserProfile().subscribe();
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: LoginCredentials): Observable<{ success: boolean; message?: string; user?: User }> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      email: credentials.username,
      password: credentials.password
    }).pipe(
      switchMap(response => {
        // Store token
        localStorage.setItem('jnops-auth-token', response.access_token);
        
        // Fetch user profile after login
        return this.getCurrentUserProfile().pipe(
          map(user => ({ success: true, user: user || undefined }))
        );
      }),
      catchError(error => {
        console.error('Login error:', error);
        return of({ success: false, message: error.error?.detail || 'Invalid username or password' });
      })
    );
  }

  register(input: RegisterInput): Observable<{ success: boolean; message?: string; user?: User }> {
    return this.http.post<UserResponse>(`${this.apiUrl}/auth/register`, {
      email: input.email,
      password: input.password,
      fullName: input.username,
      role: 'user'
    }).pipe(
      switchMap(() => {
        // Auto-login after registration
        return this.login({ username: input.email, password: input.password });
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return of({ success: false, message: error.error?.detail || 'Registration failed' });
      })
    );
  }

  getCurrentUserProfile(): Observable<User | null> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/users/profile`).pipe(
      tap(profile => {
        const user: User = {
          id: profile.id,
          username: profile.fullName,
          email: profile.email,
          firstName: profile.fullName.split(' ')[0] || profile.fullName,
          lastName: profile.fullName.split(' ').slice(1).join(' ') || '',
          mobile: '',
          photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=0033A0&color=fff&size=128`,
          createdAt: new Date(profile.createdAt),
          password: ''
        };

        this.currentUserSubject.next(user);
        localStorage.setItem('jnops-current-user', JSON.stringify(user));
      }),
      map(() => this.currentUserSubject.value),
      catchError(error => {
        console.error('Get profile error:', error);
        return of(null);
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('jnops-auth-token');
    localStorage.removeItem('jnops-current-user');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null && !!localStorage.getItem('jnops-auth-token');
  }

  getCurrentUserId(): string | null {
    return this.currentUserSubject.value?.id || null;
  }

  updateUserPhoto(photoUrl: string): { success: boolean; message?: string } {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser = { ...currentUser, photoUrl };
      this.currentUserSubject.next(updatedUser);
      localStorage.setItem('jnops-current-user', JSON.stringify(updatedUser));
      return { success: true };
    }
    return { success: false, message: 'User not authenticated' };
  }

  // User Keys Management (returns Observable now)
  getUserKeys(): UserKey[] {
    // This is synchronous wrapper - actual data fetched in components
    return [];
  }

  getUserKeysAsync(): Observable<UserKey[]> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/users/profile`).pipe(
      map(profile => {
        return profile.apiKeys.map(key => ({
          id: key.id,
          userId: profile.id,
          name: key.name,
          key: key.keyId,
          createdAt: new Date(key.createdAt)
        }));
      }),
      catchError(error => {
        console.error('Get keys error:', error);
        return of([]);
      })
    );
  }

  createUserKey(input: CreateUserKeyInput): { success: boolean; message?: string; key?: UserKey } {
    // Synchronous wrapper - actual implementation needs to be async
    return { success: false, message: 'Use createUserKeyAsync instead' };
  }

  createUserKeyAsync(input: CreateUserKeyInput): Observable<{ success: boolean; message?: string; key?: UserKey }> {
    return this.http.post<ApiKeyResponse>(`${this.apiUrl}/users/api-keys`, {
      name: input.name || 'New API Key'
    }).pipe(
      map(response => {
        const key: UserKey = {
          id: response.id,
          userId: this.getCurrentUserId() || '',
          name: response.name,
          key: response.keyValue,
          createdAt: new Date(response.createdAt)
        };
        return { success: true, key };
      }),
      catchError(error => {
        console.error('Create key error:', error);
        return of({ success: false, message: error.error?.detail || 'Failed to create API key' });
      })
    );
  }

  updateUserKeyName(keyId: string, name: string): { success: boolean; message?: string } {
    return { success: true };
  }

  deleteUserKey(keyId: string): { success: boolean; message?: string } {
    // Synchronous wrapper - actual implementation needs to be async
    return { success: false, message: 'Use deleteUserKeyAsync instead' };
  }

  deleteUserKeyAsync(keyId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete(`${this.apiUrl}/users/api-keys/${keyId}`).pipe(
      map(() => ({ success: true })),
      catchError(error => {
        console.error('Delete key error:', error);
        return of({ success: false, message: error.error?.detail || 'Failed to delete API key' });
      })
    );
  }
}
