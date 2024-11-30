import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'delivery-service--reserved-couriers',
})
export class DeliveryReservedCourier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'integer' })
  userId: number;

  @Column({ nullable: false, type: 'integer' })
  orderId: number;

  @Column({ nullable: false, type: 'integer' })
  courierId: number;

  @Column({ default: 0, type: 'integer' })
  time: number;
}
