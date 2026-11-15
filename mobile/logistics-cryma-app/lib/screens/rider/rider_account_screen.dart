import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/rider_auth_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class RiderAccountScreen extends StatefulWidget {
  const RiderAccountScreen({super.key});

  @override
  State<RiderAccountScreen> createState() => _RiderAccountScreenState();
}

class _RiderAccountScreenState extends State<RiderAccountScreen> {
  RiderAccount? _account;
  String? _error;
  bool _loading = true;

  static const _navItems = [
    BottomNavigationBarItem(
      icon: Icon(Icons.home_outlined),
      activeIcon: Icon(Icons.home),
      label: 'Home',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.inventory_2_outlined),
      activeIcon: Icon(Icons.inventory_2),
      label: 'Parcels',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.person_outline),
      activeIcon: Icon(Icons.person),
      label: 'Account',
    ),
  ];

  static const _navRoutes = [
    '/rider',
    '/rider/parcels',
    '/rider/account',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final account = await RiderAuthService.instance.currentUser();
      if (!mounted) return;
      setState(() {
        _account = account;
        _loading = false;
      });
      await context
          .read<AuthProvider>()
          .refreshUser(account.id, account.fullName);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  Future<void> _changePassword() async {
    final formKey = GlobalKey<FormState>();
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    final passwords = await showDialog<(String, String)>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change password'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: currentCtrl,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Current password'),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Required.' : null,
              ),
              TextFormField(
                controller: newCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password'),
                validator: (value) => value == null || value.length < 8
                    ? 'Use at least 8 characters.'
                    : null,
              ),
              TextFormField(
                controller: confirmCtrl,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirm new password'),
                validator: (value) =>
                    value != newCtrl.text ? 'Passwords do not match.' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(
                context,
                (currentCtrl.text, newCtrl.text),
              );
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    currentCtrl.dispose();
    newCtrl.dispose();
    confirmCtrl.dispose();
    if (passwords == null || !mounted) return;

    try {
      await RiderAuthService.instance.changePassword(
        currentPassword: passwords.$1,
        newPassword: passwords.$2,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password updated.')),
        );
      }
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    }
  }

  Future<void> _logout() async {
    final error = await context.read<AuthProvider>().logout();
    if (error != null && mounted) _showError(error);
    if (mounted) context.go('/welcome');
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final account = _account;
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          onPressed: _load,
                          child: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    CircleAvatar(
                      radius: 34,
                      backgroundColor: CrymaColors.palePink,
                      child: Text(
                        account!.firstName.isEmpty
                            ? 'R'
                            : account.firstName[0].toUpperCase(),
                        style: CrymaText.headingLarge,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      account.fullName,
                      textAlign: TextAlign.center,
                      style: CrymaText.headingMedium,
                    ),
                    Text(
                      account.email,
                      textAlign: TextAlign.center,
                      style: CrymaText.bodyMedium,
                    ),
                    const SizedBox(height: 24),
                    _AccountRow(label: 'Role', value: account.role),
                    _AccountRow(
                      label: 'Phone',
                      value: account.phone?.isNotEmpty == true
                          ? account.phone!
                          : 'Not provided',
                    ),
                    _AccountRow(label: 'Status', value: account.status),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: _changePassword,
                      icon: const Icon(Icons.lock_outline),
                      label: const Text('Change password'),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout),
                      label: const Text('Sign out'),
                    ),
                  ],
                ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 2,
        items: _navItems,
        routes: _navRoutes,
        onNavigate: context.go,
      ),
    );
  }
}

class _AccountRow extends StatelessWidget {
  const _AccountRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label, style: CrymaText.caption),
        subtitle: Text(value, style: CrymaText.bodyLarge),
      );
}
