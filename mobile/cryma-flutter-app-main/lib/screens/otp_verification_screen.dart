import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../utils/colors.dart';

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({super.key, this.email});

  final String? email;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (index) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (index) => FocusNode());

  int _secondsRemaining = 60;
  bool _canResend = false;
  bool _isVerifying = false;
  bool _isResending = false;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _startResendTimer() {
    setState(() {
      _secondsRemaining = 60;
      _canResend = false;
    });

    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        if (_secondsRemaining > 0) {
          _secondsRemaining--;
        } else {
          _canResend = true;
        }
      });
      return _secondsRemaining > 0;
    });
  }

  void _handlePaste(String value) {
    final digits = value.replaceAll(RegExp(r'[^0-9]'), '').substring(0, value.replaceAll(RegExp(r'[^0-9]'), '').length.clamp(0, 6));
    for (var index = 0; index < _controllers.length; index++) {
      _controllers[index].text = index < digits.length ? digits[index] : '';
    }
    _focusNodes[digits.isEmpty ? 0 : digits.length - 1].requestFocus();
    if (digits.length == 6) _handleVerify();
  }

  Future<void> _handleVerify() async {
    final otp = _controllers.map((c) => c.text).join();
    if (otp.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit code')),
      );
      return;
    }
    if (_isVerifying) return;
    setState(() => _isVerifying = true);
    try {
      await ApiService.instance.verifyEmail(
        email: widget.email ?? '',
        otp: otp,
      );
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/registration_pending');
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verification failed. Try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _handleResend() async {
    if (!_canResend || _isResending) return;
    setState(() => _isResending = true);
    var resent = false;
    try {
      await ApiService.instance.resendVerification(widget.email ?? '');
      resent = true;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('A new code has been sent to your email')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not resend code. Try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
    if (!resent || !mounted) return;
    for (final controller in _controllers) {
      controller.clear();
    }
    _focusNodes[0].requestFocus();
    _startResendTimer();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),

              // ICON
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: AppColors.softRose,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mark_email_read_outlined,
                  size: 40,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 20),

              // TITLE
              const Text(
                'Verify Your Email',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 8),

              // SUBTITLE
              Text(
                'We sent a 6-digit code to\n${widget.email ?? "your email address"}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),

              // ✅ 6 OTP BOXES
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 48,
                    height: 56,
                    child: TextField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      // ✅ Remove maxLength, gamitin ang LengthLimiting
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        filled: true,
                        fillColor: AppColors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: AppColors.lightGray),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                            width: 2,
                          ),
                        ),
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        // ✅ Max 1 digit per box
                        LengthLimitingTextInputFormatter(6),
                      ],
                      onChanged: (value) {
                        if (value.length > 1) {
                          _handlePaste(value);
                          return;
                        }
                        if (value.isNotEmpty && index < 5) {
                          _focusNodes[index + 1].requestFocus();
                        } else if (value.isEmpty && index > 0) {
                          _focusNodes[index - 1].requestFocus();
                        }
                        if (_controllers.map((c) => c.text).join().length == 6) {
                          _handleVerify();
                        }
                      },
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              // VERIFY BUTTON
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isVerifying ? null : _handleVerify,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isVerifying
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.white,
                          ),
                        )
                      : const Text(
                          'Verify',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.white,
                            fontFamily: 'Poppins',
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),

              // ✅ RESEND with timer
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "Didn't receive the code? ",
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  GestureDetector(
                    onTap: _canResend ? _handleResend : null,
                    child: Text(
                      _canResend ? 'Resend' : 'Resend in ${_secondsRemaining}s',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _canResend ? AppColors.primary : AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
