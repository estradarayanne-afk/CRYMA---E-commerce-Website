import 'package:flutter/material.dart';
import '../database/app_constants.dart';
import '../services/order_service.dart';
import '../theme.dart';

// ── CRYMA Logo Wordmark ──────────────────────────────────────────────────────
class CrymaLogo extends StatelessWidget {
  final double size;
  final bool showSubtitle;

  const CrymaLogo({super.key, this.size = 28, this.showSubtitle = true});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'CRYMA',
                style: TextStyle(
                  fontSize: size,
                  fontWeight: FontWeight.w800,
                  color: CrymaColors.primary,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
        ),
        if (showSubtitle) ...[
          const SizedBox(height: 2),
          Text(
            'LOGISTICS',
            style: TextStyle(
              fontSize: size * 0.38,
              fontWeight: FontWeight.w600,
              color: CrymaColors.textSecondary,
              letterSpacing: 3,
            ),
          ),
        ],
      ],
    );
  }
}

// ── Status Badge ─────────────────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final OrderStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, surface) = switch (status) {
      OrderStatus.forPickUp => (CrymaColors.statusPending, CrymaColors.statusPendingSurface),
      OrderStatus.assigned => (CrymaColors.statusPending, CrymaColors.statusPendingSurface),
      OrderStatus.pickedUp => (CrymaColors.statusInTransit, CrymaColors.statusInTransitSurface),
      OrderStatus.onTransit => (CrymaColors.statusInTransit, CrymaColors.statusInTransitSurface),
      OrderStatus.atSortingCenter => (CrymaColors.statusAtSorting, CrymaColors.statusAtSortingSurface),
      OrderStatus.outForDelivery => (CrymaColors.statusOutForDelivery, CrymaColors.statusOutForDeliverySurface),
      OrderStatus.delivered => (CrymaColors.statusDelivered, CrymaColors.statusDeliveredSurface),
      OrderStatus.failedDelivery => (CrymaColors.warning, CrymaColors.warningSurface),
      OrderStatus.returnToSender => (CrymaColors.error, CrymaColors.errorSurface),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

// ── Order Card ────────────────────────────────────────────────────────────────
class OrderCard extends StatelessWidget {
  final OrderModel order;
  final VoidCallback? onTap;

  const OrderCard({super.key, required this.order, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: CrymaColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: CrymaColors.divider),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(order.orderId,
                      style: CrymaText.headingSmall,
                      overflow: TextOverflow.ellipsis)),
                const SizedBox(width: 8),
                StatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 10),
            Row(children: [
              const Icon(Icons.inventory_2_outlined, size: 14, color: CrymaColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(child: Text(order.itemName, style: CrymaText.bodyMedium)),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.location_on_outlined, size: 14, color: CrymaColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(child: Text(order.destination, style: CrymaText.bodyMedium)),
            ]),
          ],
        ),
      ),
    );
  }
}

// ── Section Header ────────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;

  const SectionHeader(this.title, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: CrymaText.headingSmall),
        if (trailing != null) trailing!,
      ],
    );
  }
}

// ── Profile Menu Tile ─────────────────────────────────────────────────────────
class ProfileMenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? textColor;

  const ProfileMenuTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.iconColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = iconColor ?? CrymaColors.textSecondary;
    return ListTile(
      contentPadding: const EdgeInsets.fromLTRB(6, 2, 0, 2),
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 18, color: color),
      ),
      title: Text(
        label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: textColor ?? CrymaColors.textPrimary,
        ),
      ),
      trailing: Icon(Icons.chevron_right, size: 18, color: CrymaColors.textHint),
      onTap: onTap,
    );
  }
}

// ── Conversation Tile ─────────────────────────────────────────────────────────
class ConversationTile extends StatelessWidget {
  final String name;
  final String lastMessage;
  final String time;
  final int unreadCount;
  final String? tag;
  final VoidCallback? onTap;

  const ConversationTile({
    super.key,
    required this.name,
    required this.lastMessage,
    required this.time,
    this.unreadCount = 0,
    this.tag,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: CircleAvatar(
        radius: 22,
        backgroundColor: CrymaColors.primarySurface,
        child: Text(
          name[0].toUpperCase(),
          style: const TextStyle(
            color: CrymaColors.primary,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontWeight: unreadCount > 0 ? FontWeight.w700 : FontWeight.w500,
                fontSize: 14,
                color: CrymaColors.textPrimary,
              ),
            ),
          ),
          if (tag != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: CrymaColors.primarySurface,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(tag!, style: const TextStyle(fontSize: 10, color: CrymaColors.primary, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      subtitle: Text(
        lastMessage,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 13,
          color: unreadCount > 0 ? CrymaColors.textPrimary : CrymaColors.textSecondary,
          fontWeight: unreadCount > 0 ? FontWeight.w500 : FontWeight.w400,
        ),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(time, style: CrymaText.caption),
          if (unreadCount > 0) ...[
            const SizedBox(height: 4),
            Container(
              width: 20,
              height: 20,
              decoration: const BoxDecoration(
                color: CrymaColors.primary,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ],
      ),
      onTap: onTap,
    );
  }
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final Color surfaceColor;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.color,
    required this.surfaceColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: color)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 12, color: color.withValues(alpha: 0.8), fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: CrymaColors.textHint),
            const SizedBox(height: 16),
            Text(title, style: CrymaText.headingSmall, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(subtitle, style: CrymaText.bodyMedium, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ── App Bottom Nav ────────────────────────────────────────────────────────────
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final List<BottomNavigationBarItem> items;
  final List<String> routes;
  final void Function(String) onNavigate;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.items,
    required this.routes,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: CrymaColors.divider)),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: (i) => onNavigate(routes[i]),
        items: items,
      ),
    );
  }
}
