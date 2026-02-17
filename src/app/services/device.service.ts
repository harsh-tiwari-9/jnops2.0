import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Device, CreateDeviceInput } from '../models/device.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

interface DeviceResponse {
  id: string;
  deviceId: string;
  name: string;
  location: string;
  deviceKey: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private apiUrl = environment.apiUrl;
  private allDevicesSubject = new BehaviorSubject<Device[]>([]);
  public devices$: Observable<Device[]> = this.allDevicesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load devices from backend when user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadDevices();
      } else {
        this.allDevicesSubject.next([]);
      }
    });
  }

  private convertToDevice(response: DeviceResponse): Device {
    return {
      id: response.deviceId,
      userId: response.createdBy,
      name: response.name,
      location: response.location,
      deviceKey: response.deviceKey
    };
  }

  loadDevices(): void {
    this.http.get<DeviceResponse[]>(`${this.apiUrl}/devices/`).pipe(
      map(devices => devices.map(d => this.convertToDevice(d))),
      catchError(error => {
        console.error('Error loading devices:', error);
        return of([]);
      })
    ).subscribe(devices => {
      this.allDevicesSubject.next(devices);
    });
  }

  getDevices(): Device[] {
    return this.allDevicesSubject.value;
  }

  getDeviceById(id: string): Device | undefined {
    return this.allDevicesSubject.value.find(d => d.id === id);
  }

  // CRITICAL: Check if device ID is globally unique across ALL users
  isDeviceIdGloballyUnique(deviceId: string): boolean {
    return !this.allDevicesSubject.value.some(d => d.id === deviceId);
  }

  createDevice(input: CreateDeviceInput): Observable<Device | null> {
    return this.http.post<DeviceResponse>(`${this.apiUrl}/devices/`, {
      deviceId: input.id,
      name: input.name,
      location: input.location,
      deviceKey: input.deviceKey
    }).pipe(
      map(d => this.convertToDevice(d)),
      tap(device => {
        if (device) {
          const current = this.allDevicesSubject.value;
          this.allDevicesSubject.next([...current, device]);
        }
      }),
      catchError(error => {
        console.error('Error creating device:', error);
        return of(null);
      })
    );
  }

  updateDevice(id: string, updates: Partial<Device>): void {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.location !== undefined) payload.location = updates.location;

    this.http.put<DeviceResponse>(`${this.apiUrl}/devices/${id}`, payload).pipe(
      map(d => this.convertToDevice(d)),
      catchError(error => {
        console.error('Error updating device:', error);
        return of(null);
      })
    ).subscribe(device => {
      if (device) {
        const current = this.allDevicesSubject.value;
        const updated = current.map(d => d.id === id ? device : d);
        this.allDevicesSubject.next(updated);
      }
    });
  }

  deleteDevice(id: string): void {
    this.http.delete(`${this.apiUrl}/devices/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting device:', error);
        return of(null);
      })
    ).subscribe(() => {
      const current = this.allDevicesSubject.value;
      const filtered = current.filter(d => d.id !== id);
      this.allDevicesSubject.next(filtered);
    });
  }
}
