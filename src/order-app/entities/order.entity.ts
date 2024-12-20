import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({
  name: 'order-service--orders',
})
export class OrderOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  createdAtUnixTime: number;

  @Column({ nullable: false, type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  cost: number;

  @Column({ type: 'tinyint', default: 0 })
  payed: number;

  @Column({ type: 'integer', default: 0 })
  courierId: number;

  @Column({ type: 'tinyint', default: 0 })
  closed: number;

  @Column({ type: 'tinyint', default: 0 })
  delivered: number;

  @Column({ type: 'text', update: false })
  jsonData: string;
}
