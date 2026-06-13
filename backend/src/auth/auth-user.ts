import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface AuthUserPublic {
  id: string;
  email: string;
  name: string | null;
  createdAt?: Date;
}

export interface AuthResponse {
  user: AuthUserPublic;
  access_token: string;
}
