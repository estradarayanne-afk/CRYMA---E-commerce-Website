import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/colors.dart';
import '../utils/validators.dart';

class RegisterAccountScreen extends StatefulWidget {
  const RegisterAccountScreen({
    super.key,
    this.personalData,
    this.contactData,
    this.addressData,
    this.idFile,
  });

  final Map<String, dynamic>? personalData;
  final Map<String, dynamic>? contactData;
  final Map<String, dynamic>? addressData;
  final String? idFile;

  @override
  State<RegisterAccountScreen> createState() => _RegisterAccountScreenState();
}

class _RegisterAccountScreenState extends State<RegisterAccountScreen> {
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  final _formKey = GlobalKey<FormState>();
  final _confirmPasswordKey = GlobalKey<FormFieldState>();

  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _agreeTerms = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _handleSubmit() {
    // 1. Validate password field
    final isPasswordValid = _formKey.currentState?.validate() ?? false;

    // 2. Validate confirm password field
    _confirmPasswordKey.currentState?.validate();
    final isConfirmValid =
        _confirmPasswordController.text == _passwordController.text;

    // ⛔ Kung may invalid, hindi mag-submit
    if (!isPasswordValid || !isConfirmValid) {
      return;
    }

    // 3. Check terms
    if (!_agreeTerms) {
      _showAlert('Please agree to the Terms & Conditions.');
      return;
    }

    // 4. Get email from contactData
    final email = widget.contactData?['email'] as String? ?? '';

    print('📧 Email mula sa contactData: $email');
    print('📦 contactData: ${widget.contactData}');

    if (email.isEmpty) {
      _showAlert('Email is missing. Please go back and re-enter your email.');
      return;
    }

    // 5. Navigate to OTP
    Navigator.pushReplacementNamed(
      context,
      '/otp_verification',
      arguments: email,
    );
  }

