import 'package:flutter/material.dart';
import '../../utils/validators.dart';
import '../../widgets/custom_text_field.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({Key? key}) : super(key: key);

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CustomTextField(
                label: 'Current Password',
                controller: _currentPasswordController,
                obscureText: !_showCurrentPassword,
                validator: (v) =>
                    v?.isEmpty ?? true ? 'Password is required' : null,
                suffixIcon: IconButton(
                  icon: Icon(_showCurrentPassword
                      ? Icons.visibility
                      : Icons.visibility_off),
                  onPressed: () =>
                      setState(() => _showCurrentPassword = !_showCurrentPassword),
                ),
              ),
              const SizedBox(height: 24),
              CustomTextField(
                label: 'New Password',
                controller: _newPasswordController,
                obscureText: !_showNewPassword,
                validator: (v) => Validators.validatePassword(v),
                suffixIcon: IconButton(
                  icon: Icon(
                      _showNewPassword ? Icons.visibility : Icons.visibility_off),
                  onPressed: () =>
                      setState(() => _showNewPassword = !_showNewPassword),
                ),
              ),
              const SizedBox(height: 24),
              CustomTextField(
                label: 'Confirm New Password',
                controller: _confirmPasswordController,
                obscureText: !_showConfirmPassword,
                validator: (v) => Validators.validatePasswordConfirm(
                  v,
                  _newPasswordController.text,
                ),
                suffixIcon: IconButton(
                  icon: Icon(_showConfirmPassword
                      ? Icons.visibility
                      : Icons.visibility_off),
                  onPressed: () => setState(
                      () => _showConfirmPassword = !_showConfirmPassword),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Password changed successfully'),
                        ),
                      );
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Change Password'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
