import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ThemeService, Theme } from './services/theme.service';
import { PipelineService } from './services/pipeline.service';
import { EndpointService } from './services/endpoint.service';
import { DeviceService } from './services/device.service';
import { AuthService } from './services/auth.service';
import { Pipeline } from './models/pipeline.model';
import { Endpoint } from './models/endpoint.model';
import { Device } from './models/device.model';
import { User } from './models/user.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  Math = Math; // Expose Math for template use

  // Authentication
  currentUser$!: Observable<User | null>;

  theme$!: Observable<Theme>;
  pipelines$!: Observable<Pipeline[]>;
  endpoints$!: Observable<Endpoint[]>;
  devices$!: Observable<Device[]>;

  selectedPipelineId: string | null = null;
  selectedPipeline: Pipeline | null = null;

  // Mobile menu state
  isMobileSidebarOpen = false;

  // Modal states
  showCreateEndpoint = false;
  showCreateDevice = false;
  showEditEndpoint = false;
  showEditDevice = false;
  showMoveDevice = false;

  // Forms
  endpointForm!: FormGroup;
  deviceForm!: FormGroup;

  // Edit tracking
  editingEndpointId: string | null = null;
  editingDeviceId: string | null = null;
  movingDeviceId: string | null = null;
  targetPipelineId: string | null = null;

  // Auto-generated values
  generatedDeviceId = '';
  generatedDeviceKey = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  itemsPerPageOptions = [10, 25, 50, 100];

  constructor(
    public themeService: ThemeService,
    private pipelineService: PipelineService,
    private endpointService: EndpointService,
    private deviceService: DeviceService,
    private authService: AuthService,
    private fb: FormBuilder,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Authentication
    this.currentUser$ = this.authService.currentUser$;

    this.theme$ = this.themeService.theme$;
    this.pipelines$ = this.pipelineService.pipelines$;
    this.endpoints$ = this.endpointService.endpoints$;
    this.devices$ = this.deviceService.devices$;

    // Initialize forms
    this.initializeForms();

    // Auto-select first pipeline when user logs in
    this.currentUser$.subscribe(user => {
      if (user) {
        const pipelines = this.pipelineService.getPipelines();
        console.log('Loaded pipelines:', pipelines);
        console.log('Loaded endpoints:', this.endpointService.getEndpoints());
        console.log('Loaded devices:', this.deviceService.getDevices());

        if (pipelines.length > 0) {
          this.selectPipeline(pipelines[0].id);
          console.log('Selected pipeline:', this.selectedPipeline);
        }
      } else {
        // Reset selection when user logs out
        this.selectedPipelineId = null;
        this.selectedPipeline = null;
      }
    });
  }

  initializeForms(): void {
    this.endpointForm = this.fb.group({
      name: ['', Validators.required],
      dataPushEndpoint: ['', [Validators.required, Validators.pattern('https?://.+')]],
      authEndpoint: ['', [Validators.required, Validators.pattern('https?://.+')]],
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.deviceForm = this.fb.group({
      id: [{value: '', disabled: true}],
      name: [''],
      location: [''],
      deviceKey: [{value: '', disabled: true}]
    });
  }

  selectPipeline(id: string): void {
    this.selectedPipelineId = id;
    this.selectedPipeline = this.pipelineService.getPipelineById(id) || null;
    this.currentPage = 1; // Reset to first page when selecting a new pipeline
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  getEndpointsForPipeline(): Endpoint[] {
    if (!this.selectedPipeline) return [];
    return this.selectedPipeline.endpoints
      .map(id => this.endpointService.getEndpointById(id))
      .filter(ep => ep !== undefined) as Endpoint[];
  }

  getDevicesForPipeline(): Device[] {
    if (!this.selectedPipeline) return [];
    return this.selectedPipeline.devices
      .map(id => this.deviceService.getDeviceById(id))
      .filter(device => device !== undefined) as Device[];
  }

  getPaginatedDevices(): Device[] {
    const devices = this.getDevicesForPipeline();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return devices.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    const devices = this.getDevicesForPipeline();
    return Math.ceil(devices.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  onItemsPerPageChange(value: string): void {
    this.itemsPerPage = parseInt(value, 10);
    this.currentPage = 1; // Reset to first page when changing items per page
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  getObfuscatedKey(key: string): string {
    return `***${key.slice(-4)}`;
  }

  canAddMoreEndpoints(): boolean {
    return this.selectedPipeline ? this.selectedPipeline.endpoints.length < 4 : false;
  }

  generateDeviceId(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `IOT-DEV-${timestamp}`;
  }

  generateDeviceKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'device-';
    for (let i = 0; i < 20; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  openCreateEndpointModal(): void {
    this.endpointForm.reset();
    this.showCreateEndpoint = true;
  }

  closeCreateEndpointModal(): void {
    this.showCreateEndpoint = false;
    this.endpointForm.reset();
  }

  createAndAddEndpoint(): void {
    if (!this.selectedPipelineId || !this.endpointForm.valid) return;

    const pipeline = this.pipelineService.getPipelineById(this.selectedPipelineId);
    if (!pipeline) return;

    // Check max 4 endpoints
    if (pipeline.endpoints.length >= 4) {
      alert('Cannot add endpoint. Maximum 4 endpoints per pipeline.');
      return;
    }

    // Create the endpoint and add to pipeline when creation completes
    this.endpointService.createEndpoint(this.endpointForm.value).subscribe(endpoint => {
      if (endpoint) {
        // Add endpoint to pipeline
        const success = this.pipelineService.addEndpointToPipeline(this.selectedPipelineId!, endpoint.id);
        if (success) {
          // Refresh selected pipeline
          this.selectedPipeline = this.pipelineService.getPipelineById(this.selectedPipelineId!) || null;
          this.closeCreateEndpointModal();
        } else {
          alert('Cannot add endpoint. Maximum 4 endpoints per pipeline.');
        }
      } else {
        alert('Failed to create endpoint');
      }
    });
  }

  openCreateDeviceModal(): void {
    // Generate new ID and key
    this.generatedDeviceId = this.generateDeviceId();
    this.generatedDeviceKey = this.generateDeviceKey();

    // Set form values
    this.deviceForm.patchValue({
      id: this.generatedDeviceId,
      deviceKey: this.generatedDeviceKey
    });
    this.deviceForm.get('name')?.reset();
    this.deviceForm.get('location')?.reset();

    this.showCreateDevice = true;
  }

  closeCreateDeviceModal(): void {
    this.showCreateDevice = false;
    this.deviceForm.reset();
  }

  createAndAddDevice(): void {
    if (!this.selectedPipelineId) return;

    // Get form values (including disabled fields)
    const deviceData = {
      id: this.generatedDeviceId,
      name: this.deviceForm.get('name')?.value || '',
      location: this.deviceForm.get('location')?.value || '',
      deviceKey: this.generatedDeviceKey
    };

    // Create the device and add to pipeline when creation completes
    this.deviceService.createDevice(deviceData).subscribe(device => {
      if (device) {
        // Add device to pipeline
        const success = this.pipelineService.addDeviceToPipeline(this.selectedPipelineId!, device.id);
        if (success) {
          // Refresh selected pipeline
          this.selectedPipeline = this.pipelineService.getPipelineById(this.selectedPipelineId!) || null;
          this.closeCreateDeviceModal();
        } else {
          alert('Cannot add device. Device is already assigned to another pipeline.');
        }
      } else {
        alert('Failed to create device');
      }
    });
  }

  // Edit Endpoint
  openEditEndpointModal(endpoint: Endpoint): void {
    this.editingEndpointId = endpoint.id;
    this.endpointForm.patchValue({
      name: endpoint.name,
      dataPushEndpoint: endpoint.dataPushEndpoint,
      authEndpoint: endpoint.authEndpoint,
      username: endpoint.username,
      password: endpoint.password
    });
    this.showEditEndpoint = true;
  }

  closeEditEndpointModal(): void {
    this.showEditEndpoint = false;
    this.editingEndpointId = null;
    this.endpointForm.reset();
  }

  updateEndpoint(): void {
    if (!this.editingEndpointId || !this.endpointForm.valid) return;

    this.endpointService.updateEndpoint(this.editingEndpointId, this.endpointForm.value);
    this.closeEditEndpointModal();
  }

  // Delete Endpoint
  deleteEndpoint(endpointId: string): void {
    if (!this.selectedPipelineId) return;

    if (confirm('Are you sure you want to remove this endpoint from the pipeline?')) {
      this.pipelineService.removeEndpointFromPipeline(this.selectedPipelineId, endpointId);
      this.selectedPipeline = this.pipelineService.getPipelineById(this.selectedPipelineId) || null;
    }
  }

  // Edit Device
  openEditDeviceModal(device: Device): void {
    this.editingDeviceId = device.id;
    this.deviceForm.patchValue({
      id: device.id,
      name: device.name,
      location: device.location,
      deviceKey: device.deviceKey
    });
    this.showEditDevice = true;
  }

  closeEditDeviceModal(): void {
    this.showEditDevice = false;
    this.editingDeviceId = null;
    this.deviceForm.reset();
  }

  updateDevice(): void {
    if (!this.editingDeviceId) return;

    // Only update name and location (ID and key are immutable)
    const updates = {
      name: this.deviceForm.get('name')?.value || '',
      location: this.deviceForm.get('location')?.value || ''
    };

    this.deviceService.updateDevice(this.editingDeviceId, updates);
    this.closeEditDeviceModal();
  }

  // Delete Device
  deleteDevice(deviceId: string): void {
    if (!this.selectedPipelineId) return;

    if (confirm('Are you sure you want to remove this device from the pipeline?')) {
      this.pipelineService.removeDeviceFromPipeline(this.selectedPipelineId, deviceId);
      this.selectedPipeline = this.pipelineService.getPipelineById(this.selectedPipelineId) || null;

      // Reset to page 1 if current page is now empty
      const totalPages = this.getTotalPages();
      if (this.currentPage > totalPages && totalPages > 0) {
        this.currentPage = totalPages;
      }
    }
  }

  // Toggle Pipeline Status
  togglePipelineStatus(): void {
    if (!this.selectedPipeline || !this.selectedPipelineId) return;

    const newStatus = this.selectedPipeline.status === 'active' ? 'inactive' : 'active';
    this.pipelineService.updatePipeline(this.selectedPipelineId, { status: newStatus });
    this.selectedPipeline = this.pipelineService.getPipelineById(this.selectedPipelineId) || null;
  }

  // Delete Pipeline
  deletePipeline(): void {
    if (!this.selectedPipelineId || !this.selectedPipeline) return;

    // Check if pipeline has devices
    if (this.selectedPipeline.devices && this.selectedPipeline.devices.length > 0) {
      alert(`Cannot delete pipeline. Please remove all ${this.selectedPipeline.devices.length} device(s) from the pipeline before deletion.`);
      return;
    }

    const pipelineName = this.selectedPipeline.name;
    if (confirm(`Are you sure you want to delete the pipeline "${pipelineName}"? This action cannot be undone.`)) {
      this.pipelineService.deletePipeline(this.selectedPipelineId);

      // Select first available pipeline or clear selection
      const pipelines = this.pipelineService.getPipelines();
      if (pipelines.length > 0) {
        this.selectPipeline(pipelines[0].id);
      } else {
        this.selectedPipelineId = null;
        this.selectedPipeline = null;
      }
    }
  }

  // Move Device
  openMoveDeviceModal(deviceId: string): void {
    this.movingDeviceId = deviceId;
    this.targetPipelineId = null;
    this.showMoveDevice = true;
  }

  closeMoveDeviceModal(): void {
    this.showMoveDevice = false;
    this.movingDeviceId = null;
    this.targetPipelineId = null;
  }

  getOtherPipelines(): Pipeline[] {
    return this.pipelineService.getPipelines()
      .filter(p => p.id !== this.selectedPipelineId);
  }

  moveDeviceToAnotherPipeline(): void {
    if (!this.movingDeviceId || !this.targetPipelineId || !this.selectedPipelineId) return;

    // Remove device from current pipeline
    this.pipelineService.removeDeviceFromPipeline(this.selectedPipelineId, this.movingDeviceId);

    // Add device to target pipeline
    const success = this.pipelineService.addDeviceToPipeline(this.targetPipelineId, this.movingDeviceId);

    if (success) {
      // Refresh selected pipeline
      this.selectedPipeline = this.pipelineService.getPipelineById(this.selectedPipelineId) || null;

      // Reset pagination if needed
      const totalPages = this.getTotalPages();
      if (this.currentPage > totalPages && totalPages > 0) {
        this.currentPage = totalPages;
      }

      this.closeMoveDeviceModal();
    } else {
      alert('Failed to move device to the selected pipeline.');
    }
  }

  // Authentication
  logout(): void {
    this.authService.logout();
  }

  // Routing
  isOnDashboard(): boolean {
    return this.router.url === '/' || !this.router.url.startsWith('/profile');
  }

  // Mobile menu
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }
}
