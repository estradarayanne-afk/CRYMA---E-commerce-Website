import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/app_config.dart';
import '../../providers/auth_provider.dart';
import '../../utils/validators.dart';
import '../../widgets/custom_text_field.dart';
import 'pending_dialog.dart';
import 'registration_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final authProvider = context.read<AuthProvider>();
      if (await authProvider.restoreSession() && mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    if (success) {
      // Check account status
      if (authProvider.accountStatus == 'pending') {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const PendingDialog(),
        );
      } else if (authProvider.accountStatus == 'active') {
        Navigator.of(context).pushReplacementNamed('/home');
      } else if (authProvider.accountStatus == 'rejected') {
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Application Rejected'),
              content: Text(
                authProvider.rejectionReason ??
                    'Your application was rejected. Please contact support.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo/Header
                  Text(
                    'CRYMA LOGISTICS',
                    style: Theme.of(context).textTheme.displayMedium
                        ?.copyWith(color: AccentColors.maroon),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Rider Application',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 48),

                  // Error message
                  Consumer<AuthProvider>(
                    builder: (context, authProvider, _) {
                      if (authProvider.errorMessage != null) {
                        return Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.red.shade100,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade300),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: Colors.red.shade700,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  authProvider.errorMessage!,
                                  style: TextStyle(
                                    color: Colors.red.shade700,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),

                  // Email field
                  CustomTextField(
                    label: 'Email',
                    hint: 'Enter your email',
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) => Validators.validateEmail(value),
                  ),
                  const SizedBox(height: 16),

                  // Password field
                  Consumer<AuthProvider>(
                    builder: (context, authProvider, _) {
                      return CustomTextField(
                        label: 'Password',
                        controller: _passwordController,
                        obscureText: !_showPassword,
                        validator: (value) => value?.isEmpty ?? true
                            ? 'Password is required'
                            : null,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility
                                : Icons.visibility_off,
                          ),
                          onPressed: () {
                            setState(() => _showPassword = !_showPassword);
                          },
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Login button
                  Consumer<AuthProvider>(
                    builder: (context, authProvider, _) {
                      return SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: authProvider.isLoading
                              ? null
                              : _handleLogin,
                          child: authProvider.isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Login'),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  // Register link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Don't have an account? ",
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => const RegistrationScreen(),
                            ),
                          );
                        },
                        child: const Text('Register'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
