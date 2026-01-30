
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

// --- Decorators ---
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

// --- Guards ---

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!roles || roles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.role) {
            console.error(`[RolesGuard] Accès refusé : utilisateur ou rôle manquant dans la requête`);
            return false;
        }

        const hasRole = roles.includes(user.role);
        if (!hasRole) {
            console.warn(`[RolesGuard] Accès refusé pour ${user.email}. Rôle requis : ${roles}, Rôle possédé : ${user.role}`);
        }

        return hasRole;
    }
}
