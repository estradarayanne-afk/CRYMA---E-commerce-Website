import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_config.dart';
import '../../providers/auth_provider.dart';

class PendingDialog extends StatefulWidget {
  const PendingDialog({Key? key}) : super(key: key);

  @override
  State<PendingDialog> createState() => _PendingDialogState();
}

class _PendingDialogState extends State<PendingDialog> {
  int _secondsRemaining = 120; // 2 minutes
  bool _isCheckingNow = false;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  Future<void> _startPolling() async {
    final authProvider = context.read<AuthProvider>();
    final startTime = DateTime.now();

    while (true) {
      await Future.delayed(const Duration(seconds: 5));
      if (!mounted) return;

      final elapsed = DateTime.now().difference(startTime).inSeconds;
      if (elapsed > 120) break;

      setState(() => _secondsRemaining = 120 - elapsed);

      final approved = await authProvider.checkAccountStatus();
      if (!mounted) return;
      final nav = Navigator.of(context);
      if (approved) {
        nav
          ..pop()
          ..pushReplacementNamed('/home');
        return;
      }
    }
  }

  Future<void> _checkNow() async {
    if (_isCheckingNow) return;

    setState(() => _isCheckingNow = true);

    try {
      final authProvider = context.read<AuthProvider>();
      final approved = await authProvider.checkAccountStatus();
      if (!mounted) return;
      if (approved) {
        Navigator.of(context)
          ..pop()
          ..pushReplacementNamed('/home');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Still pending. Check again later.'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCheckingNow = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.hourglass_empty,
              size: 64,
              color: AccentColors.maroon,
            ),
            const SizedBox(height: 16),
            Text(
              'Application Pending',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Your rider application is pending admin approval. Please check back later.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Checking again in ${_secondsRemaining}s...',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                OutlinedButton(
                  onPressed: _isCheckingNow ? null : _checkNow,
                  child: _isCheckingNow
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Check Now'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final nav = Navigator.of(context);
                    await context.read<AuthProvider>().logout();
                    if (mounted) {
                      nav
                        ..pop()
                        ..pushReplacementNamed('/login');
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey,
                  ),
                  child: const Text('Back to Login'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
