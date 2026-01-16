import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        // MOCK: Allow all, inject dummy user
        const request = context.switchToHttp().getRequest();
        request.user = {
            id: 'mock-user-id',
            tenantId: 'mock-tenant-id', // Will fail DB constraint if not real UUID in prod. Use seed or create tenant first.
            role: 'TECHNICIAN'
        };
        return true;
    }
}

@Injectable()
export class RolesGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        return true; // MOCK
    }
}

export const Roles = (...roles: string[]) => (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => { };

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
