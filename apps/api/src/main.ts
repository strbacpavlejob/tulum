import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));
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
