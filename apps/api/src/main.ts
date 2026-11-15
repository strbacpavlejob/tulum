// Must stay the first import: Sentry starts before Nest loads.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './chats/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Shares socket rooms across instances through Redis when it's there.
  const socketAdapter = new RedisIoAdapter(app);
  await socketAdapter.connectToRedis();
  app.useWebSocketAdapter(socketAdapter);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const normalizeOrigin = (value: string) => value.replace(/\/$/, '');

  const allowedOrigins = new Set(
    [
      process.env.HOST_URL,
      process.env.MOBILE_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mobile.tulum-app.com',
      'https://tulum-app.com',
    ]
      .filter((origin): origin is string => Boolean(origin))
      .map(normalizeOrigin),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(normalizeOrigin(origin)))
        return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Tulum API')
    .setDescription('Tulum API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Clerk session token',
      },
      'clerk-jwt',
    )
    .addSecurityRequirements('clerk-jwt')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
