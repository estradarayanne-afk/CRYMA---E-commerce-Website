import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/chat_service.dart';
import '../../services/report_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class AdminRiderDetailScreen extends StatefulWidget {
  final int riderId;
  const AdminRiderDetailScreen({super.key, required this.riderId});

  @override
  State<AdminRiderDetailScreen> createState() => _AdminRiderDetailScreenState();
}

class _AdminRiderDetailScreenState extends State<AdminRiderDetailScreen> {
  UserModel? _rider;
  int _activeReports = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rider = await AuthService.instance.getRiderById(widget.riderId);
    final reports = rider != null ? await ReportService.instance.countActiveReportsForRider(rider.id) : 0;
    if (mounted) setState(() { _rider = rider; _activeReports = reports; _loading = false; });
  }

  void _showEditCredentials() {
    if (_rider == null) return;
    final emailCtrl = TextEditingController(text: _rider!.email);
    final passCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: CrymaColors.divider, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Edit Credentials', style: CrymaText.headingMedium),
              const SizedBox(height: 16),
              TextFormField(
                controller: emailCtrl,
                decoration: const InputDecoration(labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined)),
                validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: passCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New Password', prefixIcon: Icon(Icons.lock_outline), hintText: 'Leave blank to keep current'),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  final pass = passCtrl.text.isNotEmpty ? passCtrl.text : null;
                  if (pass == null) {
                    Navigator.pop(ctx);
                    return;
                  }
                  final err = await AuthService.instance.updateCredentials(widget.riderId, emailCtrl.text.trim(), pass);
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err ?? 'Credentials updated.')));
                  _load();
                },
                child: const Text('Save Changes'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSendWarning() {
    if (_rider == null) return;
    final msgCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: CrymaColors.divider, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Send Warning Notice', style: CrymaText.headingMedium),
            const SizedBox(height: 4),
            Text('To: ${_rider!.fullName}', style: CrymaText.bodyMedium),
            const SizedBox(height: 16),
            TextField(
              controller: msgCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Custom Message (optional)',
                hintText: 'Leave empty to use the default warning message.',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: CrymaColors.palePink, borderRadius: BorderRadius.circular(8)),
              child: const Text(
                'If left empty, the default warning message will be sent.',
                style: TextStyle(fontSize: 12, color: CrymaColors.primary),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () async {
                final superUserId = context.read<AuthProvider>().userId!;
                final msg = msgCtrl.text.trim().isEmpty ? kDefaultWarningMessage : msgCtrl.text.trim();
                await ChatService.instance.sendWarningNotice(
                  riderId: widget.riderId,
                  superUserId: superUserId,
                  message: msg,
                );
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Warning notice sent.')));
              },
              child: const Text('Send Warning Notice'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete this rider account?'),
        content: const Text('This will remove the rider and safely handle their related data. This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              await AuthService.instance.deleteRider(widget.riderId);
              if (mounted) context.go('/admin/riders');
            },
            style: FilledButton.styleFrom(backgroundColor: CrymaColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return Scaffold(appBar: AppBar(title: const Text('Rider')), body: const Center(child: CircularProgressIndicator()));
    if (_rider == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Rider'), leading: BackButton(onPressed: () => context.go('/admin/riders'))),
        body: const EmptyState(icon: Icons.person_off_outlined, title: 'Rider not found', subtitle: 'This account may have been deleted.'),
      );
    }

    final r = _rider!;

    // Address line 1: barangay, municipality, province, region
    final addressParts = <String>[
      if (r.barangayName != null && r.barangayName!.isNotEmpty) r.barangayName!,
      if (r.municipalityName != null && r.municipalityName!.isNotEmpty) r.municipalityName!,
      if (r.provinceName != null && r.provinceName!.isNotEmpty) r.provinceName!,
      if (r.regionName != null && r.regionName!.isNotEmpty) r.regionName!,
    ];
    final addressLine1 = addressParts.isNotEmpty ? addressParts.join(', ') : '—';

    // Address line 2: house number + street + additional
    final addressLine2Parts = <String>[
      if (r.houseNumber != null && r.houseNumber!.isNotEmpty) r.houseNumber!,
      if (r.street != null && r.street!.isNotEmpty) r.street!,
      if (r.additionalAddress != null && r.additionalAddress!.isNotEmpty) r.additionalAddress!,
    ];
    final addressLine2 = addressLine2Parts.isNotEmpty ? addressLine2Parts.join(' ') : null;

    // Vehicle: make, model, color
    final vehicleDetailParts = <String>[
      if (r.vehicleMake != null && r.vehicleMake!.isNotEmpty) r.vehicleMake!,
      if (r.vehicleModel != null && r.vehicleModel!.isNotEmpty) r.vehicleModel!,
      if (r.vehicleColor != null && r.vehicleColor!.isNotEmpty) r.vehicleColor!,
    ];
    final vehicleDetail = vehicleDetailParts.isNotEmpty ? vehicleDetailParts.join(', ') : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(r.fullName),
        leading: BackButton(onPressed: () => context.go('/admin/riders')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(radius: 36, backgroundColor: CrymaColors.palePink, child: Text(r.fullName.isNotEmpty ? r.fullName[0].toUpperCase() : '?', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: CrymaColors.primary))),
                const SizedBox(height: 12),
                Text(r.fullName, style: CrymaText.headingMedium),
                Text(r.riderId ?? '', style: CrymaText.bodyMedium),
                if (_activeReports > 0) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: CrymaColors.warningSurface, borderRadius: BorderRadius.circular(20)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.warning_amber_rounded, size: 14, color: CrymaColors.warning),
                      const SizedBox(width: 4),
                      Text('$_activeReports Active ${_activeReports == 1 ? 'Report' : 'Reports'}', style: const TextStyle(fontSize: 12, color: CrymaColors.warning, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 28),

          // ── Account Information ──────────────────────────────────────────
          const SectionHeader('Account Information'),
          const SizedBox(height: 12),
          _InfoTile(icon: Icons.email_outlined, label: 'Email', value: r.email),
          _InfoTile(icon: Icons.phone_outlined, label: 'Phone', value: r.phone ?? '—'),
          _InfoTile(icon: Icons.two_wheeler_outlined, label: 'Vehicle', value: r.vehicleType ?? '—'),
          _InfoTile(icon: Icons.badge_outlined, label: 'License', value: r.licenseNumber ?? '—'),
          _InfoTile(icon: Icons.calendar_today_outlined, label: 'Registered', value: _formatDate(r.createdAt)),
          const SizedBox(height: 24),

          // ── Registration Details ─────────────────────────────────────────
          const SectionHeader('Registration Details'),
          const SizedBox(height: 12),

          // Personal
          const _SectionLabel('Personal'),
          _InfoTile(icon: Icons.person_outline, label: 'Full Name', value: r.fullName),
          _InfoTile(icon: Icons.badge_outlined, label: 'Rider ID', value: r.riderId ?? '—'),

          // Contact
          const _SectionLabel('Contact'),
          _InfoTile(icon: Icons.email_outlined, label: 'Email', value: r.email),
          _InfoTile(icon: Icons.phone_outlined, label: 'Phone', value: r.phone ?? '—'),

          // Address
          const _SectionLabel('Address'),
          _InfoTile(icon: Icons.location_on_outlined, label: 'Location', value: addressLine1),
          _InfoTile(icon: Icons.home_outlined, label: 'Details', value: addressLine2 ?? '—'),

          // Tax Information
          const _SectionLabel('Tax Information'),
          _InfoTile(icon: Icons.receipt_long_outlined, label: 'TIN', value: _maskTin(r.tin)),

          // Vehicle
          const _SectionLabel('Vehicle'),
          _InfoTile(icon: Icons.two_wheeler_outlined, label: 'Type', value: r.vehicleType ?? '—'),
          _InfoTile(icon: Icons.directions_car_outlined, label: 'Make / Model / Color', value: vehicleDetail ?? '—'),
          if (r.plateNumber != null && r.plateNumber!.isNotEmpty) _InfoTile(icon: Icons.confirmation_number_outlined, label: 'Plate Number', value: r.plateNumber!),

          // Driver's License
          const _SectionLabel("Driver's License"),
          _InfoTile(icon: Icons.credit_card_outlined, label: 'License Number', value: r.licenseNumber ?? '—'),
          if (r.licenseExpiry != null && r.licenseExpiry!.isNotEmpty) _InfoTile(icon: Icons.event_outlined, label: 'Expiry', value: r.licenseExpiry!),
          if (r.licenseClassification != null && r.licenseClassification!.isNotEmpty) _InfoTile(icon: Icons.class_outlined, label: 'Classification', value: r.licenseClassification!),
          if (r.licenseRestrictions != null && r.licenseRestrictions!.isNotEmpty) _InfoTile(icon: Icons.block_outlined, label: 'Restrictions', value: r.licenseRestrictions!),

          // Consent
          const _SectionLabel('Consent'),
          _InfoTile(
            icon: Icons.check_circle_outline,
            label: 'Terms Accepted',
            value: r.termsAcceptedAt != null ? _formatDate(r.termsAcceptedAt) : '—',
          ),
          _InfoTile(
            icon: Icons.privacy_tip_outlined,
            label: 'Privacy Acknowledged',
            value: r.privacyAcceptedAt != null ? _formatDate(r.privacyAcceptedAt) : '—',
          ),
          _InfoTile(icon: Icons.calendar_today_outlined, label: 'Applied', value: _formatDate(r.createdAt)),
          const SizedBox(height: 24),

          // ── Actions ──────────────────────────────────────────────────────
          const SectionHeader('Actions'),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => context.go('/admin/riders/${r.id}/citations'),
            icon: const Icon(Icons.gavel_outlined),
            label: const Text('View Citations'),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: _showSendWarning,
            icon: const Icon(Icons.warning_amber_outlined),
            label: const Text('Send Warning Notice'),
            style: FilledButton.styleFrom(backgroundColor: CrymaColors.warning),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _showEditCredentials,
            icon: const Icon(Icons.edit_outlined),
            label: const Text('Edit Credentials'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _confirmDelete,
            icon: const Icon(Icons.delete_outline, color: CrymaColors.error),
            label: const Text('Delete Account', style: TextStyle(color: CrymaColors.error)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: CrymaColors.error)),
          ),
        ],
      ),
    );
  }
}

// ── TIN masking helper ────────────────────────────────────────────────────────
String _maskTin(String? tin) {
  if (tin == null) return '—';
  if (tin.length <= 3) return '•••';
  return '${'•' * (tin.length - 3)}${tin.substring(tin.length - 3)}';
}

// ── Safe date format helper ───────────────────────────────────────────────────
String _formatDate(String? date) {
  if (date == null || date.isEmpty) return '—';
  return date.length >= 10 ? date.substring(0, 10) : date;
}

// ── Section Label ─────────────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 4),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: CrymaColors.textSecondary,
          letterSpacing: 1.0,
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: CrymaColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: CrymaText.caption),
              Text(value, style: CrymaText.bodyLarge),
            ]),
          ),
        ],
      ),
    );
  }
}
