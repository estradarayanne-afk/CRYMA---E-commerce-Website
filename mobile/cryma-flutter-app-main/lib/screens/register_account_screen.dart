import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/auth_widgets.dart';
import '../utils/buyer_registration.dart';
import '../utils/colors.dart';

class RegisterAccountScreen extends StatefulWidget {
  const RegisterAccountScreen({
    super.key,
    this.personalData,
    this.contactData,
    this.addressData,
  });

  final Map<String, dynamic>? personalData;
  final Map<String, dynamic>? contactData;
  final Map<String, dynamic>? addressData;

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

  @override
  void initState() {
    super.initState();
    BuyerRegistrationErrorStore.instance.addListener(_onServerErrorsChanged);
  }

  @override
  void dispose() {
    BuyerRegistrationErrorStore.instance.removeListener(_onServerErrorsChanged);
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onServerErrorsChanged() {
    if (!mounted) return;
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _formKey.currentState?.validate();
    });
  }

  void _handleContinue() {
    final isPasswordValid = _formKey.currentState?.validate() ?? false;
    _confirmPasswordKey.currentState?.validate();
    final isConfirmValid =
        _confirmPasswordController.text == _passwordController.text;
    if (!isPasswordValid || !isConfirmValid) return;
    Navigator.pushNamed(
      context,
      '/register_id',
      arguments: {
        'personalData': widget.personalData ?? {},
        'contactData': widget.contactData ?? {},
        'addressData': widget.addressData ?? {},
        'password': _passwordController.text,
        'passwordConfirmation': _confirmPasswordController.text,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: AppColors.background,
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
                _buildStepper(currentStep: 3),
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
                  validator: (value) =>
                      BuyerRegistrationErrorStore.instance
                          .errorFor('password') ??
                      BuyerRegistrationRules.validatePassword(value),
                  onToggle: () {
                    setState(() {
                      _showPassword = !_showPassword;
                    });
                  },
                  onChanged: (_) {
                    BuyerRegistrationErrorStore.instance.clearField('password');
                    setState(() {});
                    if (_confirmPasswordController.text.isNotEmpty) {
                      _confirmPasswordKey.currentState?.validate();
                    }
                  },
                ),
                const SizedBox(height: 6),

                Text(
                  '${_passwordController.text.runes.length} / ${BuyerRegistrationRules.maxPasswordLength} characters',
                  style: const TextStyle(
                    color: AppColors.gray,
                    fontSize: 10,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 14),

                // CONFIRM PASSWORD
                _buildLabel('CONFIRM PASSWORD *'),
                const SizedBox(height: 4),
                _buildPasswordField(
                  controller: _confirmPasswordController,
                  showPassword: _showConfirmPassword,
                  hintText: 'Re-enter your password',
                  fieldKey: _confirmPasswordKey,
                  validator: (value) =>
                      BuyerRegistrationErrorStore.instance
                          .errorFor('password_confirmation') ??
                      BuyerRegistrationRules.validatePasswordConfirmation(
                        value,
                        _passwordController.text,
                      ),
                  onToggle: () {
                    setState(() {
                      _showConfirmPassword = !_showConfirmPassword;
                    });
                  },
                  onChanged: (_) {
                    BuyerRegistrationErrorStore.instance
                        .clearField('password_confirmation');
                    setState(() {});
                  },
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _handleContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Continue',
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
    return RegistrationProgressHeader(currentStep: currentStep);
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
                LengthLimitingTextInputFormatter(
                  BuyerRegistrationRules.maxPasswordLength,
                ),
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
}
