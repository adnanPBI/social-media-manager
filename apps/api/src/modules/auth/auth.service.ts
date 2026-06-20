import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
    });

    await this.prisma.workspace.create({
      data: {
        name: `${dto.name}'s Workspace`,
        ownerId: user.id,
      },
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { workspaces: true } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');
    return this.issueToken(user, user.workspaces[0]?.id || 'demo-workspace');
  }

  private issueToken(user: { id: string; email: string; name: string; role: string }, workspaceId?: string) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, workspaceId });
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId,
      },
    };
  }
}
