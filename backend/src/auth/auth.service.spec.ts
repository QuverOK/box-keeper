import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const hashedPassword = bcrypt.hashSync("correct-password", 10);

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Тест",
  passwordHash: hashedPassword,
  createdAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn().mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      createdAt: mockUser.createdAt,
    }),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("registers a new user and returns token", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const result = await service.register({
        email: "new@example.com",
        password: "password123",
        name: "Новый",
      });
      expect(result.access_token).toBe("mock-jwt-token");
      expect(result.user.email).toBe(mockUser.email);
    });

    it("throws ConflictException when email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          name: "Тест",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("returns token on successful login", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const result = await service.login({
        email: "test@example.com",
        password: "correct-password",
      });
      expect(result.access_token).toBe("mock-jwt-token");
    });

    it("throws UnauthorizedException when email does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.login({ email: "ghost@example.com", password: "any" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password is wrong", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      await expect(
        service.login({
          email: "test@example.com",
          password: "wrong-password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
