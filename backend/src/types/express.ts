import { Request, Response } from 'express';

export interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    errors?: any;
    timestamp?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        type: 'company' | 'employee';
        companyId: string;
        data: any;
        company?: any;
    };
    superadmin?: {
        id: string;
        email: string;
        name: string;
        role: 'SUPERADMIN';
    };
}

export type AuthenticatedResponse = Response;