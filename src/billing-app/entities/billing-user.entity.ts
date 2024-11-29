import { Column, Entity } from 'typeorm';

@Entity({
  name: 'billing-service--users',
})
export class BillingUser {
  @Column({ primary: true, unique: true, nullable: false, type: 'integer' })
  userId: number;

  @Column({ type: 'integer' })
  bill: number;
}
