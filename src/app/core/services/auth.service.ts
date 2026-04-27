import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { User, TokenResponse } from '../models/user.model';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  private readonly tokenSubject = new BehaviorSubject<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );

  readonly token$ = this.tokenSubject.asObservable();

  register(payload: {
    email: string;
    password: string;
    full_name: string;
    date_of_birth: string;
    gender: string;
  }): Observable<TokenResponse> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.base}/api/auth/register`, payload)
      .pipe(map(res => res.data!), tap(data => this.persist(data)));
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.base}/api/auth/login`, { email, password })
      .pipe(map(res => res.data!), tap(data => this.persist(data)));
  }

  getMe(): Observable<User> {
    return this.http
      .get<ApiResponse<User>>(`${this.base}/api/auth/me`)
      .pipe(
        map(res => res.data!),
        tap(user => localStorage.setItem(USER_KEY, JSON.stringify(user))),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  private persist(data: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.tokenSubject.next(data.accessToken);
  }
}
