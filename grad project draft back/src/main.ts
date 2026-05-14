import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { hijackConsole, initSystemLogs } from './system-logs';
import { DatabaseService } from './database/database.service';

async function bootstrap() {
  hijackConsole();
  const app = await NestFactory.create(AppModule);
  
  // Enable wide-open CORS for the Election/Vite frontend
  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  
  // Explicitly listen on entirely open IPv4 (0.0.0.0) rather than default localhost.
  // This prevents the dreaded Node 18 IPv6 loopback "Failed to fetch" edge-case
  // where the frontend targets 127.0.0.1 but the backend bound to [::1].
  await app.listen(port, '0.0.0.0');

  // Initialize persistent system logs after DB is ready
  const dbService = app.get(DatabaseService);
  await initSystemLogs(dbService.pool);
  
  console.log(`Backend is running and actively listening on port ${port}...`);
}
bootstrap();
