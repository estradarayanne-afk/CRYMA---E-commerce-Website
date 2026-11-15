import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderRequestsScreen extends StatefulWidget {
  const RiderRequestsScreen({super.key});

  @override
  State<RiderRequestsScreen> createState() => _RiderRequestsScreenState();
}

class _RiderRequestsScreenState extends State<RiderRequestsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  List<UserModel> _pending = [];
  List<UserModel> _licenseUpdates = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final results = await Future.wait([
      AuthService.instance.getPendingRiders(),
      AuthService.instance.getRidersWithPendingLicenseUpdate(),
    ]);
    if (mounted) {
      setState(() {
        _pending = results[0];
        _licenseUpdates = results[1];
        _loading = false;
      });
    }
  }

  // ── Registration actions ───────────────────────────────────────────────────
  Future<void> _approveRider(UserModel rider) async {
    if (!await _confirm(
        'Approve Rider',
        'Approve ${rider.fullName}? They will be able to log in and accept orders.',
        'Approve',
        CrymaColors.statusDelivered)) return;
    await AuthService.instance.approveRider(rider.id);
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('${rider.fullName} approved.')));
      _load();
    }
  }

  Future<void> _rejectRider(UserModel rider) async {
    final reason = await _getRejectionReason(rider);
    if (reason == null) return;
    await AuthService.instance.rejectRider(rider.id, reason);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${rider.fullName}\'s request rejected.')));
      _load();
    }
  }

  Future<String?> _getRejectionReason(UserModel rider) async {
    const defaultReason =
        'Thank you for your interest in joining CRYMA Logistics. '
        'After reviewing your application, we were unable to approve your registration at this time. '
        'Please ensure that all submitted information and documents are accurate, complete, and clearly legible, '
        'then resubmit your application for further review.';
    final controller = TextEditingController(text: defaultReason);
    final formKey = GlobalKey<FormState>();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Rider Application'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            autofocus: false,
            maxLength: 500,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Reason for rejection',
              hintText: 'Explain what the applicant needs to correct.',
              alignLabelWithHint: true,
            ),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'A rejection reason is required.'
                : null,
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: CrymaColors.error),
            onPressed: () {
              if (formKey.currentState!.validate())
                Navigator.pop(ctx, controller.text.trim());
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  // ── License update actions ─────────────────────────────────────────────────
  Future<void> _approveLicense(UserModel rider) async {
    if (!await _confirm(
        'Approve License Update',
        'Approve the new license photo for ${rider.fullName}?',
        'Approve',
        CrymaColors.statusDelivered)) return;
    await AuthService.instance.approveLicenseUpdate(rider.id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('License update approved for ${rider.fullName}.')));
      _load();
    }
  }

  Future<void> _rejectLicense(UserModel rider) async {
    if (!await _confirm(
        'Reject License Update',
        'Reject the new license photo for ${rider.fullName}? Their current photo will remain unchanged.',
        'Reject',
        CrymaColors.error)) return;
    await AuthService.instance.rejectLicenseUpdate(rider.id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('License update rejected for ${rider.fullName}.')));
      _load();
    }
  }

  Future<bool> _confirm(
      String title, String message, String label, Color color) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(label,
                  style: TextStyle(color: color, fontWeight: FontWeight.w700))),
        ],
      ),
    );
    return result == true;
  }

  void _viewPhoto(String path, String name) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  Expanded(
                      child: Text(name,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600))),
                  IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(12)),
              child: Image.file(File(path), fit: BoxFit.contain),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rider Requests'),
        leading: BackButton(onPressed: () => context.go('/admin')),
        bottom: TabBar(
          controller: _tabs,
          tabs: [
            Tab(
                text:
                    'Registration${_pending.isNotEmpty ? ' (${_pending.length})' : ''}'),
            Tab(
                text:
                    'License Updates${_licenseUpdates.isNotEmpty ? ' (${_licenseUpdates.length})' : ''}'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _buildRegistrationTab(),
                _buildLicenseTab(),
              ],
            ),
    );
  }

  Widget _buildRegistrationTab() {
    if (_pending.isEmpty) {
      return const EmptyState(
          icon: Icons.how_to_reg_outlined,
          title: 'No pending requests',
          subtitle: 'All rider registrations have been reviewed.');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _pending.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final r = _pending[i];
          return _RegistrationCard(
            rider: r,
            onApprove: () => _approveRider(r),
            onReject: () => _rejectRider(r),
            onViewPhoto: r.licensePhotoPath != null
                ? () => _viewPhoto(r.licensePhotoPath!, r.fullName)
                : null,
          );
        },
      ),
    );
  }

  Widget _buildLicenseTab() {
    if (_licenseUpdates.isEmpty) {
      return const EmptyState(
          icon: Icons.badge_outlined,
          title: 'No license update requests',
          subtitle: 'No riders have submitted a license photo update.');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _licenseUpdates.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final r = _licenseUpdates[i];
          if (r.licensePhotoPending == null) return const SizedBox.shrink();
          return _LicenseUpdateCard(
            rider: r,
            onApprove: () => _approveLicense(r),
            onReject: () => _rejectLicense(r),
            onViewCurrent: r.licensePhotoPath != null
                ? () =>
                    _viewPhoto(r.licensePhotoPath!, '${r.fullName} — Current')
                : null,
            onViewNew: () =>
                _viewPhoto(r.licensePhotoPending!, '${r.fullName} — New'),
          );
        },
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

// ── Registration Card ─────────────────────────────────────────────────────────
class _RegistrationCard extends StatelessWidget {
  final UserModel rider;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback? onViewPhoto;
  const _RegistrationCard(
      {required this.rider,
      required this.onApprove,
      required this.onReject,
      this.onViewPhoto});

  @override
  Widget build(BuildContext context) {
    final r = rider;

    // Address line 1: barangay, municipality, province, region
    final addressParts = <String>[
      if (r.barangayName != null && r.barangayName!.isNotEmpty) r.barangayName!,
      if (r.municipalityName != null && r.municipalityName!.isNotEmpty)
        r.municipalityName!,
      if (r.provinceName != null && r.provinceName!.isNotEmpty) r.provinceName!,
      if (r.regionName != null && r.regionName!.isNotEmpty) r.regionName!,
    ];
    final addressLine1 =
        addressParts.isNotEmpty ? addressParts.join(', ') : '—';

    // Address line 2: house number + street + additional
    final addressLine2Parts = <String>[
      if (r.houseNumber != null && r.houseNumber!.isNotEmpty) r.houseNumber!,
      if (r.street != null && r.street!.isNotEmpty) r.street!,
      if (r.additionalAddress != null && r.additionalAddress!.isNotEmpty)
        r.additionalAddress!,
    ];
    final addressLine2 =
        addressLine2Parts.isNotEmpty ? addressLine2Parts.join(' ') : null;

    // Vehicle: make, model, color
    final vehicleDetailParts = <String>[
      if (r.vehicleMake != null && r.vehicleMake!.isNotEmpty) r.vehicleMake!,
      if (r.vehicleModel != null && r.vehicleModel!.isNotEmpty) r.vehicleModel!,
      if (r.vehicleColor != null && r.vehicleColor!.isNotEmpty) r.vehicleColor!,
    ];
    final vehicleDetail =
        vehicleDetailParts.isNotEmpty ? vehicleDetailParts.join(', ') : null;

    return Container(
      decoration: BoxDecoration(
          color: CrymaColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: CrymaColors.divider)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── License photo ──
          GestureDetector(
            onTap: onViewPhoto,
            child: Container(
              width: double.infinity,
              height: 160,
              decoration: const BoxDecoration(
                  color: CrymaColors.inputFill,
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(16))),
              clipBehavior: Clip.antiAlias,
              child: r.licensePhotoPath != null
                  ? Stack(fit: StackFit.expand, children: [
                      Image.file(File(r.licensePhotoPath!), fit: BoxFit.cover),
                      Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(20)),
                            child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.zoom_in,
                                      size: 14, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text('Tap to enlarge',
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 11)),
                                ]),
                          )),
                    ])
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                          Icon(Icons.image_not_supported_outlined,
                              size: 32, color: CrymaColors.textHint),
                          SizedBox(height: 8),
                          Text('No photo submitted',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: CrymaColors.textSecondary)),
                        ]),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // ── Header row ──
              Row(children: [
                CircleAvatar(
                    radius: 18,
                    backgroundColor: CrymaColors.palePink,
                    child: Text(
                        r.fullName.isNotEmpty
                            ? r.fullName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                            color: CrymaColors.primary,
                            fontWeight: FontWeight.w700))),
                const SizedBox(width: 10),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(r.fullName, style: CrymaText.headingSmall),
                      Text(r.riderId ?? '',
                          style: const TextStyle(
                              fontSize: 12, color: CrymaColors.textSecondary)),
                    ])),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                      color: CrymaColors.statusPendingSurface,
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text('Pending',
                      style: TextStyle(
                          fontSize: 11,
                          color: CrymaColors.statusPending,
                          fontWeight: FontWeight.w600)),
                ),
              ]),

              // ── Personal ──
              const _SectionLabel('Personal'),
              _InfoRow(icon: Icons.person_outline, text: r.fullName),
              _InfoRow(icon: Icons.badge_outlined, text: r.riderId ?? '—'),

              // ── Contact ──
              const _SectionLabel('Contact'),
              _InfoRow(icon: Icons.email_outlined, text: r.email),
              _InfoRow(icon: Icons.phone_outlined, text: r.phone ?? '—'),

              // ── Address ──
              const _SectionLabel('Address'),
              _InfoRow(icon: Icons.location_on_outlined, text: addressLine1),
              _InfoRow(icon: Icons.home_outlined, text: addressLine2 ?? '—'),

              // ── Tax Information ──
              const _SectionLabel('Tax Information'),
              _InfoRow(
                  icon: Icons.receipt_long_outlined, text: _maskTin(r.tin)),

              // ── Vehicle ──
              const _SectionLabel('Vehicle'),
              _InfoRow(
                  icon: Icons.two_wheeler_outlined, text: r.vehicleType ?? '—'),
              _InfoRow(
                  icon: Icons.directions_car_outlined,
                  text: vehicleDetail ?? '—'),
              if (r.plateNumber != null && r.plateNumber!.isNotEmpty)
                _InfoRow(
                    icon: Icons.confirmation_number_outlined,
                    text: r.plateNumber!),

              // ── Driver's License ──
              const _SectionLabel("Driver's License"),
              _InfoRow(
                  icon: Icons.credit_card_outlined,
                  text: r.licenseNumber ?? '—'),
              if (r.licenseExpiry != null && r.licenseExpiry!.isNotEmpty)
                _InfoRow(
                    icon: Icons.event_outlined,
                    text: 'Expires ${r.licenseExpiry!}'),
              if (r.licenseClassification != null &&
                  r.licenseClassification!.isNotEmpty)
                _InfoRow(
                    icon: Icons.class_outlined,
                    text: 'Classification: ${r.licenseClassification!}'),
              if (r.licenseRestrictions != null &&
                  r.licenseRestrictions!.isNotEmpty)
                _InfoRow(
                    icon: Icons.block_outlined,
                    text: 'Restrictions: ${r.licenseRestrictions!}'),

              // ── Consent ──
              const _SectionLabel('Consent'),
              _InfoRow(
                icon: Icons.check_circle_outline,
                text: r.termsAcceptedAt != null
                    ? 'Terms accepted: ${_formatDate(r.termsAcceptedAt)}'
                    : 'Terms accepted: —',
              ),
              _InfoRow(
                icon: Icons.privacy_tip_outlined,
                text: r.privacyAcceptedAt != null
                    ? 'Privacy acknowledged: ${_formatDate(r.privacyAcceptedAt)}'
                    : 'Privacy acknowledged: —',
              ),
              _InfoRow(
                  icon: Icons.calendar_today_outlined,
                  text: 'Applied ${_formatDate(r.createdAt)}'),

              const SizedBox(height: 14),
              // ── Action buttons ──
              Row(children: [
                Expanded(
                    child: OutlinedButton(
                        onPressed: onReject,
                        style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: CrymaColors.error),
                            foregroundColor: CrymaColors.error,
                            minimumSize: const Size(0, 42)),
                        child: const Text('Reject'))),
                const SizedBox(width: 10),
                Expanded(
                    child: FilledButton(
                        onPressed: onApprove,
                        style: FilledButton.styleFrom(
                            backgroundColor: CrymaColors.statusDelivered,
                            minimumSize: const Size(0, 42)),
                        child: const Text('Approve'))),
              ]),
            ]),
          ),
        ],
      ),
    );
  }
}

