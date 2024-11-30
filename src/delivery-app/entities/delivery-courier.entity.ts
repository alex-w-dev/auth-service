import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'delivery-service--couriers',
})
export class DeliveryCourier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text' })
  name: string;
}
