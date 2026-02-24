class CommonResponse {
    message: string | null;
    data: any;
    errors: any[];
    error: boolean;
    code: number | null;
    constructor(message: string | null, data: any = null, errors: any[] = [], error: boolean = false, code: number | null = null) {
        this.message = message;
        this.data = data;
        this.errors = errors;
        this.error = error;
        this.code = code;
    }

    toJSON() {
        return {
            error: this.error,
            code: this.code,
            message: this.message,
            data: this.data,
            errors: this.errors
        }
    }

    static success(res: any, data: any, code = 200, message: string | null = null) {
        const statusMessage = message;
        const response = new CommonResponse(statusMessage, data, [], false, code);
        return res.status(code).json(response);
    }

    static error(res: any, code: number, errorType: any, field: string | null = null, errors: any[] = [], customMessage: string | null = null) {
        const errorMessage = customMessage;
        const response = new CommonResponse(errorMessage, null, errors, true, code);
        return res.status(code).json(response);
    }

    static created(res: any, data: any, message: string | null = null) {
        const statusMessage = message;
        const response = new CommonResponse(statusMessage, data, [], false, 201);
        return res.status(201).json(response);
    }

    static serverError(res: any, error: any, message: string | null = null) {
        const statusMessage = message;
        const response = new CommonResponse(statusMessage, null, [error], true, 500);
        return res.status(500).json(response);
    }
}

export default CommonResponse;