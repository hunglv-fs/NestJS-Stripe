import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';

export interface RequestWithUser extends Request {
  user?: any;
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      });

      const user = await this.userService.findOne(payload.sub);

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        };
      }
    } catch {
      // Token invalid, continue without user
    }

    next();
  }
}
