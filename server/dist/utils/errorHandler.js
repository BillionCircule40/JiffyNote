"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, _req, res, _next) => {
    console.error('Error:', err.message);
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            message: err.message
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map