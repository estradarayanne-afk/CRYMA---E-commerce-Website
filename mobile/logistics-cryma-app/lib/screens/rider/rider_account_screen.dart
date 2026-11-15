import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
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
  RiderAccountDetails? _details;
  Uint8List? _driverLicenseImage;
  Uint8List? _ewalletQrImage;
  String? _driverLicenseError;
  String? _ewalletQrError;
  String? _error;
  bool _loading = true;
  bool _uploadingEwalletQr = false;
  bool _hasEwalletQr = false;

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
  static const _unavailableAccountDetails =
      'Unavailable until the rider account API is updated.';

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
      final details = await RiderAuthService.instance.accountDetails();
      Uint8List? driverLicenseImage;
      Uint8List? ewalletQrImage;
      String? driverLicenseError;
      String? ewalletQrError;

      if (details.driversLicense?.mimeType.startsWith('image/') == true) {
        try {
          driverLicenseImage =
              (await RiderAuthService.instance.driversLicenseFile()).bytes;
        } on ApiException catch (error) {
          driverLicenseError = error.message;
        }
      }
      if (details.ewalletQrAvailable) {
        try {
          ewalletQrImage =
              (await RiderAuthService.instance.ewalletQrFile()).bytes;
        } on ApiException catch (error) {
          ewalletQrError = error.message;
        }
      }

      if (!mounted) return;
      setState(() {
        _details = details;
        _driverLicenseImage = driverLicenseImage;
        _driverLicenseError = driverLicenseError;
        _ewalletQrImage = ewalletQrImage;
        _ewalletQrError = ewalletQrError;
        _hasEwalletQr = details.ewalletQrAvailable;
        _loading = false;
      });
      await context
          .read<AuthProvider>()
          .refreshUser(details.account.id, details.account.fullName);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  Future<void> _uploadEwalletQr() async {
    setState(() => _uploadingEwalletQr = true);
    var uploaded = false;
    try {
      final selection = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp'],
        allowMultiple: false,
      );
      if (selection == null) return;

      final file = selection.files.single;
      final path = file.path;
      if (path == null) {
        _showError(
            'Could not access the selected image. Please try another photo.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        _showError('Choose an image that is 2 MB or smaller.');
        return;
      }

      await RiderAuthService.instance.uploadEwalletQr(path);
      uploaded = true;
      if (mounted) {
        setState(() {
          _hasEwalletQr = true;
          _ewalletQrError = null;
        });
      }
      final image = await RiderAuthService.instance.ewalletQrFile();
      if (!mounted) return;
      setState(() {
        _ewalletQrImage = image.bytes;
        _ewalletQrError = null;
        _hasEwalletQr = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('E-wallet QR photo saved.')),
      );
    } on ApiException catch (error) {
      if (mounted) {
        if (uploaded) setState(() => _ewalletQrError = error.message);
        _showError(error.message);
      }
    } catch (error) {
      if (mounted) _showError('Could not save the e-wallet QR photo: $error');
    } finally {
      if (mounted) setState(() => _uploadingEwalletQr = false);
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
    final details = _details;
    final account = details?.account;
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
              : details == null || account == null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Account details are unavailable.',
                              textAlign: TextAlign.center,
                            ),
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
                            account.firstName.isEmpty
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
                        if (details.isSummaryOnly) ...[
                          const SizedBox(height: 16),
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: Text(
                                'Your account summary is available. Additional rider details will appear when the account service is updated.',
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 24),
                        _sectionTitle('Personal information'),
                        _AccountRow(
                          label: 'Role',
                          value: _displayLabel(account.role),
                        ),
                        _AccountRow(
                          label: 'Account status',
                          value: _displayLabel(account.status),
                        ),
                        _AccountRow(
                          label: 'Phone number',
                          value: _displayValue(account.phone),
                        ),
                        _AccountRow(
                          label: 'Middle name',
                          value: details.isSummaryOnly
                              ? _unavailableAccountDetails
                              : _displayValue(details.middleName),
                        ),
                        _AccountRow(
                          label: 'Sex',
                          value: details.isSummaryOnly
                              ? _unavailableAccountDetails
                              : _displayLabel(details.sex),
                        ),
                        _AccountRow(
                          label: 'Birthday',
                          value: details.isSummaryOnly
                              ? _unavailableAccountDetails
                              : _displayValue(details.birthday),
                        ),
                        _AccountRow(
                          label: 'Email verification',
                          value: details.emailVerified
                              ? 'Verified'
                              : 'Not verified',
                        ),
                        const Divider(height: 32),
                        _sectionTitle('Registered address'),
                        _AccountRow(
                          label: 'Address',
                          value: details.isSummaryOnly
                              ? _unavailableAccountDetails
                              : _displayValue(details.address?.formatted),
                        ),
                        const Divider(height: 32),
                        _sectionTitle('Vehicle'),
                        if (details.isSummaryOnly)
                          const _AccountRow(
                            label: 'Registered vehicle',
                            value: _unavailableAccountDetails,
                          )
                        else if (details.vehicles.isEmpty)
                          const _AccountRow(
                            label: 'Registered vehicle',
                            value: 'Not provided',
                          )
                        else
                          for (final vehicle in details.vehicles)
                            _AccountRow(
                              label: _displayLabel(vehicle.type),
                              value: vehicle.plateNumber,
                            ),
                        const Divider(height: 32),
                        _sectionTitle("Driver's license"),
                        _driverLicenseSection(details),
                        const SizedBox(height: 16),
                        _sectionTitle('E-wallet QR'),
                        _ewalletQrSection(details),
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

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title, style: CrymaText.headingMedium),
      );

  Widget _driverLicenseSection(RiderAccountDetails details) {
    if (details.isSummaryOnly) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(_unavailableAccountDetails),
        ),
      );
    }

    final license = details.driversLicense;
    if (license == null) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text("No driver's license document is on file."),
        ),
      );
    }

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _AccountRow(
              label: 'Review status',
              value: _displayLabel(license.status),
            ),
            _AccountRow(label: 'File', value: license.fileName),
            if (license.mimeType.startsWith('image/'))
              if (_driverLicenseImage != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(
                    _driverLicenseImage!,
                    width: double.infinity,
                    height: 240,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => const Text(
                      "The driver's license photo could not be displayed.",
                    ),
                  ),
                )
              else
                Text(
                  _driverLicenseError ??
                      "The driver's license photo is unavailable.",
                  style: CrymaText.bodyMedium,
                )
            else if (license.mimeType == 'application/pdf')
              const Text(
                "The registered driver's license is a PDF; photo preview is unavailable.",
                style: CrymaText.bodyMedium,
              )
            else
              const Text(
                "The registered driver's license is not an image.",
                style: CrymaText.bodyMedium,
              ),
          ],
        ),
      ),
    );
  }

  Widget _ewalletQrSection(RiderAccountDetails details) {
    if (details.isSummaryOnly) {
      return const Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(_unavailableAccountDetails),
        ),
      );
    }

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Add your e-wallet QR so it is ready when a customer wants to pay by e-wallet.',
              style: CrymaText.bodyMedium,
            ),
            if (_ewalletQrImage != null) ...[
              const SizedBox(height: 12),
              Image.memory(
                _ewalletQrImage!,
                height: 220,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Text(
                  'The saved e-wallet QR photo could not be displayed.',
                ),
              ),
            ] else if (_hasEwalletQr) ...[
              const SizedBox(height: 12),
              Text(
                _ewalletQrError ?? 'The saved QR photo is unavailable.',
                style: CrymaText.bodyMedium,
              ),
            ],
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _uploadingEwalletQr ? null : _uploadEwalletQr,
              icon: _uploadingEwalletQr
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.qr_code_2),
              label: Text(
                _uploadingEwalletQr
                    ? 'Saving QR photo...'
                    : _hasEwalletQr
                        ? 'Change E-wallet QR photo'
                        : 'Add E-wallet QR photo',
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _displayValue(String? value) =>
      value == null || value.trim().isEmpty ? 'Not provided' : value;

  String _displayLabel(String? value) {
    if (value == null || value.trim().isEmpty) return 'Not provided';
    return value
        .split('_')
        .map((word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}')
        .join(' ');
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
