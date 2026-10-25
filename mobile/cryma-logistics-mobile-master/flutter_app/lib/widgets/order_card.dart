import 'package:flutter/material.dart';

import '../models/order_model.dart';

class OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onTap;

  const OrderCard({Key? key, required this.order, required this.onTap})
      : super(key: key);

  Color _getStatusColor() {
    switch (order.status) {
      case 'ASSIGNED_TO_PICKUP_RIDER':
      case 'ACCEPTED_BY_PICKUP_RIDER':
      case 'PICKED_UP':
        return Colors.orange;
      case 'ASSIGNED_TO_RIDER':
      case 'OUT_FOR_DELIVERY':
        return Colors.blue;
      case 'AT_SORTING_CENTER':
        return Colors.purple;
      case 'DELIVERED':
      case 'COMPLETED':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order #${order.orderId}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      order.statusLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (order.itemName.isNotEmpty)
                Text(
                  'Item: ${order.itemName}',
                  style: const TextStyle(fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              if (order.recipient != null && order.recipient!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  'Recipient: ${order.recipient}',
                  style: const TextStyle(fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (order.deliveryAddress != null &&
                  order.deliveryAddress!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  'To: ${order.deliveryAddress}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
