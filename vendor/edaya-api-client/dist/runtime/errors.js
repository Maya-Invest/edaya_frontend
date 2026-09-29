// @edaya/client-codegen runtime
export class ApiError extends Error {
    status;
    body;
    constructor(status, body) {
        super(`API request failed (${status})`);
        this.status = status;
        this.body = body;
        this.name = 'ApiError';
    }
}
