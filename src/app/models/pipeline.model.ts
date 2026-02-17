export type ExecutionMode = 'streaming' | 'batch' | 'manual';
export type PipelineStatus = 'active' | 'inactive';

export interface Pipeline {
  id: string;
  userId: string;       // Owner of the pipeline
  name: string;
  description: string;
  status: PipelineStatus;
  endpoints: string[];  // Array of endpoint IDs
  devices: string[];    // Array of device IDs
  executionMode: ExecutionMode;
}

export interface CreatePipelineInput {
  name: string;
  description: string;
  executionMode: ExecutionMode;
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  status?: PipelineStatus;
  executionMode?: ExecutionMode;
}
