import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Endpoint, CreateEndpointInput } from '../models/endpoint.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

interface EndpointResponse {
  id: string;
  name: string;
  dataPushEndpoint: string;
  authEndpoint: string;
  username: string;
  password: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class EndpointService {
  private apiUrl = environment.apiUrl;
  private allEndpointsSubject = new BehaviorSubject<Endpoint[]>([]);
  public endpoints$: Observable<Endpoint[]> = this.allEndpointsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load endpoints from backend when user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadEndpoints();
      } else {
        this.allEndpointsSubject.next([]);
      }
    });
  }

  private convertToEndpoint(response: EndpointResponse): Endpoint {
    return {
      id: response.id,
      userId: response.createdBy,
      name: response.name,
      dataPushEndpoint: response.dataPushEndpoint,
      authEndpoint: response.authEndpoint,
      username: response.username,
      password: response.password
    };
  }

  loadEndpoints(): void {
    this.http.get<EndpointResponse[]>(`${this.apiUrl}/endpoints/`).pipe(
      map(endpoints => endpoints.map(e => this.convertToEndpoint(e))),
      catchError(error => {
        console.error('Error loading endpoints:', error);
        return of([]);
      })
    ).subscribe(endpoints => {
      this.allEndpointsSubject.next(endpoints);
    });
  }

  getEndpoints(): Endpoint[] {
    return this.allEndpointsSubject.value;
  }

  getEndpointById(id: string): Endpoint | undefined {
    return this.allEndpointsSubject.value.find(ep => ep.id === id);
  }

  createEndpoint(input: CreateEndpointInput): Observable<Endpoint | null> {
    return this.http.post<EndpointResponse>(`${this.apiUrl}/endpoints/`, {
      name: input.name,
      dataPushEndpoint: input.dataPushEndpoint,
      authEndpoint: input.authEndpoint,
      username: input.username,
      password: input.password
    }).pipe(
      map(e => this.convertToEndpoint(e)),
      tap(endpoint => {
        if (endpoint) {
          const current = this.allEndpointsSubject.value;
          this.allEndpointsSubject.next([...current, endpoint]);
        }
      }),
      catchError(error => {
        console.error('Error creating endpoint:', error);
        return of(null);
      })
    );
  }

  updateEndpoint(id: string, updates: Partial<Endpoint>): void {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.dataPushEndpoint !== undefined) payload.dataPushEndpoint = updates.dataPushEndpoint;
    if (updates.authEndpoint !== undefined) payload.authEndpoint = updates.authEndpoint;
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.password !== undefined) payload.password = updates.password;

    this.http.put<EndpointResponse>(`${this.apiUrl}/endpoints/${id}`, payload).pipe(
      map(e => this.convertToEndpoint(e)),
      catchError(error => {
        console.error('Error updating endpoint:', error);
        return of(null);
      })
    ).subscribe(endpoint => {
      if (endpoint) {
        const current = this.allEndpointsSubject.value;
        const updated = current.map(e => e.id === id ? endpoint : e);
        this.allEndpointsSubject.next(updated);
      }
    });
  }

  deleteEndpoint(id: string): void {
    this.http.delete(`${this.apiUrl}/endpoints/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting endpoint:', error);
        return of(null);
      })
    ).subscribe(() => {
      const current = this.allEndpointsSubject.value;
      const filtered = current.filter(e => e.id !== id);
      this.allEndpointsSubject.next(filtered);
    });
  }
}
