import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'warehouse-service--product',
})
export class WarehouseProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text' })
  name: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @Column({ nullable: false, type: 'integer' })
  cost: number;

  @Column({ nullable: false, type: 'integer' })
  count: number;
}