  Color _getPasswordStrengthColor(String password) {
    if (password.isEmpty) return AppColors.gray;

    switch (AppValidators.passwordStrength(password)) {
      case 'Weak':
        return Colors.red;
      case 'Fair':
        return Colors.orange;
      case 'Good':
        return Colors.green;
      case 'Strong':
        return AppColors.primary;
      default:
        return AppColors.gray;
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
          child: Form(
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // HEADER
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(
                        Icons.arrow_back,
                        color: AppColors.primary,
                      ),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Create Account',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const Spacer(),
                  ],
                ),
                const SizedBox(height: 10),

                // STEPPER
                _buildStepper(currentStep: 5),
                const SizedBox(height: 14),

                // DESCRIPTION
                const Text(
                  'Set a secure password to protect your account.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),

                // PASSWORD
                _buildLabel('PASSWORD *'),
                const SizedBox(height: 4),
                _buildPasswordField(
                  controller: _passwordController,
                  showPassword: _showPassword,
                  hintText: 'Minimum 8 characters',
                  validator: AppValidators.password,
                  onToggle: () {
                    setState(() {
                      _showPassword = !_showPassword;
                    });
                  },
                  onChanged: (_) {
                    setState(() {});
                    if (_confirmPasswordController.text.isNotEmpty) {
                      _confirmPasswordKey.currentState?.validate();
                    }
                  },
                ),
                const SizedBox(height: 6),

                // PASSWORD STRENGTH BARS
                if (_passwordController.text.isNotEmpty) ...[
                  Row(
                    children: [
                      Expanded(child: _strengthBar(active: true)),
                      const SizedBox(width: 6),
                      Expanded(child: _strengthBar(active: true)),
                      const SizedBox(width: 6),
                      Expanded(child: _strengthBar(active: true)),
                      const SizedBox(width: 6),
                      Expanded(child: _strengthBar(active: false)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${AppValidators.passwordStrength(_passwordController.text)} password strength',
                    style: TextStyle(
                      fontSize: 11,
                      color: _getPasswordStrengthColor(
                        _passwordController.text,
                      ),
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
                const SizedBox(height: 14),

                // CONFIRM PASSWORD
                _buildLabel('CONFIRM PASSWORD *'),
                const SizedBox(height: 4),
                _buildPasswordField(
                  controller: _confirmPasswordController,
                  showPassword: _showConfirmPassword,
                  hintText: 'Re-enter your password',
                  fieldKey: _confirmPasswordKey,
                  validator: (value) => AppValidators.confirmPassword(
                    value,
                    _passwordController.text,
                  ),
                  onToggle: () {
                    setState(() {
                      _showConfirmPassword = !_showConfirmPassword;
                    });
                  },
                  onChanged: (_) {
                    setState(() {});
                  },
                ),
                const SizedBox(height: 14),

                // TERMS AND CONDITIONS
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _agreeTerms = !_agreeTerms;
                    });
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      border: Border.all(
                        color: AppColors.lightGray,
                        width: 1.5,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: _agreeTerms
                                ? AppColors.primary
                                : AppColors.white,
                            border: Border.all(
                              color: _agreeTerms
                                  ? AppColors.primary
                                  : AppColors.gray,
                              width: 1.5,
                            ),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: _agreeTerms
                              ? const Icon(
                                  Icons.check,
                                  size: 14,
                                  color: AppColors.white,
                                )
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: RichText(
                            text: const TextSpan(
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.gray,
                                fontFamily: 'Poppins',
                                height: 1.5,
                              ),
                              children: [
                                TextSpan(text: 'I agree to the '),
                                TextSpan(
                                  text: 'Terms & Conditions',
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                TextSpan(text: ' and '),
                                TextSpan(
                                  text: 'Privacy Policy',
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                TextSpan(text: ' of CRYMA.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // ✅ SUBMIT BUTTON — nakalink na sa _handleSubmit
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Submit Registration',
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ============================================================
  // STEPPER
  // ============================================================
  Widget _buildStepper({required int currentStep}) {
    final List<String> steps = [
      'Personal',
      'Contact',
      'Address',
      'Verify',
      'Account',
    ];

    return SizedBox(
      height: 64,
      child: Stack(
        children: [
          Positioned(
            left: 26,
            right: 26,
            top: 18,
            child: Row(
              children: List.generate(steps.length - 1, (index) {
                final isCompleted = index + 1 < currentStep;

                return Expanded(
                  child: Container(
                    height: 2,
                    color:
                        isCompleted ? AppColors.primary : AppColors.lightGray,
                  ),
                );
              }),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: steps.asMap().entries.map((entry) {
              final index = entry.key;
              final label = entry.value;
              final stepNumber = index + 1;

              final isCurrent = stepNumber == currentStep;
              final isCompleted = stepNumber < currentStep;

              return SizedBox(
                width: 50,
                child: Column(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCurrent || isCompleted
                            ? AppColors.primary
                            : AppColors.lightGray,
                      ),
                      child: Center(
                        child: isCompleted
                            ? const Icon(
                                Icons.check,
                                color: AppColors.white,
                                size: 18,
                              )
                            : Text(
                                stepNumber.toString(),
                                style: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isCurrent
                                      ? AppColors.white
                                      : AppColors.gray,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 9,
                        fontWeight: isCurrent || isCompleted
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: isCurrent || isCompleted
                            ? AppColors.primary
                            : AppColors.gray,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // LABEL
  // ============================================================
  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  // ============================================================
  // PASSWORD FIELD (may errorMaxLines: 2 na)
  // ============================================================
  Widget _buildPasswordField({
    required TextEditingController controller,
    required bool showPassword,
    required String hintText,
    required VoidCallback onToggle,
    required ValueChanged<String> onChanged,
    String? Function(String?)? validator,
    GlobalKey<FormFieldState>? fieldKey,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(
          color: AppColors.lightGray,
          width: 1.5,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(width: 14),
          const Padding(
            padding: EdgeInsets.only(top: 15),
            child: Icon(
              Icons.shield_outlined,
              color: AppColors.gray,
              size: 22,
            ),
          ),
          Expanded(
            child: TextFormField(
              key: fieldKey,
              controller: controller,
              obscureText: !showPassword,
              onChanged: onChanged,
              validator: validator,
              inputFormatters: [
                LengthLimitingTextInputFormatter(30),
                FilteringTextInputFormatter.deny(RegExp(r'\s')),
              ],
              textInputAction: TextInputAction.done,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
              decoration: InputDecoration(
                hintText: hintText,
                hintStyle: const TextStyle(
                  fontSize: 13,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 15,
                ),
                errorStyle: const TextStyle(
                  fontSize: 11,
                  fontFamily: 'Poppins',
                  height: 1.3,
                ),
                errorMaxLines: 2,
              ),
            ),
          ),
          GestureDetector(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.only(right: 14, top: 15),
              child: Icon(
                showPassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                color: AppColors.gray,
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // PASSWORD STRENGTH BAR
  // ============================================================
  Widget _strengthBar({required bool active}) {
    return Container(
      height: 4,
      decoration: BoxDecoration(
        color: active ? AppColors.primary : AppColors.lightGray,
        borderRadius: BorderRadius.circular(10),
      ),
    );
  }
}
