import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../utils/auth_widgets.dart';
import '../../../utils/buyer_registration.dart';
import '../../../utils/colors.dart';

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
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  final _formKey = GlobalKey<FormState>();
  final _emailKey = GlobalKey<FormFieldState>();
  final _confirmPasswordKey = GlobalKey<FormFieldState>();

  bool _showPassword = false;
  bool _showConfirmPassword = false;

  @override
  void initState() {
    super.initState();
    BuyerRegistrationErrorStore.instance.addListener(_onServerErrorsChanged);
    _emailController.text = widget.contactData?['email']?.toString() ?? '';
  }

  @override
  void dispose() {
    BuyerRegistrationErrorStore.instance.removeListener(_onServerErrorsChanged);
    _emailController.dispose();
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
    final isEmailValid = _emailKey.currentState?.validate() ?? false;
    _confirmPasswordKey.currentState?.validate();
    final isConfirmValid =
        _confirmPasswordController.text == _passwordController.text;
    if (!isEmailValid || !isPasswordValid || !isConfirmValid) return;
    final contactData = Map<String, dynamic>.from(widget.contactData ?? {})
      ..['email'] = _emailController.text.trim();
    Navigator.pushNamed(
      context,
      '/register_id',
      arguments: {
        'personalData': widget.personalData ?? {},
        'contactData': contactData,
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
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: screenWidth * 0.05,
            vertical: screenHeight * 0.02,
          ),
          child: RegistrationCard(
            child: Form(
              key: _formKey,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // STEPPER
                  _buildStepper(currentStep: 3),
                  const SizedBox(height: 22),

                  // DESCRIPTION
                  const Text(
                    'Account security',
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Create the login credentials you will use for CRYMA.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 18),

                  _buildEmailField(),
                  const SizedBox(height: 14),

                  _buildPasswordField(
                    controller: _passwordController,
                    showPassword: _showPassword,
                    label: 'Password *',
                    hintText: 'At least 8 characters',
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
                      BuyerRegistrationErrorStore.instance
                          .clearField('password');
                      setState(() {});
                      if (_confirmPasswordController.text.isNotEmpty) {
                        _confirmPasswordKey.currentState?.validate();
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  _buildPasswordStrength(),
                  const SizedBox(height: 16),

                  _buildPasswordField(
                    controller: _confirmPasswordController,
                    showPassword: _showConfirmPassword,
                    label: 'Confirm password *',
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
      ),
    );
  }

  // ============================================================
  // STEPPER
  // ============================================================
  Widget _buildStepper({required int currentStep}) {
    return RegistrationProgressHeader(currentStep: currentStep);
  }

  Widget _buildEmailField() {
    return TextFormField(
      key: _emailKey,
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      autocorrect: false,
      enableSuggestions: false,
      validator: (value) =>
          BuyerRegistrationErrorStore.instance.errorFor('email') ??
          BuyerRegistrationRules.validateEmail(value),
      inputFormatters: [
        LengthLimitingTextInputFormatter(
          BuyerRegistrationRules.maxEmailLength,
        ),
        FilteringTextInputFormatter.deny(RegExp(r'\s')),
      ],
      onChanged: (_) =>
          BuyerRegistrationErrorStore.instance.clearField('email'),
      style: const TextStyle(
        fontSize: 14,
        color: AppColors.darkGray,
        fontFamily: 'Poppins',
      ),
      decoration: _fieldDecoration(
        label: 'Email address *',
        hintText: 'you@example.com',
        icon: Icons.alternate_email_rounded,
      ),
    );
  }

  InputDecoration _fieldDecoration({
    required String label,
    required String hintText,
    required IconData icon,
    Widget? suffixIcon,
  }) {
    OutlineInputBorder border(Color color, [double width = 1]) =>
        OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: color, width: width),
        );

    return InputDecoration(
      labelText: label,
      hintText: hintText,
      floatingLabelBehavior: FloatingLabelBehavior.auto,
      filled: true,
      fillColor: Colors.white,
      prefixIcon: Icon(icon, color: AppColors.gray),
      suffixIcon: suffixIcon,
      suffixIconConstraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 19),
      labelStyle: const TextStyle(
        color: AppColors.gray,
        fontSize: 13,
        fontFamily: 'Poppins',
      ),
      floatingLabelStyle: const TextStyle(
        color: AppColors.primary,
        fontWeight: FontWeight.w600,
        fontSize: 13,
        fontFamily: 'Poppins',
      ),
      hintStyle: const TextStyle(
        color: AppColors.textSubtle,
        fontSize: 13,
        fontFamily: 'Poppins',
      ),
      border: border(AppColors.lightGray),
      enabledBorder: border(AppColors.lightGray),
      focusedBorder: border(AppColors.primary, 1.5),
      errorBorder: border(AppColors.danger),
      focusedErrorBorder: border(AppColors.danger, 1.5),
      errorStyle: const TextStyle(
        fontSize: 11,
        fontFamily: 'Poppins',
        height: 1.3,
      ),
      errorMaxLines: 2,
    );
  }

  Widget _buildPasswordStrength() {
    final password = _passwordController.text;
    final checks = [
      password.runes.length >= 8,
      RegExp(r'[A-Za-z]').hasMatch(password),
      RegExp(r'\d').hasMatch(password),
      RegExp(r'[^A-Za-z0-9]').hasMatch(password),
    ];
    final score = password.isEmpty ? 0 : checks.where((check) => check).length;
    final label = switch (score) {
      0 => 'Use at least 8 characters',
      1 => 'Weak password',
      2 => 'Fair password',
      3 => 'Good password',
      _ => 'Strong password',
    };
    final color = switch (score) {
      0 => AppColors.lightGray,
      1 => const Color(0xFFE2B458),
      2 => const Color(0xFFD19A38),
      _ => AppColors.success,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(4, (index) {
            return Expanded(
              child: Container(
                height: 5,
                margin: EdgeInsets.only(right: index == 3 ? 0 : 6),
                decoration: BoxDecoration(
                  color: index < score ? color : AppColors.lightGray,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: index < score
                      ? [
                          BoxShadow(
                            color: color.withValues(alpha: .35),
                            blurRadius: 7,
                          ),
                        ]
                      : null,
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 7),
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: password.isEmpty ? AppColors.gray : color,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '$score/4',
              style: const TextStyle(
                color: AppColors.gray,
                fontSize: 11,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required bool showPassword,
    required String label,
    required String hintText,
    required VoidCallback onToggle,
    required ValueChanged<String> onChanged,
    String? Function(String?)? validator,
    GlobalKey<FormFieldState>? fieldKey,
  }) {
    return TextFormField(
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
        fontSize: 14,
        color: AppColors.darkGray,
        fontFamily: 'Poppins',
      ),
      decoration: _fieldDecoration(
        label: label,
        hintText: hintText,
        icon: Icons.lock_outline_rounded,
        suffixIcon: IconButton(
          tooltip: showPassword ? 'Hide password' : 'Show password',
          onPressed: onToggle,
          icon: Icon(
            showPassword
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
            color: AppColors.gray,
          ),
        ),
      ),
    );
  }
}
