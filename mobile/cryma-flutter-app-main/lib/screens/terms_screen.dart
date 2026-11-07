import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

/// Terms & Conditions — fetched live from the backend via GET /api/policies/current.
class TermsScreen extends StatefulWidget {
  const TermsScreen({super.key});

  @override
  State<TermsScreen> createState() => _TermsScreenState();
}

class _TermsScreenState extends State<TermsScreen> {
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
      final terms = policies['terms'];
      if (!mounted) return;
      setState(() {
        _content = terms is Map<String, dynamic>
            ? terms['content']?.toString()
            : terms?.toString();
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
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Terms & Conditions'),
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
                          'Terms & Conditions',
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
                              'Terms & conditions content is not available right now.',
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
