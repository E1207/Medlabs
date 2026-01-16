
import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
// We can define DTOs here or separately. For brevity I'll define simple classes or check if standard ones exist.
// Let's assume standard validation is wanted, I'll inline DTOs or create a file if strict.
// For now, I'll use simple Body decorators with types.

export class RequestResetDto {
    email: string;
}

export class ResetPasswordDto {
    token: string;
    newPass: string;
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('request-password-reset')
    @HttpCode(HttpStatus.OK)
    async requestPasswordReset(@Body() body: RequestResetDto) {
        return this.authService.requestPasswordReset(body.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPass);
    }
}
