import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, UserKey, CreateUserKeyInput } from '../../models/user.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  currentUser: User | null = null;
  userKeys: UserKey[] = [];
  showAddKeyModal = false;
  showEditKeyModal = false;
  editingKeyId: string | null = null;
  editingKeyName = '';
  newKeyName = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/']);
      return;
    }
    this.loadUserKeys();
  }

  loadUserKeys(): void {
    this.authService.getUserKeysAsync().subscribe(keys => {
      this.userKeys = keys;
    });
  }

  canAddMoreKeys(): boolean {
    return this.userKeys.length < 5;
  }

  openAddKeyModal(): void {
    this.newKeyName = '';
    this.showAddKeyModal = true;
  }

  closeAddKeyModal(): void {
    this.showAddKeyModal = false;
    this.newKeyName = '';
  }

  addKey(): void {
    const input: CreateUserKeyInput = {
      name: this.newKeyName.trim() || undefined
    };

    this.authService.createUserKeyAsync(input).subscribe(result => {
      if (result.success) {
        this.loadUserKeys();
        this.closeAddKeyModal();
      } else {
        alert(result.message || 'Failed to create key');
      }
    });
  }

  openEditKeyModal(key: UserKey): void {
    this.editingKeyId = key.id;
    this.editingKeyName = key.name;
    this.showEditKeyModal = true;
  }

  closeEditKeyModal(): void {
    this.showEditKeyModal = false;
    this.editingKeyId = null;
    this.editingKeyName = '';
  }

  updateKeyName(): void {
    if (!this.editingKeyId) return;

    const result = this.authService.updateUserKeyName(this.editingKeyId, this.editingKeyName.trim());
    if (result.success) {
      this.loadUserKeys();
      this.closeEditKeyModal();
    } else {
      alert(result.message || 'Failed to update key name');
    }
  }

  canDeleteKey(): boolean {
    return this.userKeys.length > 1;
  }

  deleteKey(keyId: string): void {
    if (!this.canDeleteKey()) {
      alert('You must have at least one API key. Cannot delete the last key.');
      return;
    }

    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) {
      return;
    }

    this.authService.deleteUserKeyAsync(keyId).subscribe(result => {
      if (result.success) {
        this.loadUserKeys();
      } else {
        alert(result.message || 'Failed to delete key');
      }
    });
  }

  downloadKey(key: UserKey): void {
    // Create filename: use keyname.key if named, otherwise key{serial}.key
    const serialNumber = this.userKeys.indexOf(key) + 1;
    const filename = key.name && key.name !== `Key ${serialNumber}`
      ? `${key.name.replace(/[^a-zA-Z0-9]/g, '_')}.key`
      : `key${serialNumber}.key`;

    // Create blob with key content
    const blob = new Blob([key.key], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getObfuscatedKey(key: string): string {
    if (key.length <= 4) return key;
    return `${'*'.repeat(key.length - 4)}${key.slice(-4)}`;
  }

  onPhotoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const photoUrl = e.target?.result as string;
      const result = this.authService.updateUserPhoto(photoUrl);

      if (result.success) {
        // Update local currentUser reference
        this.currentUser = this.authService.getCurrentUser();
      } else {
        alert(result.message || 'Failed to update photo');
      }
    };

    reader.onerror = () => {
      alert('Failed to read the image file');
    };

    reader.readAsDataURL(file);
  }

  triggerPhotoUpload(): void {
    const fileInput = document.getElementById('photoUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
}
