import { Module, ModuleMetadata } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/modules/auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from './common/modules/auth/guards/roles/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RabbitMqModule } from './common/modules/rabbit-mq/rabbit-mq.module';
import * as path from 'path';
import { AuthAppModule } from './auth-app/auth-app.module';
import { BillingAppModule } from './billing-app/billing-app.module';
import { OrderAppModule } from './order-app/order-app.module';
import { NotificationAppModule } from './notification-app/notification-app.module';
import { PaymentAppModule } from './payment-app/payment-app.module';
import { WarehouseAppModule } from './warehouse-app/warehouse-app.module';

const moduleMetadata: ModuleMetadata = {
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.join(__dirname, '../.env'),
        path.join(__dirname, `../.env.${process.env.APP_MODULE}`),
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        console.log(configService.get('MYSQL_PORT'));
        return {
          type: 'mysql',
          // прокинуть порт не забыть из миникуба : kubectl port-forward service/app-mysql 3306:3306
          host: configService.get('MYSQL_HOST'),
          port: configService.get('MYSQL_PORT'),
          username: configService.get('MYSQL_USERNAME'),
          password: configService.get('MYSQL_PASSWORD'),
          database: configService.get('MYSQL_DATABASE'),
          autoLoadEntities: true,
          // logging: configService.get('MYSQL_LOGGING') === 'true',
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    RabbitMqModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, //@UseGuards(JwtAuthGuard) applied on all API endppints
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
};

switch (process.env.APP_MODULE) {
  case 'auth-app':
    moduleMetadata.imports!.push(AuthAppModule);
    break;
  case 'billing-app':
    moduleMetadata.imports!.push(BillingAppModule);
    break;
  case 'order-app':
    moduleMetadata.imports!.push(OrderAppModule);
    break;
  case 'notification-app':
    moduleMetadata.imports!.push(NotificationAppModule);
    break;
  case 'payment-app':
    moduleMetadata.imports!.push(PaymentAppModule);
    break;
  case 'warehouse-app':
    moduleMetadata.imports!.push(WarehouseAppModule);
    break;
}
@Module(moduleMetadata)
export class AppModule {}
