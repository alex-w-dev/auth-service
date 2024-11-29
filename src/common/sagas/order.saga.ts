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
  },
  courier: {
    courierReserved: 'courier--courier-reserved',
    courierNotReserved: 'courier--product-not-reserved',
  },
  compensation: 'order-saga--comensation',
} as const;

export interface OrderSagaData {
  order: OrderOrder;
  payment?: PaymentPayment;
  billing?: {
    success: boolean;
    errorReason?: string;
  };
  billingCompensated?: boolean;
}
