export interface Device {
  id: string;          // e.g., "IOT-DEV-001" - GLOBALLY UNIQUE across all users
  userId: string;      // Owner of the device
  name: string;
  location: string;
  deviceKey: string;   // Auto-generated unique key
}

export interface CreateDeviceInput {
  id: string;          // Pre-generated in form
  name: string;
  location: string;
  deviceKey: string;   // Pre-generated in form
}

export interface UpdateDeviceInput {
  name?: string;
  location?: string;
}
