import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/user_provider.dart';
import '../../utils/validators.dart';
import '../../widgets/custom_text_field.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({Key? key}) : super(key: key);

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    final userProvider = context.read<UserProvider>();
    _firstNameController = TextEditingController(
      text: userProvider.userProfile?.firstName ?? '',
    );
    _lastNameController = TextEditingController(
      text: userProvider.userProfile?.lastName ?? '',
    );
    _phoneController = TextEditingController(
      text: userProvider.userProfile?.phone ?? '',
    );
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              CustomTextField(
                label: 'First Name',
                controller: _firstNameController,
                validator: (v) => Validators.validateName(v),
                maxLength: 50,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Last Name',
                controller: _lastNameController,
                validator: (v) => Validators.validateName(v),
                maxLength: 50,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Phone',
                controller: _phoneController,
                validator: (v) => Validators.validatePhone(v),
                maxLength: 11,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Profile updated successfully'),
                        ),
                      );
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Save Changes'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
