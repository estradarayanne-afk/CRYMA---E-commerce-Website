import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../models/buyer_address.dart';
import '../../services/api_service.dart';
import '../../utils/colors.dart';

class AddAddressScreen extends StatefulWidget {
  const AddAddressScreen({super.key, this.address});

  final BuyerAddress? address;

  @override
  State<AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends State<AddAddressScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _house = TextEditingController();
  final _building = TextEditingController();
  final _unit = TextEditingController();
  final _street = TextEditingController();
  final _postal = TextEditingController();
  static const _psgcRoot = 'https://psgc.cloud/api/v2';

  List<Map<String, dynamic>> _regions = [];
  List<Map<String, dynamic>> _provinces = [];
  List<Map<String, dynamic>> _cities = [];
  List<Map<String, dynamic>> _barangays = [];
  String? _regionCode;
  String? _provinceCode;
  String? _cityCode;
  String _label = 'home';
  bool _isDefault = false;
  bool _loadingLocations = true;
  bool _locationLoadFailed = false;
  bool _saving = false;
  String? _error;
  Map<String, String> _fieldErrors = {};

  bool get _editing => widget.address != null;

  @override
  void initState() {
    super.initState();
    final address = widget.address;
    if (address != null) {
      _name.text = address.recipientName;
      _phone.text = address.phone;
      _house.text = address.houseNumber;
      _building.text = address.buildingName;
      _unit.text = address.unitNumber;
      _street.text = address.street;
      _postal.text = address.postalCode;
      _label = address.label;
      _isDefault = address.isDefault;
    }
    _loadLocationOptions();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _house.dispose();
    _building.dispose();
    _unit.dispose();
    _street.dispose();
    _postal.dispose();
    super.dispose();
  }