// ── License Update Card ───────────────────────────────────────────────────────
class _LicenseUpdateCard extends StatelessWidget {
  final UserModel rider;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback? onViewCurrent;
  final VoidCallback onViewNew;
  const _LicenseUpdateCard(
      {required this.rider,
      required this.onApprove,
      required this.onReject,
      this.onViewCurrent,
      required this.onViewNew});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          color: CrymaColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: CrymaColors.statusPending.withValues(alpha: 0.4))),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            CircleAvatar(
                radius: 20,
                backgroundColor: CrymaColors.palePink,
                child: Text(
                    rider.fullName.isNotEmpty
                        ? rider.fullName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                        color: CrymaColors.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 16))),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(rider.fullName, style: CrymaText.headingSmall),
                  Text(rider.riderId ?? rider.email,
                      style: const TextStyle(
                          fontSize: 12, color: CrymaColors.textSecondary)),
                ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: CrymaColors.statusPendingSurface,
                  borderRadius: BorderRadius.circular(20)),
              child: const Text('License Update',
                  style: TextStyle(
                      fontSize: 11,
                      color: CrymaColors.statusPending,
                      fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 16),

          // Side-by-side photo comparison
          Row(children: [
            Expanded(
                child: Column(children: [
              const Text('Current Photo',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: CrymaColors.textSecondary)),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: onViewCurrent,
                child: Container(
                  height: 110,
                  decoration: BoxDecoration(
                      color: CrymaColors.inputFill,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: CrymaColors.divider)),
                  clipBehavior: Clip.antiAlias,
                  child: rider.licensePhotoPath != null
                      ? Image.file(File(rider.licensePhotoPath!),
                          fit: BoxFit.cover)
                      : const Center(
                          child: Icon(Icons.image_not_supported_outlined,
                              color: CrymaColors.textHint)),
                ),
              ),
            ])),
            const SizedBox(width: 10),
            const Icon(Icons.arrow_forward, color: CrymaColors.textHint),
            const SizedBox(width: 10),
            Expanded(
                child: Column(children: [
              const Text('New Photo',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: CrymaColors.statusPending)),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: onViewNew,
                child: Container(
                  height: 110,
                  decoration: BoxDecoration(
                      color: CrymaColors.inputFill,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: CrymaColors.statusPending, width: 2)),
                  clipBehavior: Clip.antiAlias,
                  child: rider.licensePhotoPending != null
                      ? Image.file(File(rider.licensePhotoPending!),
                          fit: BoxFit.cover)
                      : const Center(
                          child: Icon(Icons.image_not_supported_outlined,
                              color: CrymaColors.textHint)),
                ),
              ),
            ])),
          ]),
          const SizedBox(height: 6),
          const Center(
              child: Text('Tap photos to enlarge',
                  style: TextStyle(fontSize: 11, color: CrymaColors.textHint))),
          const SizedBox(height: 14),

          Row(children: [
            Expanded(
                child: OutlinedButton(
                    onPressed: onReject,
                    style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: CrymaColors.error),
                        foregroundColor: CrymaColors.error,
                        minimumSize: const Size(0, 42)),
                    child: const Text('Reject'))),
            const SizedBox(width: 10),
            Expanded(
                child: FilledButton(
                    onPressed: onApprove,
                    style: FilledButton.styleFrom(
                        backgroundColor: CrymaColors.statusDelivered,
                        minimumSize: const Size(0, 42)),
                    child: const Text('Approve'))),
          ]),
        ]),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Icon(icon, size: 14, color: CrymaColors.textSecondary),
        const SizedBox(width: 8),
        Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 13, color: CrymaColors.textPrimary))),
      ]),
    );
  }
}
