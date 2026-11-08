import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/buyer_address.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';
import '../../utils/philippine_postal_code_lookup.dart';

class AddAddressScreen extends StatefulWidget {
  const AddAddressScreen({super.key, this.address, this.apiService});

  final BuyerAddress? address;
  final ApiService? apiService;

  @override
  State<AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends State<AddAddressScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  final _formKey = GlobalKey<FormState>();
  final _house = TextEditingController();
  final _building = TextEditingController();
  final _unit = TextEditingController();
  final _street = TextEditingController();
  final _postal = TextEditingController();
  List<Map<String, dynamic>> _regions = [];
  List<Map<String, dynamic>> _provinces = [];
  List<Map<String, dynamic>> _cities = [];
  List<Map<String, dynamic>> _barangays = [];
  Map<String, dynamic>? _buyerProfile;
  String? _regionCode;
  String? _provinceCode;
  String? _cityCode;
  String _label = 'home';
  bool _isDefault = false;
  bool _postalCodeGenerated = false;
  bool _postalCodeUnavailable = false;
  bool _loadingPostalCode = false;
  bool _loadingBuyerProfile = true;
  bool _loadingLocations = true;
  bool _locationLoadFailed = false;
  bool _saving = false;
  String? _error;
  String? _profileError;
  Map<String, String> _fieldErrors = {};

  bool get _editing => widget.address != null;

  @override
  void initState() {
    super.initState();
    final address = widget.address;
    if (address != null) {
      _house.text = address.houseNumber;
      _building.text = address.buildingName;
      _unit.text = address.unitNumber;
      _street.text = address.street;
      _postal.text = address.postalCode;
      _label = address.label;
      _isDefault = address.isDefault;
    }
    _loadBuyerProfile();
    _loadLocationOptions();
  }

  @override
  void dispose() {
    _house.dispose();
    _building.dispose();
    _unit.dispose();
    _street.dispose();
    _postal.dispose();
    super.dispose();
  }

  Future<void> _loadBuyerProfile() async {
    try {
      final profile = await _api.getCachedBuyerProfile();
      if (mounted) setState(() => _buyerProfile = profile);
    } on ApiException catch (error) {
      if (mounted) setState(() => _profileError = error.message);
    } finally {
      if (mounted) setState(() => _loadingBuyerProfile = false);
    }
  }

  String get _recipientName {
    final address = widget.address;
    if (address != null) return address.recipientName;
    final profile = _buyerProfile;
    if (profile == null) return '';
    return [
      profile['first_name'],
      profile['middle_name'],
      profile['last_name'],
    ]
        .whereType<String>()
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .join(' ');
  }

  String get _recipientPhone =>
      widget.address?.phone ?? _buyerProfile?['phone']?.toString() ?? '';

  Future<List<Map<String, dynamic>>> _fetchOptions(String path) async {
    return _api.getBuyerAddressOptions(path);
  }

  String _codeFor(List<Map<String, dynamic>> rows, String name) {
    for (final row in rows) {
      if (row['name']?.toString().trim().toLowerCase() ==
          name.trim().toLowerCase()) {
        return row['code'].toString();
      }
    }
    return '';
  }

