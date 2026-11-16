import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { createHash, timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC } from './public.decorator';

/**
 * Global guard: every REST route and GraphQL operation needs an admin API key,
 * unless it is marked @Public(). Keys come from ADMIN_API_KEYS (comma-separated, for rotation).
 * With no keys configured, every admin call is refused.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  private readonly keyDigests: Buffer[];

  constructor(private readonly reflector: Reflector) {
    this.keyDigests = (process.env.ADMIN_API_KEYS ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .map(digest);
    if (this.keyDigests.length === 0) {
      new Logger(AdminKeyGuard.name).warn(
        'ADMIN_API_KEYS is not set: all admin operations are refused',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const header: string | undefined = request?.headers?.authorization;
    const key = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';

    // Compare fixed-length digests in constant time, and check every key.
    const candidate = digest(key);
    const valid =
      key.length > 0 &&
      this.keyDigests.reduce(
        (ok, d) => timingSafeEqual(d, candidate) || ok,
        false,
      );
    if (!valid) throw new UnauthorizedException('An admin API key is required');
    return true;
  }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
