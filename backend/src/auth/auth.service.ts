import { Injectable, ConflictException, UnauthorizedException, NotFoundException, } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) { }
    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException("Пользователь с таким email уже существует");
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { email: dto.email, passwordHash, name: dto.name },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        const token = this.signToken(user.id, user.email);
        return { user, access_token: token };
    }
    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new UnauthorizedException("Неверные учётные данные");
        }
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException("Неверные учётные данные");
        }
        const token = this.signToken(user.id, user.email);
        return {
            user: { id: user.id, email: user.email, name: user.name },
            access_token: token,
        };
    }
    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException("Пользователь не найден");
        }
        const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException("Неверный текущий пароль");
        }
        const passwordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        return { success: true };
    }
    private signToken(userId: string, email: string): string {
        return this.jwt.sign({ sub: userId, email });
    }
}
