import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';
import '../utils/validators.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  final _formKey = GlobalKey<FormState>();

  bool _showPassword = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_isSubmitting || !(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isSubmitting = true);
    try {
      await ApiService.instance.login(
        _emailController.text,
        _passwordController.text,
      );
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/home', (_) => false);
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Unable to reach CRYMA. Check your connection and API URL.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    // Responsive sizing
    final titleFontSize = screenWidth * 0.09;
    final headingFontSize = screenWidth * 0.055;
    final subtitleFontSize = screenWidth * 0.035;
    final labelFontSize = screenWidth * 0.03;
    final inputFontSize = screenWidth * 0.038;
    final buttonFontSize = screenWidth * 0.04;
    final linkFontSize = screenWidth * 0.035;
    final iconSize = screenWidth * 0.05;

    final inputHeight = screenHeight * 0.065;
    final buttonHeight = screenHeight * 0.07;
    final buttonRadius = buttonHeight / 2;

    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          // ✅ FIX: Scrollable na
          padding: EdgeInsets.symmetric(
            horizontal: screenWidth * 0.06,
            vertical: screenHeight * 0.03,
          ),
          child: Form(
            // ✅ NEW: Form wrapper
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction, // ✅ NEW
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(height: screenHeight * 0.05), // ✅ Spacer sa taas
                // CRYMA Logo
                Text(
                  'CRYMA',
                  style: TextStyle(
                    fontSize: titleFontSize,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                    letterSpacing: titleFontSize * 0.08,
                  ),
                ),
                const SizedBox(height: 10),
                // Welcome Back
                Text(
                  'Welcome Back',
                  style: TextStyle(
                    fontSize: headingFontSize,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 4),
                // Subtitle
                Text(
                  'Sign in to your account',
                  style: TextStyle(
                    fontSize: subtitleFontSize,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 24),

                // EMAIL ADDRESS Label
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'EMAIL ADDRESS',
                    style: TextStyle(
                      fontSize: labelFontSize,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
                const SizedBox(height: 4),

                // ✅ UPDATED: Email Input with validation
                _buildInputField(
                  controller: _emailController,
                  hintText: 'your@email.com',
                  icon: Icons.email_outlined,
                  inputHeight: inputHeight,
                  inputFontSize: inputFontSize,
                  iconSize: iconSize,
                  keyboardType: TextInputType.emailAddress,
                  validator: AppValidators.email, // ✅ NEW
                  inputFormatters: [LengthLimitingTextInputFormatter(100)],
                ),
                const SizedBox(height: 12),

                // PASSWORD Label
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'PASSWORD',
                    style: TextStyle(
                      fontSize: labelFontSize,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
                const SizedBox(height: 4),

                // ✅ UPDATED: Password Input with validation
                _buildInputField(
                  controller: _passwordController,
                  hintText: '********',
                  icon: Icons.lock_outline,
                  inputHeight: inputHeight,
                  inputFontSize: inputFontSize,
                  iconSize: iconSize,
                  obscureText: !_showPassword,
                  validator: (value) {
                    // ✅ Simple validation for login
                    if (value == null || value.isEmpty) {
                      return 'Password is required';
                    }
                    return null;
                  },
                  inputFormatters: [LengthLimitingTextInputFormatter(128)],
                  suffixIcon: GestureDetector(
                    onTap: () {
                      setState(() {
                        _showPassword = !_showPassword;
                      });
                    },
                    child: Icon(
                      _showPassword ? Icons.visibility : Icons.visibility_off,
                      color: AppColors.gray,
                      size: iconSize,
                    ),
                  ),
                ),
                const SizedBox(height: 4),

                // Forgot Password
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pushNamed(context, '/forgot_password');
                    },
                    child: Text(
                      'Forgot Password?',
                      style: TextStyle(
                        fontSize: labelFontSize,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // ✅ UPDATED: Login Button with _handleLogin
                SizedBox(
                  width: double.infinity,
                  height: buttonHeight,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(buttonRadius),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.white,
                            ),
                          )
                        : Text(
                            'Login',
                            style: TextStyle(
                              fontSize: buttonFontSize,
                              fontWeight: FontWeight.w600,
                              color: AppColors.white,
                              fontFamily: 'Poppins',
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 16),

                // Create Account Link
                Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: TextStyle(
                        fontSize: linkFontSize,
                        color: AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pushNamed(context, '/register_personal');
                      },
                      child: Text(
                        'Create Account',
                        style: TextStyle(
                          fontSize: linkFontSize,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Divider
                Row(
                  children: [
                    Expanded(
                      child: Container(height: 1, color: AppColors.lightGray),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'or continue with',
                        style: TextStyle(
                          fontSize: labelFontSize,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                    Expanded(
                      child: Container(height: 1, color: AppColors.lightGray),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Social Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildSocialButton(
                      icon: Icons.g_mobiledata,
                      label: 'Google',
                      color: '#DB4437',
                      size: screenWidth * 0.05,
                      buttonSize: screenHeight * 0.065,
                    ),
                    const SizedBox(width: 12),
                    _buildSocialButton(
                      icon: Icons.facebook,
                      label: 'Facebook',
                      color: '#1877F2',
                      size: screenWidth * 0.05,
                      buttonSize: screenHeight * 0.065,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ============================================================
  // ✅ NEW: Reusable Input Field (may validation)
  // ============================================================
  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    required double inputHeight,
    required double inputFontSize,
    required double iconSize,
    TextInputType? keyboardType,
    bool obscureText = false,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
    Widget? suffixIcon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.lightGray),
        borderRadius: BorderRadius.circular(inputHeight / 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(width: 14),
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Icon(icon, color: AppColors.gray, size: iconSize),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextFormField(
              // ✅ UPDATED: TextField → TextFormField
              controller: controller,
              obscureText: obscureText,
              keyboardType: keyboardType,
              autocorrect: false,
              validator: validator,
              inputFormatters: inputFormatters,
              style: TextStyle(
                fontSize: inputFontSize,
                fontFamily: 'Poppins',
                color: AppColors.darkGray,
              ),
              decoration: InputDecoration(
                hintText: hintText,
                hintStyle: TextStyle(
                  fontSize: inputFontSize,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                errorStyle: TextStyle(
                  fontSize: inputFontSize * 0.75,
                  fontFamily: 'Poppins',
                  height: 1.2,
                ),
              ),
            ),
          ),
          if (suffixIcon != null)
            Padding(
              padding: const EdgeInsets.only(top: 8, right: 14),
              child: suffixIcon,
            )
          else
            const SizedBox(width: 14),
        ],
      ),
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required String label,
    required String color,
    required double size,
    required double buttonSize,
  }) {
    return Container(
      width: buttonSize,
      height: buttonSize,
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.lightGray),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Center(
        child: Icon(
          icon,
          color: Color(int.parse('0xFF${color.substring(1)}')),
          size: size,
        ),
      ),
    );
  }
}
