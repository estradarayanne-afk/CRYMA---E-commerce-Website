import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

/// Privacy Policy — fetched live from the backend via GET /api/policies/current.
/// Falls back to a minimal placeholder only if the API is unreachable.
class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  String? _content;
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
      final policies = await ApiService.instance.getCurrentPolicies();
      final privacy = policies['privacy'];
      if (!mounted) return;
      setState(() {
        _content = privacy is Map<String, dynamic>
            ? privacy['content']?.toString()
            : privacy?.toString();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.error_outline,
                          size: 42, color: AppColors.danger),
                      const SizedBox(height: 12),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontFamily: 'Poppins')),
                      const SizedBox(height: 14),
                      FilledButton(
                          onPressed: _load, child: const Text('Retry')),
                    ]),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.lightGray),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Privacy Policy',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _content ??
                              'Privacy policy content is not available right now.',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            fontFamily: 'Poppins',
                            height: 1.65,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}
