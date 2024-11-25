import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'order-service--orders',
})
export class OrderOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  cost: number;

  @Column({ type: 'tinyint', default: 0 })
  payed: number;

  @Column({ type: 'tinyint', default: 0 })
  closed: number;
}
