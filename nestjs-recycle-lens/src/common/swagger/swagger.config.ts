import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication, port = 5005): void {
  const config = new DocumentBuilder()
    .setTitle('RecycleLens API')
    .setDescription('API của ứng dụng giáo dục phân loại rác RecycleLens')
    .setVersion('1.0')
    .addBearerAuth()
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('/', 'API trên server hiện tại')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'RecycleLens API Documentation',
  });
  console.log(`Swagger Docs: http://localhost:${port}/docs`);
}
