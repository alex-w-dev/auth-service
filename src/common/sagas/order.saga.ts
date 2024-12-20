import { MakeOrderDto } from '../../order-app/dto/make-order.dto';
import { OrderOrder } from '../../order-app/entities/order.entity';
import { PaymentPayment } from '../../payment-app/entities/payment.entity';

export const OrderSaga = {
  order: { orderCreated: 'order--order-created' },
  billing: {
    paymentPayed: 'billing--payment-payed',
    paymentRejected: 'billing--payment-rejected',
    paymentCompensated: 'billing--payment-compensated',
  },
  payment: {
    paymentCreated: 'payment--payment-created',
    paymentSuccess: 'payment--payment-success',
    paymentFailure: 'payment--payment-failure',
  },
  warehouse: {
    productReserved: 'warehouse--product-reserved',
    productNotReserved: 'warehouse--product-not-reserved',
    courierTakesOrder: 'warehouse--courier-takes-order',
    courierDeliveredOrder: 'warehouse--courier-delivered-order',
  },
  courier: {
    courierReserved: 'courier--courier-reserved',
    courierNotReserved: 'courier--product-not-reserved',
  },
  compensation: 'order-saga--comensation',
} as const;

export interface OrderSagaData {
  order: OrderOrder;
  orderData: MakeOrderDto['data'];
  payment?: PaymentPayment;
  billing?: {
    success: boolean;
    errorReason?: string;
  };
  courier?: {
    id: number;
  };
  billingCompensated?: boolean;
  compensation?: {
    reason: string;
  };
}
