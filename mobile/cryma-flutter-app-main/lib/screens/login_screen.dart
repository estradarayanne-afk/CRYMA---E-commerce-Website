import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../utils/auth_widgets.dart';
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
    } catch (error, stackTrace) {
      debugPrint('Buyer sign-in failed unexpectedly: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Unable to reach CRYMA. Check your connection and API URL.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Column(
                  children: [
                    _LoginBrandHeader(height: constraints.maxHeight * .28),
                    Transform.translate(
                      offset: const Offset(0, -42),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 520),
                          child: _loginCard(context),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.verified_user_outlined,
                              size: 17, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'A secure and seamless shopping experience.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppColors.textSecondary
                                    .withValues(alpha: .8),
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

  Widget _loginCard(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(20, 23, 20, 17),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: AppColors.lightGray.withValues(alpha: .7)),
          boxShadow: [
            BoxShadow(
              color: AppColors.wine.withValues(alpha: .08),
              blurRadius: 28,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Welcome Back',
                style: TextStyle(
                  color: AppColors.wine,
                  fontSize: 27,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -.7,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Sign in to continue your CRYMA experience.',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 20),
              _buildInputField(
                label: 'EMAIL ADDRESS',
                controller: _emailController,
                hintText: 'Enter your email address',
                icon: Icons.alternate_email_rounded,
                keyboardType: TextInputType.emailAddress,
                validator: AppValidators.email,
                inputFormatters: [LengthLimitingTextInputFormatter(100)],
              ),
              const SizedBox(height: 12),
              _buildInputField(
                label: 'PASSWORD',
                controller: _passwordController,
                hintText: 'Enter your password',
                icon: Icons.lock_outline_rounded,
                obscureText: !_showPassword,
                validator: (value) => value == null || value.isEmpty
                    ? 'Password is required'
                    : null,
                inputFormatters: [LengthLimitingTextInputFormatter(128)],
                suffixIcon: IconButton(
                  tooltip: _showPassword ? 'Hide password' : 'Show password',
                  onPressed: () =>
                      setState(() => _showPassword = !_showPassword),
                  icon: Icon(
                    _showPassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () =>
                      Navigator.pushNamed(context, '/forgot_password'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryDark,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  child: const Text('Forgot password?',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton.icon(
                  onPressed: _isSubmitting ? null : _handleLogin,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 19,
                          height: 19,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.arrow_forward_rounded),
                  label: const Text('Login'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    textStyle: const TextStyle(
                        fontWeight: FontWeight.w700, letterSpacing: 1.2),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15)),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const _OrDivider(),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 58,
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(
                      context, '/home', (_) => false),
                  icon: const Icon(Icons.shopping_bag_outlined),
                  label: const Text('CONTINUE AS GUEST'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primaryDark,
                    side: const BorderSide(
                        color: AppColors.lightGray, width: 1.4),
                    textStyle: const TextStyle(
                        fontWeight: FontWeight.w700, letterSpacing: .8),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const Text('Don’t have an account? ',
                        style: TextStyle(color: AppColors.textSecondary)),
                    TextButton(
                      onPressed: () =>
                          Navigator.pushNamed(context, '/register_personal'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primaryDark,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 4, vertical: 8),
                      ),
                      child: const Text('Create account',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
    Widget? suffixIcon,
  }) =>
      TextFormField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        autocorrect: false,
        enableSuggestions: !obscureText,
        validator: validator,
        inputFormatters: inputFormatters,
        style: const TextStyle(color: AppColors.wine, fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          hintText: hintText,
          prefixIcon: Icon(icon, color: AppColors.primary),
          suffixIcon: suffixIcon,
          filled: true,
          fillColor: AppColors.background,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.lightGray),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.lightGray),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: AppColors.danger),
          ),
        ),
      );
}

class _LoginBrandHeader extends StatelessWidget {
  const _LoginBrandHeader({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) => Container(
        height: height.clamp(240.0, 320.0),
        width: double.infinity,
        clipBehavior: Clip.antiAlias,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFA82748), AppColors.primaryDark],
          ),
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(58)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Positioned(
              left: -120,
              top: 60,
              child: _HeaderRing(size: 240),
            ),
            const Positioned(
              right: -130,
              top: -120,
              child: _HeaderRing(size: 310),
            ),
            const Positioned(
              right: -110,
              bottom: -190,
              child: _HeaderRing(size: 310),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CrymaWordmark(
                    logoSize: 76,
                    fontSize: 32,
                    color: Colors.white,
                    onBrandSurface: true),
                const SizedBox(height: 12),
                Text(
                  'YOUR STYLE. YOUR EVERYDAY.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .78),
                    fontSize: 10,
                    letterSpacing: 3.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

class _HeaderRing extends StatelessWidget {
  const _HeaderRing({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: .09)),
        ),
      );
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) => Row(
        children: [
          const Expanded(child: Divider(color: AppColors.lightGray)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Text(
              'OR',
              style: TextStyle(
                color: AppColors.textSecondary.withValues(alpha: .7),
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
              ),
            ),
          ),
          const Expanded(child: Divider(color: AppColors.lightGray)),
        ],
      );
}
