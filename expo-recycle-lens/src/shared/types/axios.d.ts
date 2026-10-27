import "axios";

declare module "axios" {
  export interface AxiosRequestConfig<D = any> {
    requiresAuth?: boolean;
    _retry?: boolean;
    _sessionAttempt?: number;
  }

  export interface InternalAxiosRequestConfig<D = any> {
    requiresAuth?: boolean;
    _retry?: boolean;
    _sessionAttempt?: number;
  }
}
