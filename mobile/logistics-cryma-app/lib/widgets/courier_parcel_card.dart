import 'package:flutter/material.dart';

import '../models/courier_parcel.dart';
import '../theme.dart';

class CourierParcelCard extends StatelessWidget {
  const CourierParcelCard({
    super.key,
    required this.parcel,
    this.onTap,
  });

  final CourierParcel parcel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (color, surface) = _statusColors(parcel.status);
    return Card(
      color: CrymaColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: CrymaColors.divider),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      parcel.parcelCode.isEmpty
                          ? 'Order #${parcel.orderId}'
                          : parcel.parcelCode,
                      style: CrymaText.headingSmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: surface,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      parcel.statusLabel,
                      style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${parcel.typeLabel} · ${parcel.itemSummary}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: CrymaText.bodyMedium,
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 15,
                    color: CrymaColors.textSecondary,
                  ),
                  const SizedBox(width: 5),
                  Expanded(
                    child: Text(
                      parcel.address,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: CrymaText.bodyMedium,
                    ),
                  ),
                ],
              ),
              if (parcel.codAmount > 0) ...[
                const SizedBox(height: 6),
                Text(
                  'Collect COD: ₱${parcel.codAmount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: CrymaColors.textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  (Color, Color) _statusColors(String status) => switch (status) {
        'DELIVERED' || 'COMPLETED' || 'RECEIVED' =>
          (CrymaColors.statusDelivered, CrymaColors.statusDeliveredSurface),
        'OUT_FOR_DELIVERY' || 'PICKED_UP' =>
          (CrymaColors.statusInTransit, CrymaColors.statusInTransitSurface),
        'DELIVERY_FAILED' || 'RETURNED' =>
          (CrymaColors.error, CrymaColors.errorSurface),
        _ => (CrymaColors.statusPending, CrymaColors.statusPendingSurface),
      };
}
