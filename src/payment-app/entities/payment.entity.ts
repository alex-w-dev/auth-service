import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'payment-service--payments',
})
export class PaymentPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'integer' })
  userId: number;

  @Column({ nullable: false, type: 'integer' })
  orderId: number;

  @Column({ type: 'integer', default: 0 })
  payed: number;
}
