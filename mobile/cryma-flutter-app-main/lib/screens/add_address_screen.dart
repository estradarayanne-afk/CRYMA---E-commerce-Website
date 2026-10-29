import 'package:flutter/material.dart';
import '../utils/colors.dart';

class AddAddressScreen extends StatefulWidget {
  const AddAddressScreen({super.key});

  @override
  State<AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends State<AddAddressScreen> {
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _contactController = TextEditingController();
  final TextEditingController _houseController = TextEditingController();
  final TextEditingController _streetController = TextEditingController();
  final TextEditingController _landmarkController = TextEditingController();

  String _selectedProvince = '';
  String _selectedMunicipality = '';
  String _selectedBarangay = '';
  bool _isDefault = false;

  bool _showProvince = false;
  bool _showMunicipality = false;
  bool _showBarangay = false;

  // ============================================================
  // PHILIPPINES DATA
  // ============================================================
  final List<String> _provinces = const [
    'Laguna',
    'Metro Manila',
    'Cebu',
    'Davao',
    'Pampanga',
    'Batangas',
    'Cavite',
    'Rizal',
    'Bulacan',
  ];

  final Map<String, List<String>> _municipalities = const {
    'Laguna': [
      'Santa Cruz',
      'Calamba',
      'San Pablo',
      'Santa Rosa',
      'Biñan',
      'Cabuyao',
      'San Pedro',
    ],
    'Metro Manila': [
      'Manila',
      'Quezon City',
      'Makati',
      'Pasig',
      'Taguig',
      'Mandaluyong',
    ],
    'Cebu': ['Cebu City', 'Mandaue', 'Lapu-Lapu', 'Talisay'],
    'Davao': ['Davao City', 'Digos', 'Tagum'],
    'Pampanga': ['Angeles City', 'San Fernando', 'Mabalacat'],
    'Batangas': ['Batangas City', 'Lipa', 'Tanauan'],
    'Cavite': ['Dasmariñas', 'Bacoor', 'Imus'],
    'Rizal': ['Antipolo', 'Cainta', 'Taytay'],
    'Bulacan': ['Malolos', 'Meycauayan', 'San Jose del Monte'],
  };

  final Map<String, List<String>> _barangays = const {
    'Santa Cruz': [
      'Poblacion I',
      'Poblacion II',
      'Poblacion III',
      'Poblacion IV'
    ],
    'Calamba': ['Barandal', 'Canlubang', 'Makiling', 'Pansol'],
    'San Pablo': ['Bayan', 'San Jose', 'San Miguel', 'Santa Ana'],
    'Santa Rosa': ['Tagapo', 'Dita', 'Malusak', 'Balibago'],
    'Biñan': ['Poblacion', 'San Antonio', 'San Francisco', 'San Jose'],
    'Cabuyao': ['Poblacion', 'Baclaran', 'Bigaa', 'Butong'],
    'San Pedro': ['Poblacion', 'San Antonio', 'San Francisco', 'San Jose'],
    'Manila': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Quezon City': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Makati': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Pasig': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Taguig': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Mandaluyong': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Cebu City': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Mandaue': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Lapu-Lapu': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Talisay': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Davao City': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Digos': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Tagum': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Angeles City': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'San Fernando': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Mabalacat': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Batangas City': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Lipa': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Tanauan': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Dasmariñas': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Bacoor': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Imus': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Antipolo': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Cainta': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Taytay': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Malolos': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'Meycauayan': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'],
    'San Jose del Monte': [
      'Barangay 1',
      'Barangay 2',
      'Barangay 3',
      'Barangay 4'
    ],
  };

  List<String> _getMunicipalities() {
    return _municipalities[_selectedProvince] ?? [];
  }

  List<String> _getBarangays() {
    return _barangays[_selectedMunicipality] ?? [];
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

  void _handleSave() {
    if (_fullNameController.text.isEmpty ||
        _contactController.text.isEmpty ||
        _selectedProvince.isEmpty ||
        _selectedMunicipality.isEmpty ||
        _selectedBarangay.isEmpty) {
      _showAlert('Please fill in all required fields.');
      return;
    }

    final addressData = {
      'fullName': _fullNameController.text,
      'contact': _contactController.text,
      'province': _selectedProvince,
      'municipality': _selectedMunicipality,
      'barangay': _selectedBarangay,
      'houseNumber': _houseController.text,
      'street': _streetController.text,
      'landmark': _landmarkController.text,
      'isDefault': _isDefault,
    };

    // ignore: avoid_print
    print('Address saved: $addressData');
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back,
                        size: 24, color: AppColors.primary),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Expanded(
                    child: Text(
                      'Add New Address',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),

            // BODY
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // FULL NAME
                    _buildLabel('FULL NAME *'),
                    _buildTextField(
                      controller: _fullNameController,
                      hintText: 'Juan Dela Cruz',
                    ),
                    const SizedBox(height: 12),

                    // CONTACT NUMBER
                    _buildLabel('CONTACT NUMBER *'),
                    _buildTextField(
                      controller: _contactController,
                      hintText: '+63 9XX XXX XXXX',
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),

                    // DIVIDER
                    const Divider(color: AppColors.lightGray),

                    // PROVINCE
                    _buildLabel('PROVINCE *'),
                    _buildDropdown(
                      value: _selectedProvince,
                      hint: 'Select province',
                      isOpen: _showProvince,
                      items: _provinces,
                      onToggle: () =>
                          setState(() => _showProvince = !_showProvince),
                      onSelect: (value) {
                        setState(() {
                          _selectedProvince = value;
                          _selectedMunicipality = '';
                          _selectedBarangay = '';
                          _showProvince = false;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // MUNICIPALITY
                    _buildLabel('MUNICIPALITY / CITY *'),
                    _buildDropdown(
                      value: _selectedMunicipality,
                      hint: 'Select municipality',
                      isOpen: _showMunicipality,
                      items: _getMunicipalities(),
                      isDisabled: _selectedProvince.isEmpty,
                      onToggle: () {
                        if (_selectedProvince.isEmpty) {
                          _showAlert('Please select a province first.');
                        } else {
                          setState(
                              () => _showMunicipality = !_showMunicipality);
                        }
                      },
                      onSelect: (value) {
                        setState(() {
                          _selectedMunicipality = value;
                          _selectedBarangay = '';
                          _showMunicipality = false;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // BARANGAY
                    _buildLabel('BARANGAY *'),
                    _buildDropdown(
                      value: _selectedBarangay,
                      hint: 'Select barangay',
                      isOpen: _showBarangay,
                      items: _getBarangays(),
                      isDisabled: _selectedMunicipality.isEmpty,
                      onToggle: () {
                        if (_selectedMunicipality.isEmpty) {
                          _showAlert('Please select a municipality first.');
                        } else {
                          setState(() => _showBarangay = !_showBarangay);
                        }
                      },
                      onSelect: (value) {
                        setState(() {
                          _selectedBarangay = value;
                          _showBarangay = false;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // DIVIDER
                    const Divider(color: AppColors.lightGray),

                    // HOUSE / UNIT NO.
                    _buildLabel('HOUSE / UNIT NO.'),
                    _buildTextField(
                      controller: _houseController,
                      hintText: '123',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),

                    // STREET
                    _buildLabel('STREET'),
                    _buildTextField(
                      controller: _streetController,
                      hintText: 'Sampaguita Street',
                    ),
                    const SizedBox(height: 12),

                    // LANDMARK / OTHER DETAILS
                    _buildLabel('LANDMARK / OTHER DETAILS'),
                    _buildTextField(
                      controller: _landmarkController,
                      hintText: 'Near the church...',
                    ),
                    const SizedBox(height: 16),

                    // SET AS DEFAULT ADDRESS - CHECKBOX
                    GestureDetector(
                      onTap: () => setState(() => _isDefault = !_isDefault),
                      child: Row(
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color:
                                  _isDefault ? AppColors.primary : Colors.white,
                              border: Border.all(
                                color: _isDefault
                                    ? AppColors.primary
                                    : AppColors.gray,
                                width: 2,
                              ),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: _isDefault
                                ? const Icon(Icons.check,
                                    size: 14, color: Colors.white)
                                : null,
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Set as default address',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.darkGray,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),

                    // SAVE ADDRESS BUTTON
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _handleSave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Save Address',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // LABEL
  // ============================================================
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
  // TEXT FIELD
  // ============================================================
  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(
          fontSize: 14,
          color: AppColors.darkGray,
          fontFamily: 'Poppins',
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(
            fontSize: 14,
            color: AppColors.gray,
            fontFamily: 'Poppins',
          ),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  // ============================================================
  // DROPDOWN
  // ============================================================
  Widget _buildDropdown({
    required String value,
    required String hint,
    required bool isOpen,
    required List<String> items,
    required VoidCallback onToggle,
    required Function(String) onSelect,
    bool isDisabled = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: isDisabled ? null : onToggle,
          child: Container(
            decoration: BoxDecoration(
              color: isDisabled ? AppColors.lightGray : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isDisabled ? AppColors.lightGray : AppColors.lightGray,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  value.isEmpty ? hint : value,
                  style: TextStyle(
                    fontSize: 14,
                    color: value.isEmpty ? AppColors.gray : AppColors.darkGray,
                    fontFamily: 'Poppins',
                  ),
                ),
                Icon(
                  isOpen ? Icons.arrow_drop_up : Icons.arrow_drop_down,
                  color: AppColors.gray,
                ),
              ],
            ),
          ),
        ),
        if (isOpen && items.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            constraints: const BoxConstraints(maxHeight: 150),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.lightGray),
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                return GestureDetector(
                  onTap: () => onSelect(item),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        vertical: 12, horizontal: 14),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: index == items.length - 1
                              ? Colors.transparent
                              : AppColors.lightGray,
                        ),
                      ),
                    ),
                    child: Text(
                      item,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
