import { Request, Response, NextFunction } from 'express';
export interface ErrorResponse {
    success: false;
    error: string;
    message?: string;
    details?: any;
}
export interface SuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}
export type APIResponse<T> = ErrorResponse | SuccessResponse<T>;
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export declare const errorHandler: (err: Error, _req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map