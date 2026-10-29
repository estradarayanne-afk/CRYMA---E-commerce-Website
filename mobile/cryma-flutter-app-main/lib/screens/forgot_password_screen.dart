import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _emailController = TextEditingController();

  bool _sending = false;

  Future<void> _handleSendReset() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email address.')),
      );
      return;
    }
    if (_sending) return;
    setState(() => _sending = true);
    try {
      await ApiService.instance.post(
        '/api/forgot-password',
        body: {'email': email},
      );
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Check Your Email'),
            content: const Text('A password reset link has been sent to your email address.'),
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to send reset link. Try again.')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: screenWidth * 0.05,
            vertical: screenHeight * 0.02,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ============================================================
              // HEADER - magkadikit ang arrow at title
              // ============================================================
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 20, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Reset Password',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const Spacer(),
                ],
              ),
              const SizedBox(height: 10),

              // ============================================================
              // ICON
              // ============================================================
              Container(
                width: 56,
                height: 56,
                decoration: const BoxDecoration(
                  color: AppColors.lightGray,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.email_outlined,
                  size: 28,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 12),

              // ============================================================
              // TITLE
              // ============================================================
              const Text(
                'Forgot Password?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 6),

              // ============================================================
              // SUBTITLE
              // ============================================================
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'Enter the email address linked to your CRYMA account. We\'ll send you a secure reset link.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                    height: 1.6,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ============================================================
              // EMAIL INPUT - may mail icon sa loob
              // ============================================================
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'EMAIL ADDRESS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.white,
                  border: Border.all(color: AppColors.lightGray),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 14),
                    const Icon(
                      Icons.email_outlined,
                      size: 18,
                      color: AppColors.gray,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.darkGray,
                          fontFamily: 'Poppins',
                        ),
                        decoration: const InputDecoration(
                          hintText: 'your@email.com',
                          hintStyle: TextStyle(
                            fontSize: 13,
                            color: AppColors.gray,
                          ),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ============================================================
              // SEND RESET LINK BUTTON
              // ============================================================
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _sending ? null : _handleSendReset,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _sending
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                      : const Text(
                          'Send Reset Link',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white,
                            fontFamily: 'Poppins',
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 14),

              // ============================================================
              // BACK TO LOGIN
              // ============================================================
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: RichText(
                  text: const TextSpan(
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                    children: [
                      TextSpan(text: 'Remember your password? '),
                      TextSpan(
                        text: 'Back to Login',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
} 