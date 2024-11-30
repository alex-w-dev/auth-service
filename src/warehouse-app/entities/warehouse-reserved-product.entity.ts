import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'warehouse-service--reserved-product',
})
export class WarehouseReservedProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'integer' })
  userId: number;

  @Column({ nullable: false, type: 'integer' })
  orderId: number;

  @Column({ nullable: false, type: 'integer' })
  productId: number;

  @Column({ default: 0, type: 'integer' })
  count: number;

  @Column({ type: 'integer' })
  cost: number;
}
