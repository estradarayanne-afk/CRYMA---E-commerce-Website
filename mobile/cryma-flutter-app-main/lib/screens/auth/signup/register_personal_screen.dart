import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../../utils/auth_widgets.dart';
import '../../../utils/buyer_registration.dart';
import '../../../utils/colors.dart';

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
      '/register_address',
      arguments: {'personalData': formData},
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
                  _buildStepper(currentStep: 1),
                  const SizedBox(height: 22),

                  // INTRO TEXT
                  const Text(
                    'Personal information',
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Tell us a little about yourself.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 18),

                  // FIRST NAME
                  _buildLabel('FIRST NAME *'),
                  _buildTextField(
                    controller: _firstNameController,
                    hintText: 'Juan',
                    validator: (value) =>
                        _serverError('first_name') ??
                        BuyerRegistrationRules.validateName(value),
                    inputFormatters: [
                      CapitalizeNameWordsFormatter(),
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
                      CapitalizeNameWordsFormatter(),
                      LengthLimitingTextInputFormatter(2),
                    ],
                    onChanged: (_) => BuyerRegistrationErrorStore.instance
                        .clearField('middle_name'),
                  ),
                  const SizedBox(height: 10),

                  // LAST NAME
                  _buildLabel('LAST NAME *'),
                  _buildTextField(
                    controller: _lastNameController,
                    hintText: 'Dela Cruz',
                    validator: (value) =>
                        _serverError('last_name') ??
                        BuyerRegistrationRules.validateName(value),
                    inputFormatters: [
                      CapitalizeNameWordsFormatter(),
                      LengthLimitingTextInputFormatter(30),
                    ],
                    onChanged: (_) => BuyerRegistrationErrorStore.instance
                        .clearField('last_name'),
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
                  if (_serverError('birthday') != null ||
                      _birthdayError != null)
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
                      textAlign: TextAlign.center,
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
                  Center(
                    child: TextButton.icon(
                      onPressed: () =>
                          Navigator.pushReplacementNamed(context, '/login'),
                      icon: const Icon(Icons.login_rounded, size: 17),
                      label: const Text('Already have an account? Sign in'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primaryDark,
                        textStyle: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ),
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
  // SEX OPTIONS
  // ============================================================
  Widget _buildSexDropdown() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _sexOptions.map((option) {
        final selected = _selectedSex == option;
        return ChoiceChip(
          label: Text(option),
          selected: selected,
          showCheckmark: false,
          onSelected: (_) {
            setState(() {
              _selectedSex = option;
              _sexError = null;
            });
            BuyerRegistrationErrorStore.instance.clearField('sex');
          },
          backgroundColor: Colors.white,
          selectedColor: AppColors.softRose,
          side: BorderSide(
            color: selected ? AppColors.primary : AppColors.lightGray,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          labelStyle: TextStyle(
            color: selected ? AppColors.primary : AppColors.darkGray,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            fontFamily: 'Poppins',
          ),
        );
      }).toList(),
    );
  }

  // ============================================================
  // DATE PICKER
  // ============================================================
  Widget _buildDatePicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () async {
            final latestEligibleBirthday =
                BuyerRegistrationRules.latestEligibleBirthday();
            final selectedBirthday =
                DateTime.tryParse(_birthdayController.text);
            final initialDate = selectedBirthday != null &&
                    !selectedBirthday.isAfter(latestEligibleBirthday)
                ? selectedBirthday
                : latestEligibleBirthday;
            final DateTime? picked = await showDatePicker(
              context: context,
              initialDate: initialDate,
              firstDate: DateTime(1900),
              lastDate: latestEligibleBirthday,
              helpText: 'CHOOSE AN ELIGIBLE BIRTHDAY',
              builder: (context, child) {
                final theme = Theme.of(context);
                return Theme(
                  data: theme.copyWith(
                    colorScheme: theme.colorScheme.copyWith(
                      primary: AppColors.primary,
                      onPrimary: AppColors.white,
                      surface: AppColors.white,
                      onSurface: AppColors.darkGray,
                    ),
                    datePickerTheme: DatePickerThemeData(
                      backgroundColor: AppColors.white,
                      headerBackgroundColor: AppColors.primary,
                      headerForegroundColor: AppColors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      todayBorder: const BorderSide(
                        color: AppColors.floralPink,
                        width: 1.5,
                      ),
                      cancelButtonStyle: TextButton.styleFrom(
                        foregroundColor: AppColors.gray,
                      ),
                      confirmButtonStyle: TextButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        textStyle: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  child: child!,
                );
              },
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
                    : AppColors.primary,
                width: _birthdayController.text.isEmpty ? 1 : 1.4,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: _birthdayController.text.isEmpty
                  ? null
                  : [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _birthdayController.text.isEmpty
                      ? 'MM / DD / YYYY'
                      : DateFormat('MMMM d, yyyy').format(
                          DateTime.parse(_birthdayController.text),
                        ),
                  style: TextStyle(
                    fontSize: 13,
                    color: _birthdayController.text.isEmpty
                        ? AppColors.gray
                        : AppColors.darkGray,
                    fontWeight: _birthdayController.text.isEmpty
                        ? FontWeight.w400
                        : FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
                const Icon(
                  Icons.calendar_month_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
        const Padding(
          padding: EdgeInsets.only(top: 6, left: 4),
          child: Text(
            'You must be at least 13 years old to register.',
            style: TextStyle(
              color: AppColors.gray,
              fontSize: 10,
              fontFamily: 'Poppins',
            ),
          ),
        ),
      ],
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
