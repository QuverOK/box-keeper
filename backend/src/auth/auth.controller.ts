import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthenticatedRequest, AuthResponse, AuthUser } from "./auth-user";
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post("register")
  register(
    @Body()
    dto: RegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.register(dto);
  }
  @Post("login")
  login(
    @Body()
    dto: LoginDto,
  ): Promise<AuthResponse> {
    return this.authService.login(dto);
  }
  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(
    @Request()
    req: AuthenticatedRequest,
  ): AuthUser {
    return req.user;
  }
  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  changePassword(
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(req.user.id, dto);
  }
}
