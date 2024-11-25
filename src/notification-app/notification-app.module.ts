import { Module } from '@nestjs/common';
import { NotificationAppController } from './notification-app.controller';
import { NotificationNotification } from './entities/notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([NotificationNotification])],
  controllers: [NotificationAppController],
})
export class NotificationAppModule {}