  Future<List<Map<String, dynamic>>> _fetchOptions(String path) async {
    final response = await http
        .get(Uri.parse('$_psgcRoot/$path'), headers: const {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const FormatException('Philippine address options are unavailable. Please try again.');
    }
    final decoded = jsonDecode(response.body);
    final data = decoded is Map<String, dynamic> ? decoded['data'] : null;
    if (data is! List) throw const FormatException('The location service returned an invalid response.');
    return data.whereType<Map<String, dynamic>>().toList();
  }

  String _codeFor(List<Map<String, dynamic>> rows, String name) {
    for (final row in rows) {
      if (row['name']?.toString().trim().toLowerCase() == name.trim().toLowerCase()) {
        return row['code'].toString();
      }
    }
    return '';
  }

  Future<void> _loadLocationOptions() async {
    if (mounted) setState(() { _loadingLocations = true; _error = null; _locationLoadFailed = false; });
    try {
      final regions = await _fetchOptions('regions');
      if (!mounted) return;
      setState(() => _regions = regions);
      final address = widget.address;
      if (address != null) {
        final regionCode = _codeFor(regions, address.region);
        if (regionCode.isNotEmpty) {
          final provinces = await _fetchOptions('regions/$regionCode/provinces');
          final provinceCode = _codeFor(provinces, address.province);
          final cities = provinceCode.isEmpty
              ? <Map<String, dynamic>>[]
              : await _fetchOptions('regions/$regionCode/provinces/$provinceCode/cities-municipalities');
          final cityCode = _codeFor(cities, address.municipality);
          final barangays = cityCode.isEmpty
              ? <Map<String, dynamic>>[]
              : await _fetchOptions('regions/$regionCode/provinces/$provinceCode/cities-municipalities/$cityCode/barangays');
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
    } catch (error) {
      if (mounted) {
        setState(() {
        _locationLoadFailed = true;
        _error = error is FormatException ? error.message : 'Unable to load Philippine address options.';
      });
      }
    } finally {
      if (mounted) setState(() => _loadingLocations = false);
    }
  }

  Future<void> _selectRegion(String? code) async {
    if (code == null) return;
    setState(() { _regionCode = code; _provinceCode = null; _cityCode = null; _selectedBarangayCode = null; _provinces = []; _cities = []; _barangays = []; _postal.clear(); _error = null; });
    try {
      final rows = await _fetchOptions('regions/$code/provinces');
      if (mounted && _regionCode == code) setState(() => _provinces = rows);
    } catch (error) { if (mounted) setState(() => _error = error.toString()); }
  }

  Future<void> _selectProvince(String? code) async {
    if (code == null || _regionCode == null) return;
    setState(() { _provinceCode = code; _cityCode = null; _selectedBarangayCode = null; _cities = []; _barangays = []; _postal.clear(); _error = null; });
    try {
      final rows = await _fetchOptions('regions/$_regionCode/provinces/$code/cities-municipalities');
      if (mounted && _provinceCode == code) setState(() => _cities = rows);
    } catch (error) { if (mounted) setState(() => _error = error.toString()); }
  }

  Future<void> _selectCity(String? code) async {
    if (code == null || _regionCode == null || _provinceCode == null) return;
    setState(() { _cityCode = code; _selectedBarangayCode = null; _barangays = []; _postal.clear(); _error = null; });
    try {
      final rows = await _fetchOptions('regions/$_regionCode/provinces/$_provinceCode/cities-municipalities/$code/barangays');
      if (mounted && _cityCode == code) setState(() => _barangays = rows);
    } catch (error) { if (mounted) setState(() => _error = error.toString()); }
  }

  String? _selectedName(List<Map<String, dynamic>> rows, String? code) {
    for (final row in rows) { if (row['code']?.toString() == code) return row['name']?.toString(); }
    return null;
  }

  Widget _locationDropdown(String label, String field, List<Map<String, dynamic>> rows, String? value, ValueChanged<String?>? onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: DropdownButtonFormField<String>(
        initialValue: value,
        isExpanded: true,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder(), errorText: _fieldErrors[field]),
        items: rows.map((row) => DropdownMenuItem(value: row['code'].toString(), child: Text(row['name'].toString(), overflow: TextOverflow.ellipsis))).toList(),
        onChanged: onChanged,
        validator: (value) => value == null ? 'Select $label.' : null,
      ),
    );
  }

  Widget _textField(String label, TextEditingController controller, {String? backendField, int maxLength = 100, TextInputType? keyboardType, bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        maxLength: maxLength,
        keyboardType: keyboardType,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder(), errorText: backendField == null ? null : _fieldErrors[backendField]),
        validator: required ? (value) => (value == null || value.trim().isEmpty) ? 'This field is required.' : null : null,
      ),
    );
  }

  Future<void> _save() async {
    if (_saving || !_formKey.currentState!.validate()) return;
    final region = _selectedName(_regions, _regionCode);
    final province = _selectedName(_provinces, _provinceCode);
    final municipality = _selectedName(_cities, _cityCode);
    final barangay = _selectedName(_barangays, _selectedBarangayCode);
    if (region == null || province == null || municipality == null || barangay == null) {
      setState(() => _error = 'Choose a region, province, city or municipality, and barangay.');
      return;
    }
    final address = BuyerAddress(
      id: widget.address?.id ?? 0,
      label: _label,
      recipientName: _name.text,
      phone: _phone.text,
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
    setState(() { _saving = true; _error = null; _fieldErrors = {}; });
    try {
      final payload = address.toPayload(makeDefault: _isDefault);
      final response = _editing
          ? await ApiService.instance.updateBuyerAddress(widget.address!.id, payload)
          : await ApiService.instance.createBuyerAddress(payload);
      if (response['success'] != true || response['data'] is! Map<String, dynamic>) {
        throw const ApiException('The server did not confirm the address change.');
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _fieldErrors = error.fieldErrors;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Unable to save this address. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _selectedBarangayCode;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: Text(_editing ? 'Edit Address' : 'Add New Address'), foregroundColor: AppColors.primary, backgroundColor: AppColors.surface),
      body: _loadingLocations
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _label,
                    decoration: InputDecoration(labelText: 'Address label', border: const OutlineInputBorder(), errorText: _fieldErrors['label']),
                    items: const [DropdownMenuItem(value: 'home', child: Text('Home')), DropdownMenuItem(value: 'work', child: Text('Work')), DropdownMenuItem(value: 'other', child: Text('Other'))],
                    onChanged: _saving ? null : (value) { if (value != null) setState(() => _label = value); },
                  ),
                  const SizedBox(height: 14),
                  _textField('Recipient name', _name, backendField: 'recipient_name', maxLength: 100, required: true),
                  _textField('Philippine mobile number', _phone, backendField: 'phone', maxLength: 20, keyboardType: TextInputType.phone, required: true),
                  _textField('House / lot number (optional)', _house, backendField: 'house_number', maxLength: 20),
                  _textField('Building name (optional)', _building, backendField: 'building_name', maxLength: 80),
                  _textField('Unit / floor (optional)', _unit, backendField: 'unit_number', maxLength: 30),
                  _textField('Street (optional)', _street, backendField: 'street', maxLength: 100),
                  _locationDropdown('Region', 'region', _regions, _regionCode, _saving ? null : _selectRegion),
                  _locationDropdown('Province', 'province', _provinces, _provinceCode, _saving ? null : _selectProvince),
                  _locationDropdown('City / Municipality', 'municipality', _cities, _cityCode, _saving ? null : _selectCity),
                  _locationDropdown('Barangay', 'barangay', _barangays, _selectedBarangayCode, _saving ? null : (value) => setState(() => _selectedBarangayCode = value)),
                  _textField('Postal code (optional)', _postal, backendField: 'postal_code', maxLength: 4, keyboardType: TextInputType.number),
                  if (!_editing)
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _isDefault,
                      onChanged: _saving ? null : (value) => setState(() => _isDefault = value ?? false),
                      title: const Text('Set as default address'),
                    ),
                  if (_error != null) ...[
                    Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(_error!, style: const TextStyle(color: AppColors.danger), textAlign: TextAlign.center)),
                    if (_locationLoadFailed)
                      TextButton(onPressed: _saving ? null : _loadLocationOptions, child: const Text('Retry loading locations')),
                  ],
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
                    child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(_editing ? 'Save Changes' : 'Save Address'),
                  ),
                ],
              ),
            ),
    );
  }
}
