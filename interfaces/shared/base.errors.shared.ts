/* eslint-disable @typescript-eslint/no-explicit-any */

export class BaseError extends Error {
  constructor(
    public name: string,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = name;
  }
}
