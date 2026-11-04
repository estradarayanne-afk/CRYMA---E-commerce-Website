import 'package:flutter/material.dart';

import '../models/buyer_address.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class AddressBookScreen extends StatefulWidget {
  const AddressBookScreen({super.key});

  @override
  State<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends State<AddressBookScreen> {
  List<BuyerAddress> _addresses = [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ApiService.instance.getBuyerAddresses();
      final addresses = rows.map(BuyerAddress.fromJson).toList();
      if (!mounted) return;
      setState(() => _addresses = addresses);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } on FormatException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Unable to load your saved addresses.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openForm([BuyerAddress? address]) async {
    final saved = await Navigator.pushNamed<bool>(
      context,
      '/add_address',
      arguments: address,
    );
    if (saved == true) {
      await _loadAddresses();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  address == null ? 'Address saved.' : 'Address updated.')),
        );
      }
    }
  }

  Future<void> _setDefault(BuyerAddress address) async {
    if (_busy || address.isDefault) return;
    setState(() => _busy = true);
    try {
      await ApiService.instance.setDefaultBuyerAddress(address.id);
      await _loadAddresses();
    } on ApiException catch (error) {
      if (mounted) _showMessage(error.message);
    } catch (_) {
      if (mounted) _showMessage('Unable to update the default address.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(BuyerAddress address) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete address?'),
        content:
            const Text('This address will be removed from your address book.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep address')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true || _busy) return;
    setState(() => _busy = true);
    try {
      await ApiService.instance.deleteBuyerAddress(address.id);
      await _loadAddresses();
      if (mounted) _showMessage('Address deleted.');
    } on ApiException catch (error) {
      if (mounted) _showMessage(error.message);
    } catch (_) {
      if (mounted) _showMessage('Unable to delete this address.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Address Book'),
        foregroundColor: AppColors.primary,
        backgroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _LoadError(message: _error!, onRetry: _loadAddresses)
              : _addresses.isEmpty
                  ? _EmptyAddresses(onAdd: () => _openForm())
                  : RefreshIndicator(
                      onRefresh: _loadAddresses,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          for (final address in _addresses)
                            _AddressCard(
                              address: address,
                              busy: _busy,
                              onEdit: () => _openForm(address),
                              onDefault: () => _setDefault(address),
                              onDelete: () => _delete(address),
                            ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: _busy ? null : () => _openForm(),
                            icon: const Icon(Icons.add),
                            label: const Text('Add New Address'),
                            style: OutlinedButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 15)),
                          ),
                        ],
                      ),
                    ),
      floatingActionButton: !_loading && _error == null && _addresses.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _busy ? null : () => _openForm(),
              icon: const Icon(Icons.add),
              label: const Text('Add address'),
            )
          : null,
    );
  }
}

class _AddressCard extends StatelessWidget {
  const _AddressCard({
    required this.address,
    required this.busy,
    required this.onEdit,
    required this.onDefault,
    required this.onDelete,
  });

  final BuyerAddress address;
  final bool busy;
  final VoidCallback onEdit;
  final VoidCallback onDefault;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(
            color: address.isDefault ? AppColors.primary : Colors.transparent,
            width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(address.icon, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
                child: Text(address.displayLabel,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16))),
            if (address.isDefault)
              const Chip(
                  label: Text('Default'), visualDensity: VisualDensity.compact),
            PopupMenuButton<String>(
              enabled: !busy,
              onSelected: (value) {
                if (value == 'edit') onEdit();
                if (value == 'delete') onDelete();
                if (value == 'default') onDefault();
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                if (!address.isDefault)
                  const PopupMenuItem(
                      value: 'default', child: Text('Set as default')),
                const PopupMenuItem(value: 'delete', child: Text('Delete')),
              ],
            ),
          ]),
          const SizedBox(height: 8),
          Text(address.recipientName,
              style: const TextStyle(fontWeight: FontWeight.w600)),
          Text(address.phone),
          const SizedBox(height: 4),
          Text(address.formattedAddress),
        ]),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ]),
        ),
      );
}

class _EmptyAddresses extends StatelessWidget {
  const _EmptyAddresses({required this.onAdd});
  final VoidCallback onAdd;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.location_on_outlined, size: 48),
            const SizedBox(height: 12),
            const Text('No saved addresses yet',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            const SizedBox(height: 6),
            const Text('Add an address to make checkout faster.',
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add),
                label: const Text('Add address')),
          ]),
        ),
      );
}
