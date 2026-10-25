import { z } from 'zod';
import { validators } from './common';

export const createOrderSchema = z.object({
  itemName: validators.requiredText(100),
  itemDescription: validators.optionalText(200),
  sender: validators.optionalText(50),
  recipient: validators.requiredText(50),
  pickupLocation: validators.requiredText(100),
  destination: validators.requiredText(100),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['FOR_PICKUP', 'ON_TRANSIT', 'AT_SORTING_CENTER', 'OUT_FOR_DELIVERY', 'DELIVERED'], {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
