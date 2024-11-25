import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'notification-service--notifications',
})
export class NotificationNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'integer' })
  userId: number;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'text' })
  text: string;
}