  Future<void> _loadLocationOptions() async {
    if (mounted) {
      setState(() {
        _loadingLocations = true;
        _error = null;
        _locationLoadFailed = false;
      });
    }
    try {
      final regions = await _fetchOptions('regions');
      if (regions.isEmpty) {
        throw const ApiException('No Philippine regions were returned.');
      }
      if (!mounted) return;
      setState(() => _regions = regions);
      final address = widget.address;
      if (address != null) {
        final regionCode = _codeFor(regions, address.region);
        if (regionCode.isNotEmpty) {
          final provinces =
              await _fetchOptions('regions/$regionCode/provinces');
          final provinceCode = _codeFor(provinces, address.province);
          final cities = provinceCode.isEmpty
              ? <Map<String, dynamic>>[]
              : await _fetchOptions(
                  'regions/$regionCode/provinces/$provinceCode/cities-municipalities');
          final cityCode = _codeFor(cities, address.municipality);
          final barangays = cityCode.isEmpty
              ? <Map<String, dynamic>>[]
              : await _fetchOptions(
                  'regions/$regionCode/provinces/$provinceCode/cities-municipalities/$cityCode/barangays');
          if (!mounted) return;
          setState(() {
            _regionCode = regionCode;
            _provinces = provinces;
            _provinceCode = provinceCode.isEmpty ? null : provinceCode;
            _cities = cities;
            _cityCode = cityCode.isEmpty ? null : cityCode;
            _barangays = barangays;
            _selectedBarangayCode = _codeFor(barangays, address.barangay);
          });
        }
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _locationLoadFailed = true;
          _error = error.message;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _locationLoadFailed = true;
          _error = error is FormatException
              ? error.message
              : 'Unable to load Philippine address options.';
        });
      }
    } finally {
      if (mounted) setState(() => _loadingLocations = false);
    }
  }

  Future<void> _selectRegion(String? code) async {
    if (code == null) return;
    setState(() {
      _regionCode = code;
      _provinceCode = null;
      _cityCode = null;
      _selectedBarangayCode = null;
      _postalCodeGenerated = false;
      _postalCodeUnavailable = false;
      _loadingPostalCode = false;
      _provinces = [];
      _cities = [];
      _barangays = [];
      _postal.clear();
      _error = null;
    });
    try {
      final rows = await _fetchOptions('regions/$code/provinces');
      if (rows.isEmpty) {
        throw const ApiException('No provinces were returned for this region.');
      }
      if (mounted && _regionCode == code) setState(() => _provinces = rows);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _locationLoadFailed = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString();
          _locationLoadFailed = true;
        });
      }
    }
  }

  Future<void> _selectProvince(String? code) async {
    if (code == null || _regionCode == null) return;
    setState(() {
      _provinceCode = code;
      _cityCode = null;
      _selectedBarangayCode = null;
      _postalCodeGenerated = false;
      _postalCodeUnavailable = false;
      _loadingPostalCode = false;
      _cities = [];
      _barangays = [];
      _postal.clear();
      _error = null;
    });
    try {
      final rows = await _fetchOptions(
          'regions/$_regionCode/provinces/$code/cities-municipalities');
      if (rows.isEmpty) {
        throw const ApiException(
            'No cities or municipalities were returned for this province.');
      }
      if (mounted && _provinceCode == code) setState(() => _cities = rows);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _locationLoadFailed = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString();
          _locationLoadFailed = true;
        });
      }
    }
  }

  Future<void> _selectCity(String? code) async {
    if (code == null || _regionCode == null || _provinceCode == null) return;
    setState(() {
      _cityCode = code;
      _selectedBarangayCode = null;
      _barangays = [];
      _postal.clear();
      _postalCodeGenerated = false;
      _postalCodeUnavailable = false;
      _loadingPostalCode = true;
      _error = null;
    });
    final provinceName = _selectedName(_provinces, _provinceCode) ?? '';
    final cityName = _selectedName(_cities, code) ?? '';
    try {
      final rows = await _fetchOptions(
          'regions/$_regionCode/provinces/$_provinceCode/cities-municipalities/$code/barangays');
      if (rows.isEmpty) {
        throw const ApiException(
            'No barangays were returned for this city or municipality.');
      }
      if (mounted && _cityCode == code) setState(() => _barangays = rows);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _locationLoadFailed = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString();
          _locationLoadFailed = true;
        });
      }
    }

    try {
      final postalCode = await PhilippinePostalCodeLookup.forLocality(
        provinceName,
        cityName,
      );
      if (!mounted || _cityCode != code) return;
      setState(() {
        _postal.text = postalCode;
        _postalCodeGenerated = postalCode.isNotEmpty;
        _postalCodeUnavailable = postalCode.isEmpty;
        _loadingPostalCode = false;
      });
    } on Exception catch (error, stackTrace) {
      debugPrint('Could not generate address postal code: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (mounted && _cityCode == code) {
        setState(() {
          _postalCodeGenerated = false;
          _postalCodeUnavailable = true;
          _loadingPostalCode = false;
        });
      }
    }
  }

  String? _selectedName(List<Map<String, dynamic>> rows, String? code) {
    for (final row in rows) {
      if (row['code']?.toString() == code) return row['name']?.toString();
    }
    return null;
  }

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 8),
        child: Text(
          title,
          style: const TextStyle(
            color: AppColors.primary,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
          ),
        ),
      );

  Widget _locationDropdown(
    String label,
    String field,
    List<Map<String, dynamic>> rows,
    String? value,
    ValueChanged<String?>? onChanged,
  ) {
    final selectedName = _selectedName(rows, value);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: FormField<String>(
        key: ValueKey('$field:$value'),
        initialValue: value,
        validator: (selected) => selected == null ? 'Select $label.' : null,
        builder: (state) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: onChanged == null || rows.isEmpty
                  ? null
                  : () async {
                      final selected = await showModalBottomSheet<String>(
                        context: context,
                        isScrollControlled: true,
                        useSafeArea: true,
                        backgroundColor: Colors.transparent,
                        builder: (_) => _AddressOptionPicker(
                          title: 'Choose $label',
                          options: rows,
                          selectedCode: value,
                        ),
                      );
                      if (selected == null || !mounted) return;
                      state.didChange(selected);
                      onChanged(selected);
                    },
              child: Ink(
                decoration: BoxDecoration(
                  color: onChanged == null || rows.isEmpty
                      ? const Color(0xFFFAF7F7)
                      : AppColors.white,
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: .28),
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 68),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 10,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          switch (field) {
                            'region' => Icons.map_outlined,
                            'province' => Icons.location_city_outlined,
                            'municipality' => Icons.location_city_outlined,
                            _ => Icons.place_outlined,
                          },
                          color: AppColors.primary,
                          size: 22,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                label,
                                style: const TextStyle(
                                  color: AppColors.gray,
                                  fontSize: 11,
                                  fontFamily: 'Poppins',
                                ),
                              ),
                              Text(
                                selectedName ?? 'Select $label',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: selectedName == null
                                      ? AppColors.gray
                                      : AppColors.darkGray,
                                  fontSize: 13,
                                  fontWeight: selectedName == null
                                      ? FontWeight.w400
                                      : FontWeight.w600,
                                  fontFamily: 'Poppins',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: AppColors.primary,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            if (_fieldErrors[field] case final message?)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 10),
                child: Text(
                  message,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 11,
                    fontFamily: 'Poppins',
                  ),
                ),
              )
            else if (state.errorText != null)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 10),
                child: Text(
                  state.errorText!,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 11,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _textField(
    String label,
    TextEditingController controller, {
    String? backendField,
    int maxLength = 100,
    TextInputType? keyboardType,
    bool required = false,
    bool readOnly = false,
    List<TextInputFormatter>? inputFormatters,
    String? hintText,
    String? helperText,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 4, left: 2),
            child: Text(
              label.toUpperCase(),
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              border: Border.all(color: AppColors.lightGray),
              borderRadius: BorderRadius.circular(16),
            ),
            child: TextFormField(
              controller: controller,
              inputFormatters: [
                ...?inputFormatters,
                LengthLimitingTextInputFormatter(maxLength),
              ],
              keyboardType: keyboardType,
              readOnly: readOnly,
              style: const TextStyle(
                color: AppColors.darkGray,
                fontSize: 13,
                fontFamily: 'Poppins',
              ),
              decoration: InputDecoration(
                hintText: hintText ?? (required ? 'Required' : 'Optional'),
                hintStyle: const TextStyle(
                  color: AppColors.gray,
                  fontSize: 13,
                  fontFamily: 'Poppins',
                ),
                errorText:
                    backendField == null ? null : _fieldErrors[backendField],
                helperText: helperText,
                suffixIcon: suffixIcon,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
              ),
              validator: validator ??
                  (required
                      ? (value) => value == null || value.trim().isEmpty
                          ? 'This field is required.'
                          : null
                      : null),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    if (_saving || !_formKey.currentState!.validate()) return;
    if (_loadingBuyerProfile && !_editing) {
      setState(() =>
          _error = 'Loading your buyer profile. Please try again in a moment.');
      return;
    }
    if (_recipientName.trim().isEmpty || _recipientPhone.trim().isEmpty) {
      setState(() {
        _error = _profileError ??
            'Add your name and mobile number to your buyer profile before saving an address.';
      });
      return;
    }
    final region = _selectedName(_regions, _regionCode);
    final province = _selectedName(_provinces, _provinceCode);
    final municipality = _selectedName(_cities, _cityCode);
    final barangay = _selectedName(_barangays, _selectedBarangayCode);
    if (region == null ||
        province == null ||
        municipality == null ||
        barangay == null) {
      setState(() => _error =
          'Choose a region, province, city or municipality, and barangay.');
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(_editing ? 'Save address changes?' : 'Add this address?'),
        content: Text(
          _editing
              ? 'Your updated address will be saved to your address book.'
              : 'This address will be added to your address book.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(_editing ? 'Save changes' : 'Add address'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final address = BuyerAddress(
      id: widget.address?.id ?? 0,
      label: _label,
      recipientName: _recipientName,
      phone: _recipientPhone,
      region: region,
      province: province,
      municipality: municipality,
      barangay: barangay,
      houseNumber: _house.text,
      buildingName: _building.text,
      unitNumber: _unit.text,
      street: _street.text,
      postalCode: _postal.text,
    );
    setState(() {
      _saving = true;
      _error = null;
      _fieldErrors = {};
    });
    try {
      final payload = address.toPayload(makeDefault: _isDefault);
      final response = _editing
          ? await _api.updateBuyerAddress(widget.address!.id, payload)
          : await _api.createBuyerAddress(payload);
      if (response['success'] != true ||
          response['data'] is! Map<String, dynamic>) {
        throw const ApiException(
            'The server did not confirm the address change.');
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _fieldErrors = error.fieldErrors;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Unable to save this address. Check your connection and try again.');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _selectedBarangayCode;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_editing ? 'Edit Address' : 'Add New Address'),
        foregroundColor: AppColors.primary,
        backgroundColor: AppColors.surface,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            if (_loadingLocations) ...[
              const LinearProgressIndicator(),
              const SizedBox(height: 8),
              const Text(
                'Loading address locations...',
                textAlign: TextAlign.center,
              ),
            ],
            _sectionTitle('PHILIPPINE LOCATION'),
            _locationDropdown(
              'Region',
              'region',
              _regions,
              _regionCode,
              _saving || _loadingLocations ? null : _selectRegion,
            ),
            _locationDropdown(
              'Province',
              'province',
              _provinces,
              _provinceCode,
              _saving || _loadingLocations || _regionCode == null
                  ? null
                  : _selectProvince,
            ),
            _locationDropdown(
              'City / Municipality',
              'municipality',
              _cities,
              _cityCode,
              _saving || _loadingLocations || _provinceCode == null
                  ? null
                  : _selectCity,
            ),
            _locationDropdown(
              'Barangay',
              'barangay',
              _barangays,
              _selectedBarangayCode,
              _saving || _loadingLocations || _cityCode == null
                  ? null
                  : (value) {
                      if (value != null) {
                        setState(() => _selectedBarangayCode = value);
                      }
                    },
            ),
            _sectionTitle('MANUAL ADDRESS'),
            _textField(
              'HOUSE / LOT NUMBER *',
              _house,
              backendField: 'house_number',
              maxLength: 20,
              required: true,
            ),
            _textField(
              'STREET *',
              _street,
              backendField: 'street',
              maxLength: 100,
              required: true,
            ),
            _textField(
              'BUILDING / SUBDIVISION (OPTIONAL)',
              _building,
              backendField: 'building_name',
              maxLength: 80,
            ),
            _textField(
              'UNIT / FLOOR (OPTIONAL)',
              _unit,
              backendField: 'unit_number',
              maxLength: 30,
            ),
            _textField(
              'POSTAL CODE *',
              _postal,
              backendField: 'postal_code',
              maxLength: 4,
              keyboardType: TextInputType.number,
              required: true,
              readOnly: _postalCodeGenerated,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              hintText: '4-digit postal code',
              helperText: _loadingPostalCode
                  ? 'Generating from the selected locality...'
                  : _postalCodeGenerated
                      ? 'Generated from the locality postal-code reference.'
                      : _postalCodeUnavailable
                          ? 'No verified code is available for this locality. Enter it manually.'
                          : 'Select a city / municipality to generate a postal code.',
              suffixIcon: _loadingPostalCode
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : _postalCodeGenerated
                      ? const Icon(Icons.auto_awesome_outlined)
                      : null,
              validator: (value) =>
                  RegExp(r'^\d{4}$').hasMatch(value?.trim() ?? '')
                      ? null
                      : 'Enter a valid four-digit postal code.',
            ),
            _sectionTitle('DELIVERY DETAILS'),
            DropdownButtonFormField<String>(
              initialValue: _label,
              decoration: InputDecoration(
                labelText: 'Address label',
                border: const OutlineInputBorder(),
                errorText: _fieldErrors['label'],
              ),
              items: const [
                DropdownMenuItem(value: 'home', child: Text('Home')),
                DropdownMenuItem(value: 'work', child: Text('Work')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: _saving
                  ? null
                  : (value) {
                      if (value != null) setState(() => _label = value);
                    },
            ),
            const SizedBox(height: 10),
            _deliveryContactCard(),
            if (!_editing)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _isDefault,
                onChanged: _saving
                    ? null
                    : (value) => setState(() => _isDefault = value ?? false),
                title: const Text(
                  'Set as default address',
                  style: TextStyle(fontFamily: 'Poppins', fontSize: 13),
                ),
                activeColor: AppColors.primary,
              ),
            if (_profileError != null && !_editing)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  _profileError!,
                  style: const TextStyle(color: AppColors.danger),
                  textAlign: TextAlign.center,
                ),
              ),
            if (_error != null) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  _error!,
                  style: const TextStyle(color: AppColors.danger),
                  textAlign: TextAlign.center,
                ),
              ),
              if (_locationLoadFailed)
                TextButton(
                  onPressed: _saving ? null : _loadLocationOptions,
                  child: const Text('Retry loading locations'),
                ),
            ],
            FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(_editing ? 'Save Changes' : 'Save Address'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _deliveryContactCard() {
    final name = _recipientName;
    final phone = _recipientPhone;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.softRose,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.person_outline_rounded,
            color: AppColors.primary,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'DELIVERY CONTACT',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _loadingBuyerProfile && !_editing
                      ? 'Loading your account details...'
                      : '$name  ·  $phone',
                  style: const TextStyle(
                    color: AppColors.darkGray,
                    fontSize: 12,
                    fontFamily: 'Poppins',
                  ),
                ),
                const Text(
                  'Taken from your buyer profile',
                  style: TextStyle(
                    color: AppColors.gray,
                    fontSize: 10,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AddressOptionPicker extends StatefulWidget {
  const _AddressOptionPicker({
    required this.title,
    required this.options,
    required this.selectedCode,
  });

  final String title;
  final List<Map<String, dynamic>> options;
  final String? selectedCode;

  @override
  State<_AddressOptionPicker> createState() => _AddressOptionPickerState();
}

class _AddressOptionPickerState extends State<_AddressOptionPicker> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final options = widget.options.where((option) {
      final name = option['name']?.toString() ?? '';
      return name.toLowerCase().contains(_query.toLowerCase());
    }).toList();

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .76,
        child: Material(
          color: AppColors.background,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 10),
                child: Text(
                  widget.title,
                  style: const TextStyle(
                    color: AppColors.darkGray,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _search,
                  onChanged: (value) => setState(() => _query = value.trim()),
                  decoration: InputDecoration(
                    hintText: 'Search ${widget.title.toLowerCase()}',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: options.isEmpty
                    ? const Center(child: Text('No matching locations.'))
                    : ListView.builder(
                        itemCount: options.length,
                        itemBuilder: (context, index) {
                          final option = options[index];
                          final code = option['code'].toString();
                          return ListTile(
                            title: Text(
                              option['name'].toString(),
                              style: const TextStyle(fontFamily: 'Poppins'),
                            ),
                            trailing: code == widget.selectedCode
                                ? const Icon(
                                    Icons.check,
                                    color: AppColors.primary,
                                  )
                                : null,
                            onTap: () => Navigator.pop(context, code),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
