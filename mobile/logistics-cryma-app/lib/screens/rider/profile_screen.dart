import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/chat_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderProfileScreen extends StatefulWidget {
  const RiderProfileScreen({super.key});

  @override
  State<RiderProfileScreen> createState() => _RiderProfileScreenState();
}

class _RiderProfileScreenState extends State<RiderProfileScreen> {
  static const _navItems = [
    BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: 'Orders'),
    BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Messages'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
  ];
  static const _navRoutes = ['/rider', '/rider/deliveries', '/rider/messages', '/rider/profile'];

  UserModel? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final id = context.read<AuthProvider>().userId;
    if (id == null) return;
    final user = await AuthService.instance.getUserById(id);
    if (mounted) setState(() => _user = user);
  }

  // ── Edit Profile ────────────────────────────────────────────────────────────
  void _showEditProfile() {
    if (_user == null) return;
    final nameCtrl = TextEditingController(text: _user!.fullName);
    final phoneCtrl = TextEditingController(text: _user!.phone ?? '');
    final formKey = GlobalKey<FormState>();

    _showSheet(
      title: 'Edit Profile',
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person_outline)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone_outlined)),
              validator: (v) => (v == null || v.trim().length < 10) ? 'Enter a valid phone number' : null,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final id = context.read<AuthProvider>().userId!;
                await AuthService.instance.updateProfile(id, fullName: nameCtrl.text, phone: phoneCtrl.text);
                await context.read<AuthProvider>().refreshUser(id, nameCtrl.text.trim());
                if (mounted) Navigator.pop(context);
                _loadUser();
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated.')));
              },
              child: const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  // ── Vehicle & License ───────────────────────────────────────────────────────
  void _showVehicleAndLicense() {
    if (_user == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setInner) => Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sheetHandle(),
              const SizedBox(height: 16),
              const Text('Vehicle & License', style: CrymaText.headingMedium),
              const SizedBox(height: 20),

              // License photo
              Stack(
                children: [
                  Container(
                    width: double.infinity,
                    height: 180,
                    decoration: BoxDecoration(
                      color: CrymaColors.inputFill,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: CrymaColors.divider),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _user!.licensePhotoPath != null
                        ? Image.file(File(_user!.licensePhotoPath!), fit: BoxFit.cover)
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.badge_outlined, size: 48, color: CrymaColors.textHint),
                              SizedBox(height: 8),
                              Text("Driver's License Photo", style: TextStyle(fontSize: 13, color: CrymaColors.textSecondary)),
                            ],
                          ),
                  ),
                  if (_user!.licensePhotoPending != null)
                    Positioned(
                      top: 8, left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: CrymaColors.statusPending, borderRadius: BorderRadius.circular(20)),
                        child: const Text('Update Pending Review', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              if (_user!.licensePhotoPending != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: CrymaColors.statusPendingSurface, borderRadius: BorderRadius.circular(10)),
                  child: const Row(
                    children: [
                      Icon(Icons.hourglass_top_outlined, size: 14, color: CrymaColors.statusPending),
                      SizedBox(width: 8),
                      Expanded(child: Text('Your new license photo is awaiting admin approval.', style: TextStyle(fontSize: 12, color: CrymaColors.statusPending))),
                    ],
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: () async {
                    final picker = ImagePicker();
                    final file = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
                    if (file == null) return;
                    final id = context.read<AuthProvider>().userId!;
                    await AuthService.instance.submitLicenseUpdateRequest(id, file.path);
                    await _loadUser();
                    setInner(() {});
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('License update submitted for review.')),
                    );
                  },
                  icon: const Icon(Icons.camera_alt_outlined, size: 16),
                  label: const Text('Update License Photo'),
                  style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 40)),
                ),
              const SizedBox(height: 20),

              _InfoRow(icon: Icons.two_wheeler_outlined, label: 'Vehicle Type', value: _user!.vehicleType ?? '—'),
              const SizedBox(height: 12),
              _InfoRow(icon: Icons.badge_outlined, label: "Driver's License No.", value: _user!.licenseNumber ?? '—'),
              const SizedBox(height: 12),
              _InfoRow(icon: Icons.tag, label: 'Rider ID', value: _user!.riderId ?? '—'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: CrymaColors.palePink, borderRadius: BorderRadius.circular(10)),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, size: 15, color: CrymaColors.primary),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'To update your vehicle type or license number, please contact your administrator.',
                        style: TextStyle(fontSize: 12, color: CrymaColors.primary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  // ── Change Password ─────────────────────────────────────────────────────────
  void _showChangePassword() {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool obscure = true;

    _showSheet(
      title: 'Change Password',
      child: StatefulBuilder(
        builder: (ctx, setInner) => Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: currentCtrl,
                obscureText: obscure,
                decoration: InputDecoration(
                  labelText: 'Current Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                    onPressed: () => setInner(() => obscure = !obscure),
                  ),
                ),
                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: newCtrl,
                obscureText: obscure,
                decoration: const InputDecoration(labelText: 'New Password', prefixIcon: Icon(Icons.lock_outline)),
                validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: confirmCtrl,
                obscureText: obscure,
                decoration: const InputDecoration(labelText: 'Confirm New Password', prefixIcon: Icon(Icons.lock_outline)),
                validator: (v) => v != newCtrl.text ? 'Passwords do not match' : null,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  final id = context.read<AuthProvider>().userId!;
                  final err = await AuthService.instance.updatePassword(id, currentCtrl.text, newCtrl.text);
                  if (!ctx.mounted) return;
                  if (err != null) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
                    return;
                  }
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed successfully.')));
                },
                child: const Text('Change Password'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Notifications ───────────────────────────────────────────────────────────
  void _showNotifications() async {
    final riderId = context.read<AuthProvider>().userId;
    if (riderId == null) return;
    final notices = await ChatService.instance.getWarningNoticesForRider(riderId);

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.92,
        builder: (_, scrollCtrl) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sheetHandle(),
                  const SizedBox(height: 16),
                  const Text('Notifications', style: CrymaText.headingMedium),
                  const SizedBox(height: 4),
                  const Text('Warning notices and important alerts.', style: CrymaText.bodyMedium),
                  const SizedBox(height: 12),
                ],
              ),
            ),
            Expanded(
              child: notices.isEmpty
                  ? const EmptyState(
                      icon: Icons.notifications_none_outlined,
                      title: 'No notifications',
                      subtitle: 'You have no warning notices at this time.',
                    )
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                      itemCount: notices.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final n = notices[i];
                        final date = _formatDate(n.createdAt);
                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: CrymaColors.palePink,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: CrymaColors.primary.withValues(alpha: 0.25)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.warning_amber_rounded, size: 15, color: CrymaColors.primary),
                                  const SizedBox(width: 6),
                                  const Text('WARNING NOTICE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: CrymaColors.primary, letterSpacing: 0.5)),
                                  const Spacer(),
                                  Text(date, style: CrymaText.caption),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('From: ${n.senderName}', style: const TextStyle(fontSize: 12, color: CrymaColors.textSecondary)),
                              const SizedBox(height: 8),
                              Text(n.body, style: const TextStyle(fontSize: 13, color: CrymaColors.textPrimary)),
                              const SizedBox(height: 10),
                              TextButton(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  context.go('/rider/messages');
                                },
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text('View in Messages →'),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Help & FAQ ──────────────────────────────────────────────────────────────
  void _showHelpFaq() {
    const faqs = [
      _Faq('How do I accept an order?', 'Go to the Orders tab and tap on any available order with "For Pick Up" status. Tap "Accept Order" to claim it.'),
      _Faq('How do I update an order status?', 'Open the order from your Orders tab, then use the action button at the bottom to advance the status (e.g. Start Delivery → Mark Out for Delivery → Mark as Delivered).'),
      _Faq('What does "At Sorting Center" mean?', 'The parcel is currently being processed at a sorting facility before it reaches the final delivery stage.'),
      _Faq('I received a Warning Notice. What should I do?', 'Read the notice carefully in your Messages tab. You can reply directly to acknowledge it. Continued violations may result in further action on your account.'),
      _Faq('How do I change my password?', 'Go to Profile → Change Password. You will need to enter your current password to set a new one.'),
      _Faq('My order disappeared. What happened?', 'Orders can be removed by the administrator. If an active order disappears, contact your administrator for clarification.'),
      _Faq('How do I contact support?', 'Use the Messages tab to communicate with the CRYMA logistics team. For urgent concerns, contact your sorting hub directly.'),
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.65,
        maxChildSize: 0.92,
        builder: (_, scrollCtrl) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sheetHandle(),
                  const SizedBox(height: 16),
                  const Text('Help & FAQ', style: CrymaText.headingMedium),
                  const SizedBox(height: 4),
                  const Text('Frequently asked questions.', style: CrymaText.bodyMedium),
                  const SizedBox(height: 12),
                ],
              ),
            ),
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                itemCount: faqs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _FaqTile(faq: faqs[i]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── About CRYMA ─────────────────────────────────────────────────────────────
  void _showAbout() {
    showModalBottomSheet(
      context: context,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _sheetHandle(),
            const SizedBox(height: 24),
            const CrymaLogo(size: 32),
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: CrymaColors.palePink,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: CrymaColors.primary.withValues(alpha: 0.2)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.construction_outlined, size: 36, color: CrymaColors.primary),
                  SizedBox(height: 12),
                  Text(
                    'About CRYMA Logistics',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: CrymaColors.textPrimary),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  Text(
                    '[ To Be Inserted ]',
                    style: TextStyle(fontSize: 13, color: CrymaColors.textSecondary, fontStyle: FontStyle.italic),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text('Version 1.0.0', style: CrymaText.caption),
          ],
        ),
      ),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  void _showSheet({required String title, required Widget child}) {
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
            _sheetHandle(),
            const SizedBox(height: 16),
            Text(title, style: CrymaText.headingMedium),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }

  Widget _sheetHandle() => Center(
        child: Container(
          width: 36,
          height: 4,
          decoration: BoxDecoration(color: CrymaColors.divider, borderRadius: BorderRadius.circular(2)),
        ),
      );

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final initial = auth.userName.isNotEmpty ? auth.userName[0].toUpperCase() : 'R';

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(color: CrymaColors.palePink, shape: BoxShape.circle),
                  child: Center(
                    child: Text(initial, style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w700, color: CrymaColors.primary)),
                  ),
                ),
                const SizedBox(height: 12),
                Text(auth.userName, style: CrymaText.headingMedium),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: CrymaColors.palePink, borderRadius: BorderRadius.circular(20)),
                  child: const Text('Rider', style: TextStyle(fontSize: 12, color: CrymaColors.primary, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 4),
                Text(auth.userEmail, style: CrymaText.bodyMedium),
                if (_user?.riderId != null) ...[
                  const SizedBox(height: 2),
                  Text(_user!.riderId!, style: CrymaText.caption),
                ],
              ],
            ),
          ),
          const SizedBox(height: 32),

          const SectionHeader('Account'),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(color: CrymaColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: CrymaColors.divider)),
            child: Column(
              children: [
                ProfileMenuTile(icon: Icons.person_outline, label: 'Edit Profile', onTap: _showEditProfile, iconColor: CrymaColors.primary),
                const Divider(height: 1, indent: 56),
                ProfileMenuTile(icon: Icons.badge_outlined, label: 'Vehicle & License', onTap: _showVehicleAndLicense, iconColor: CrymaColors.primary),
                const Divider(height: 1, indent: 56),
                ProfileMenuTile(icon: Icons.lock_outline, label: 'Change Password', onTap: _showChangePassword, iconColor: CrymaColors.primary),
                const Divider(height: 1, indent: 56),
                ProfileMenuTile(icon: Icons.notifications_outlined, label: 'Notifications', onTap: _showNotifications, iconColor: CrymaColors.primary),
                const Divider(height: 1, indent: 56),
                ProfileMenuTile(icon: Icons.account_balance_wallet_outlined, label: 'Earnings & COD', onTap: () => context.go('/rider/earnings'), iconColor: CrymaColors.primary),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const SectionHeader('Support'),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(color: CrymaColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: CrymaColors.divider)),
            child: Column(
              children: [
                ProfileMenuTile(icon: Icons.help_outline, label: 'Help & FAQ', onTap: _showHelpFaq),
                const Divider(height: 1, indent: 56),
                ProfileMenuTile(icon: Icons.info_outline, label: 'About CRYMA', onTap: _showAbout),
              ],
            ),
          ),
          const SizedBox(height: 28),

          OutlinedButton.icon(
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) context.go('/welcome');
            },
            icon: const Icon(Icons.logout, color: CrymaColors.error),
            label: const Text('Logout', style: TextStyle(color: CrymaColors.error)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: CrymaColors.error), minimumSize: const Size(double.infinity, 50)),
          ),
          const SizedBox(height: 32),
        ],
      ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 3,
        items: _navItems,
        routes: _navRoutes,
        onNavigate: context.go,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: CrymaColors.textSecondary),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: CrymaText.caption),
            Text(value, style: CrymaText.bodyLarge),
          ],
        ),
      ],
    );
  }
}

class _Faq {
  final String question;
  final String answer;
  const _Faq(this.question, this.answer);
}

class _FaqTile extends StatefulWidget {
  final _Faq faq;
  const _FaqTile({required this.faq});

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CrymaColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _expanded ? CrymaColors.primary.withValues(alpha: 0.3) : CrymaColors.divider),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _expanded = !_expanded),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(widget.faq.question, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: CrymaColors.textPrimary)),
                  ),
                  Icon(_expanded ? Icons.expand_less : Icons.expand_more, size: 20, color: CrymaColors.textSecondary),
                ],
              ),
              if (_expanded) ...[
                const SizedBox(height: 10),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Text(widget.faq.answer, style: const TextStyle(fontSize: 13, color: CrymaColors.textSecondary, height: 1.5)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
