import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class AccountManagementScreen extends StatefulWidget {
  const AccountManagementScreen({super.key});

  @override
  State<AccountManagementScreen> createState() => _AccountManagementScreenState();
}

class _AccountManagementScreenState extends State<AccountManagementScreen> {
  UserModel? _superUser;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    if (auth.userId != null) {
      final rows = await AuthService.instance.getUserById(auth.userId!);
      if (mounted) setState(() { _superUser = rows; _loading = false; });
    } else {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showEditCredentials() {
    if (_superUser == null) return;
    final emailCtrl = TextEditingController(text: _superUser!.email);
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
              const Text('Edit Super User Credentials', style: CrymaText.headingMedium),
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
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  prefixIcon: Icon(Icons.lock_outline),
                  hintText: 'Leave blank to keep current',
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  final pass = passCtrl.text.isNotEmpty ? passCtrl.text : null;
                  if (pass == null) { Navigator.pop(ctx); return; }
                  final err = await AuthService.instance.updateCredentials(_superUser!.id, emailCtrl.text.trim(), pass);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Management'),
        leading: BackButton(onPressed: () => context.go('/admin')),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: CrymaColors.palePink,
                        child: const Icon(Icons.admin_panel_settings_outlined, size: 32, color: CrymaColors.primary),
                      ),
                      const SizedBox(height: 12),
                      Text(_superUser?.fullName ?? kSuperUserDisplayName, style: CrymaText.headingMedium),
                      const Text('Super User', style: TextStyle(fontSize: 13, color: CrymaColors.textSecondary)),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                const SectionHeader('Account Details'),
                const SizedBox(height: 12),
                _InfoTile(icon: Icons.email_outlined, label: 'Email', value: _superUser?.email ?? '—'),
                _InfoTile(icon: Icons.calendar_today_outlined, label: 'Account Created', value: _superUser?.createdAt.substring(0, 10) ?? '—'),
                const SizedBox(height: 24),
                const SectionHeader('Actions'),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _showEditCredentials,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit Credentials'),
                ),
              ],
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
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: CrymaText.caption),
            Text(value, style: CrymaText.bodyLarge),
          ]),
        ],
      ),
    );
  }
}
