import { isAxiosError } from "axios";

type ApiErrorBody = {
  message?: string | string[];
  code?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;
  data?: unknown;

  constructor(
    message: string,
    status = 500,
    code?: string,
    errors?: Record<string, string[]>,
    data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.data = data;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;

    if (error.code === "ECONNABORTED") {
      return new ApiError("Request timeout", 408, "TIMEOUT");
    }

    if (error.code === "ERR_NETWORK") {
      return new ApiError("Network error", 0, "NETWORK_ERROR");
    }

    if (typeof data === "string" && data.trim()) {
      return new ApiError(data, status);
    }

    if (data && typeof data === "object") {
      const body = data as ApiErrorBody;

      return new ApiError(
        (Array.isArray(body.message)
          ? body.message.filter((item) => typeof item === "string").join("; ")
          : body.message) ||
          error.message ||
          "Request failed",
        status,
        body.code,
        body.errors,
        data,
      );
    }

    return new ApiError(error.message || "Request failed", status);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Unexpected error");
}
