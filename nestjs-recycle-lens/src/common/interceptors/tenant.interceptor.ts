import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { resolveTenant, TenantRequest } from '../types/tenant-context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    resolveTenant(context.switchToHttp().getRequest<TenantRequest>());
    return next.handle();
  }
}
