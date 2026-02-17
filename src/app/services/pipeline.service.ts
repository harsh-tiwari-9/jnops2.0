import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Pipeline, CreatePipelineInput } from '../models/pipeline.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

interface PipelineResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  endpoints: string[];
  devices: string[];
  executionMode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PipelineService {
  private apiUrl = environment.apiUrl;
  private allPipelinesSubject = new BehaviorSubject<Pipeline[]>([]);
  public pipelines$: Observable<Pipeline[]> = this.allPipelinesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load pipelines from backend when user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadPipelines();
      } else {
        this.allPipelinesSubject.next([]);
      }
    });
  }

  private convertToPipeline(response: PipelineResponse): Pipeline {
    return {
      id: response.id,
      userId: response.createdBy,
      name: response.name,
      description: response.description,
      status: response.status as 'active' | 'inactive',
      endpoints: response.endpoints,
      devices: response.devices,
      executionMode: response.executionMode as 'streaming' | 'batch' | 'manual'
    };
  }

  loadPipelines(): void {
    this.http.get<PipelineResponse[]>(`${this.apiUrl}/pipelines/`).pipe(
      map(pipelines => pipelines.map(p => this.convertToPipeline(p))),
      catchError(error => {
        console.error('Error loading pipelines:', error);
        return of([]);
      })
    ).subscribe(pipelines => {
      this.allPipelinesSubject.next(pipelines);
    });
  }

  getPipelines(): Pipeline[] {
    return this.allPipelinesSubject.value;
  }

  getPipelineById(id: string): Pipeline | undefined {
    return this.allPipelinesSubject.value.find(p => p.id === id);
  }

  createPipeline(input: CreatePipelineInput): void {
    this.http.post<PipelineResponse>(`${this.apiUrl}/pipelines/`, {
      name: input.name,
      description: input.description,
      executionMode: input.executionMode
    }).pipe(
      map(p => this.convertToPipeline(p)),
      catchError(error => {
        console.error('Error creating pipeline:', error);
        return of(null);
      })
    ).subscribe(pipeline => {
      if (pipeline) {
        const current = this.allPipelinesSubject.value;
        this.allPipelinesSubject.next([...current, pipeline]);
      }
    });
  }

  updatePipeline(id: string, updates: Partial<Pipeline>): void {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.executionMode !== undefined) payload.executionMode = updates.executionMode;

    this.http.put<PipelineResponse>(`${this.apiUrl}/pipelines/${id}`, payload).pipe(
      map(p => this.convertToPipeline(p)),
      catchError(error => {
        console.error('Error updating pipeline:', error);
        return of(null);
      })
    ).subscribe(pipeline => {
      if (pipeline) {
        const current = this.allPipelinesSubject.value;
        const updated = current.map(p => p.id === id ? pipeline : p);
        this.allPipelinesSubject.next(updated);
      }
    });
  }

  deletePipeline(id: string): void {
    this.http.delete(`${this.apiUrl}/pipelines/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting pipeline:', error);
        return of(null);
      })
    ).subscribe(() => {
      const current = this.allPipelinesSubject.value;
      const filtered = current.filter(p => p.id !== id);
      this.allPipelinesSubject.next(filtered);
    });
  }

  // Endpoint management
  addEndpointToPipeline(pipelineId: string, endpointId: string): boolean {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) return false;

    if (pipeline.endpoints.length >= 4) {
      return false; // Max 4 endpoints
    }

    if (pipeline.endpoints.includes(endpointId)) {
      return false; // Already added
    }

    // Call backend API
    this.http.post<PipelineResponse>(`${this.apiUrl}/pipelines/${pipelineId}/endpoints/${endpointId}`, {}).pipe(
      map(p => this.convertToPipeline(p)),
      catchError(error => {
        console.error('Error adding endpoint:', error);
        return of(null);
      })
    ).subscribe(updatedPipeline => {
      if (updatedPipeline) {
        const current = this.allPipelinesSubject.value;
        const updated = current.map(p => p.id === pipelineId ? updatedPipeline : p);
        this.allPipelinesSubject.next(updated);
      }
    });

    return true;
  }

  removeEndpointFromPipeline(pipelineId: string, endpointId: string): void {
    this.http.delete<PipelineResponse>(`${this.apiUrl}/pipelines/${pipelineId}/endpoints/${endpointId}`).pipe(
      map(p => this.convertToPipeline(p)),
      catchError(error => {
        console.error('Error removing endpoint:', error);
        return of(null);
      })
    ).subscribe(updatedPipeline => {
      if (updatedPipeline) {
        const current = this.allPipelinesSubject.value;
        const updated = current.map(p => p.id === pipelineId ? updatedPipeline : p);
        this.allPipelinesSubject.next(updated);
      }
    });
  }

  // Device management
  addDeviceToPipeline(pipelineId: string, deviceId: string): boolean {
    const pipeline = this.getPipelineById(pipelineId);
    if (!pipeline) return false;

    if (pipeline.devices.includes(deviceId)) {
      return false; // Already added
    }

    // Call backend API
    this.http.post<PipelineResponse>(`${this.apiUrl}/pipelines/${pipelineId}/devices/${deviceId}`, {}).pipe(
      map(p => this.convertToPipeline(p)),
      catchError(error => {
        console.error('Error adding device:', error);
        return of(null);
      })
    ).subscribe(updatedPipeline => {
      if (updatedPipeline) {
        const current = this.allPipelinesSubject.value;
        const updated = current.map(p => p.id === pipelineId ? updatedPipeline : p);
        this.allPipelinesSubject.next(updated);
      }
    });

    return true;
  }

  removeDeviceFromPipeline(pipelineId: string, deviceId: string): void {
    this.http.delete<PipelineResponse>(`${this.apiUrl}/pipelines/${pipelineId}/devices/${deviceId}`).pipe(
      map(p => this.convertToPipeline(p)),
      catchError(error => {
        console.error('Error removing device:', error);
        return of(null);
      })
    ).subscribe(updatedPipeline => {
      if (updatedPipeline) {
        const current = this.allPipelinesSubject.value;
        const updated = current.map(p => p.id === pipelineId ? updatedPipeline : p);
        this.allPipelinesSubject.next(updated);
      }
    });
  }

  // Get all used device IDs across all pipelines
  getUsedDeviceIds(): string[] {
    return this.allPipelinesSubject.value.flatMap(p => p.devices);
  }
}
