import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../utils/auth_widgets.dart';
import '../utils/buyer_registration.dart';
import '../utils/colors.dart';

class RegisterPersonalScreen extends StatefulWidget {
  const RegisterPersonalScreen({super.key});

  @override
  State<RegisterPersonalScreen> createState() => _RegisterPersonalScreenState();
}

class _RegisterPersonalScreenState extends State<RegisterPersonalScreen> {
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _middleInitialController =
      TextEditingController();
  final TextEditingController _birthdayController = TextEditingController();
  final TextEditingController _ageController = TextEditingController();

  final _formKey = GlobalKey<FormState>();

  String _selectedSex = '';
  bool _showSexDropdown = false;
  String? _sexError;
  String? _birthdayError;

  final List<String> _sexOptions = ['Male', 'Female', 'Prefer not to say'];

  @override
  void initState() {
    super.initState();
    BuyerRegistrationErrorStore.instance.addListener(_onServerErrorsChanged);
  }

  @override
  void dispose() {
    BuyerRegistrationErrorStore.instance.removeListener(_onServerErrorsChanged);
    _lastNameController.dispose();
    _firstNameController.dispose();
    _middleInitialController.dispose();
    _birthdayController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  void _onServerErrorsChanged() {
    if (!mounted) return;
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _formKey.currentState?.validate();
    });
  }

  String? _serverError(String field) =>
      BuyerRegistrationErrorStore.instance.errorFor(field);

  // ============================================================
  // AGE COMPUTATION
  // ============================================================
  void _computeAge(DateTime birthDate) {
    final birthday = DateFormat('yyyy-MM-dd').format(birthDate);
    _ageController.text =
        BuyerRegistrationRules.ageOnDate(birthday)?.toString() ?? '';
  }

  void _onDateSelected(DateTime? date) {
    if (date != null) {
      _birthdayController.text = DateFormat('yyyy-MM-dd').format(date);
      _computeAge(date);
      BuyerRegistrationErrorStore.instance.clearField('birthday');
      setState(() {
        _birthdayError = BuyerRegistrationRules.validateBirthday(
          _birthdayController.text,
        );
      });
    }
  }

  void _handleContinue() {
    final isFormValid = _formKey.currentState?.validate() ?? false;
    setState(() {
      _sexError =
          _selectedSex.isEmpty ? 'Select one of the available options.' : null;
      _birthdayError = BuyerRegistrationRules.validateBirthday(
        _birthdayController.text,
      );
    });
    if (!isFormValid || _selectedSex.isEmpty || _birthdayError != null) return;

    final formData = {
      'lastName': _lastNameController.text.trim(),
      'firstName': _firstNameController.text.trim(),
      'middleInitial': _middleInitialController.text.trim(),
      'sex': _selectedSex.toLowerCase() == 'prefer not to say'
          ? 'prefer_not_to_say'
          : _selectedSex.toLowerCase(),
      'birthday': _birthdayController.text,
      'age': _ageController.text,
    };
    Navigator.pushNamed(
      context,
      '/register_contact',
      arguments: {'personalData': formData},
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
                      icon: const Icon(Icons.arrow_back,
                          color: AppColors.primary),
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
                _buildStepper(currentStep: 1),
                const SizedBox(height: 10),

                // INTRO TEXT
                const Text(
                  'Enter your personal information to get started.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 18),

                // LAST NAME
                _buildLabel('LAST NAME *'),
                _buildTextField(
                  controller: _lastNameController,
                  hintText: 'Dela Cruz',
                  validator: (value) =>
                      _serverError('last_name') ??
                      BuyerRegistrationRules.validateName(value),
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(30),
                  ],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('last_name'),
                ),
                const SizedBox(height: 10),

                // FIRST NAME
                _buildLabel('FIRST NAME *'),
                _buildTextField(
                  controller: _firstNameController,
                  hintText: 'Juan',
                  validator: (value) =>
                      _serverError('first_name') ??
                      BuyerRegistrationRules.validateName(value),
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(30),
                  ],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('first_name'),
                ),
                const SizedBox(height: 10),

                // MIDDLE INITIAL
                _buildLabel('MIDDLE INITIAL'),
                _buildTextField(
                  controller: _middleInitialController,
                  hintText: 'R.',
                  validator: (value) =>
                      _serverError('middle_name') ??
                      BuyerRegistrationRules.validateMiddleInitial(value),
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(2),
                  ],
                  onChanged: (_) => BuyerRegistrationErrorStore.instance
                      .clearField('middle_name'),
                ),
                const SizedBox(height: 10),

                // SEX
                _buildLabel('SEX *'),
                _buildSexDropdown(),
                if (_serverError('sex') != null || _sexError != null)
                  _fieldError(_serverError('sex') ?? _sexError!),
                const SizedBox(height: 10),

                // BIRTHDAY
                _buildLabel('BIRTHDAY *'),
                _buildDatePicker(),
                if (_serverError('birthday') != null || _birthdayError != null)
                  _fieldError(_serverError('birthday') ?? _birthdayError!),
                const SizedBox(height: 10),

                // AGE (AUTO-GENERATED)
                _buildLabel('AGE (AUTO-GENERATED)'),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.lightGray,
                    border: Border.all(color: AppColors.lightGray),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: TextField(
                    controller: _ageController,
                    enabled: false,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                    decoration: const InputDecoration(
                      hintText: '—',
                      hintStyle: TextStyle(
                        fontSize: 13,
                        color: AppColors.gray,
                      ),
                      border: InputBorder.none,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // CONTINUE BUTTON
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _handleContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
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

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
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
  // TEXT FIELD (may validation)
  // ============================================================
  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
    ValueChanged<String>? onChanged,
    int maxLines = 1,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.lightGray),
        borderRadius: BorderRadius.circular(16),
      ),
      child: TextFormField(
        // ✅ UPDATED: TextField → TextFormField
        controller: controller,
        maxLines: maxLines,
        validator: validator,
        inputFormatters: inputFormatters,
        onChanged: onChanged,
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
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          errorStyle: const TextStyle(
            fontSize: 11,
            fontFamily: 'Poppins',
            height: 1.3,
          ),
          errorMaxLines: 2,
        ),
      ),
    );
  }

  // ============================================================
  // SEX DROPDOWN (walang binago)
  // ============================================================
  Widget _buildSexDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () {
            setState(() {
              _showSexDropdown = !_showSexDropdown;
            });
          },
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border.all(color: AppColors.lightGray),
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedSex.isEmpty ? 'Select sex' : _selectedSex,
                  style: TextStyle(
                    fontSize: 13,
                    color: _selectedSex.isEmpty
                        ? AppColors.gray
                        : AppColors.darkGray,
                    fontFamily: 'Poppins',
                  ),
                ),
                Icon(
                  _showSexDropdown
                      ? Icons.arrow_drop_up
                      : Icons.arrow_drop_down,
                  color: AppColors.gray,
                ),
              ],
            ),
          ),
        ),
        if (_showSexDropdown)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border.all(color: AppColors.lightGray),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: _sexOptions.map((option) {
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedSex = option;
                      _showSexDropdown = false;
                      _sexError = null;
                    });
                    BuyerRegistrationErrorStore.instance.clearField('sex');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 14),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: option == _sexOptions.last
                              ? Colors.transparent
                              : AppColors.lightGray,
                        ),
                      ),
                    ),
                    child: Text(
                      option,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  // ============================================================
  // DATE PICKER (walang binago)
  // ============================================================
  Widget _buildDatePicker() {
    return GestureDetector(
      onTap: () async {
        final localToday = DateTime.now().toUtc().add(const Duration(hours: 8));
        final today =
            DateTime(localToday.year, localToday.month, localToday.day);
        final DateTime? picked = await showDatePicker(
          context: context,
          initialDate: today,
          firstDate: DateTime(1900),
          lastDate: today,
        );
        if (picked != null) {
          setState(() {
            _onDateSelected(picked);
          });
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border.all(
            color: _birthdayController.text.isEmpty
                ? AppColors.lightGray
                : AppColors.lightGray,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _birthdayController.text.isEmpty
                  ? 'MM / DD / YYYY'
                  : DateFormat('MM/dd/yyyy').format(
                      DateTime.parse(_birthdayController.text),
                    ),
              style: TextStyle(
                fontSize: 13,
                color: _birthdayController.text.isEmpty
                    ? AppColors.gray
                    : AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
            ),
            const Icon(Icons.calendar_today, color: AppColors.gray, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _fieldError(String message) => Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Text(
          message,
          style: const TextStyle(
            color: AppColors.danger,
            fontSize: 11,
            fontFamily: 'Poppins',
          ),
        ),
      );
}
