export interface Endpoint {
  id: string;
  userId: string;      // Owner of the endpoint
  name: string;
  dataPushEndpoint: string;
  authEndpoint: string;
  username: string;
  password: string;
}

export interface CreateEndpointInput {
  name: string;
  dataPushEndpoint: string;
  authEndpoint: string;
  username: string;
  password: string;
}

export interface UpdateEndpointInput {
  name?: string;
  dataPushEndpoint?: string;
  authEndpoint?: string;
  username?: string;
  password?: string;
}
