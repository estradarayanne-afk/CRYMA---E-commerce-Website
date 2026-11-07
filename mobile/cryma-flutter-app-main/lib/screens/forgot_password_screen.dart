import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSendReset() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _snack('Please enter your email address.');
      return;
    }
    if (_sending) return;
    setState(() => _sending = true);
    try {
      await ApiService.instance.post('/api/forgot-password', body: {'email': email});
      if (mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Check your email'),
            content: const Text(
                'A password reset link has been sent to your email address.'),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context);
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) _snack(e.message);
    } catch (_) {
      if (mounted) _snack('Failed to send reset link. Try again.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Reset Password'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),

              // ── ICON ──────────────────────────────────────────────
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: AppColors.softRose,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_reset_rounded,
                    size: 32, color: AppColors.primary),
              ),
              const SizedBox(height: 18),

              // ── TITLE ─────────────────────────────────────────────
              const Text(
                'Forgot Password?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.wine,
                ),
              ),
              const SizedBox(height: 8),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  "Enter the email address linked to your CRYMA account. We'll send you a secure reset link.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.55,
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ── EMAIL INPUT ───────────────────────────────────────
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _handleSendReset(),
                decoration: const InputDecoration(
                  labelText: 'Email address',
                  hintText: 'your@email.com',
                  prefixIcon:
                      Icon(Icons.email_outlined, color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 24),

              // ── SEND BUTTON ────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _sending ? null : _handleSendReset,
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text(
                          'Send reset link',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),

              // ── BACK TO LOGIN ─────────────────────────────────────
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: RichText(
                  text: const TextSpan(
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 13,
                      color: AppColors.gray,
                    ),
                    children: [
                      TextSpan(text: 'Remember your password? '),
                      TextSpan(
                        text: 'Back to login',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
