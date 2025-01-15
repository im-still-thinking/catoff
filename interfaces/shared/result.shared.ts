export class Result<T> {
    public readonly success: boolean;
    public readonly data?: T;
    public readonly error?: string;
    public readonly status: number;

    private constructor(
        success: boolean,
        data?: T,
        error?: string,
        status: number = 200,
    ) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.status = status;
    }

    static ok<U>(data?: U, status: number = 200): Result<U> {
        return new Result<U>(true, data, undefined, status);
    }

    static fail<U>(error: string, status: number = 400): Result<U> {
        return new Result<U>(false, undefined, error, status);
    }
}
