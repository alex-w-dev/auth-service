import { Column, Entity } from 'typeorm';

@Entity({
  name: 'billing-service--transactions',
})
export class BillingTransaction {
  @Column({ primary: true, unique: true, nullable: false, type: 'integer' })
  orderId: number;

  @Column({ type: 'integer' })
  payedCost: number;

  @Column({ type: 'integer', default: 0 })
  compensated: number;
}
