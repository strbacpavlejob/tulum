import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const validApiKey = process.env.INTERNAL_API_KEY;
    if (!validApiKey) return true; // dev mode: skip key check

    // WebSocket context — validate via handshake
    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient<{
        handshake?: {
          auth?: Record<string, string>;
          headers?: Record<string, string>;
        };
      }>();
      const key =
        client.handshake?.auth?.apiKey ??
        client.handshake?.headers?.['x-api-key'];
      return key === validApiKey;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    return request.headers['x-api-key'] === validApiKey;
  }
}
