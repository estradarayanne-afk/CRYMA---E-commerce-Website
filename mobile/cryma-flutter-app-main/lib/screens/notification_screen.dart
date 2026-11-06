import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});
  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;

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
      final page = await ApiService.instance.getBuyerOrdersPage();
      if (!mounted) return;
      setState(() {
        _orders = page.items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  String _title(String value) => value
      .toLowerCase()
      .split('_')
      .map((part) =>
          part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
            title: const Text('Order Activity'),
            backgroundColor: AppColors.white,
            foregroundColor: AppColors.primary,
            elevation: 0),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(_error!, textAlign: TextAlign.center),
                    TextButton(onPressed: _load, child: const Text('Retry'))
                  ]))
                : _orders.isEmpty
                    ? const Center(
                        child: Text('Your order activity will appear here.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                            itemCount: _orders.length,
                            itemBuilder: (context, index) {
                              final order = _orders[index];
                              final id = order['id'].toString();
                              final status =
                                  order['status']?.toString() ?? 'Unknown';
                              return Card(
                                  margin:
                                      const EdgeInsets.fromLTRB(12, 8, 12, 0),
                                  child: ListTile(
                                      leading: const CircleAvatar(
                                          backgroundColor: AppColors.softRose,
                                          child: Icon(
                                              Icons.local_shipping_outlined,
                                              color: AppColors.primary)),
                                      title: Text(
                                          'Order #$id · ${_title(status)}'),
                                      subtitle: Text(
                                          order['updated_at']?.toString() ??
                                              order['created_at']?.toString() ??
                                              'Order update'),
                                      trailing: const Icon(Icons.chevron_right),
                                      onTap: () => Navigator.pushNamed(
                                          context, '/order_details',
                                          arguments: id)));
                            })),
      );
}
