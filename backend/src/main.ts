import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  // Validate environment before starting
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // ============================================
  // SECURITY: Helmet - Secure HTTP Headers
  // ============================================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"], // eval is often needed by some PDF libraries
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'self'", "blob:"], // Allow local PDFs
        frameSrc: ["'self'", "blob:"],  // Allow local PDFs
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for PDF viewing
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // ============================================
  // SECURITY: Strict CORS Configuration
  // ============================================
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174']; // Dev defaults

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked request from: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const env = process.env.NODE_ENV || 'development';
  console.log(`🚀 Application running on port ${port} [${env.toUpperCase()}]`);

  if (env !== 'production') {
    console.log(`🔓 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  }
}
bootstrap();
