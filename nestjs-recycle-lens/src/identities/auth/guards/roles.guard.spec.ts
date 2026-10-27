import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

@Roles('admin')
class Restricted {
  admin(this: void) {}
  @Roles('teacher')
  teacher(this: void) {}
}
function context(role: string, handler = Restricted.prototype.admin) {
  return {
    getHandler: () => handler,
    getClass: () => Restricted,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}
describe('RolesGuard metadata', () => {
  const guard = new RolesGuard(new Reflector());
  it('denies ordinary users for class-level admin roles', () => {
    expect(() => guard.canActivate(context('user'))).toThrow(
      ForbiddenException,
    );
  });
  it('allows an administrator for class-level roles', () =>
    expect(guard.canActivate(context('admin'))).toBe(true));
  it('handler roles override class roles', () => {
    expect(
      guard.canActivate(context('teacher', Restricted.prototype.teacher)),
    ).toBe(true);
    expect(() =>
      guard.canActivate(context('admin', Restricted.prototype.teacher)),
    ).toThrow(ForbiddenException);
  });
});
