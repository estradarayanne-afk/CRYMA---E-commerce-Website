import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CustomTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final VoidCallback? onTap;
  final TextInputType keyboardType;
  final int maxLength;
  final bool obscureText;
  final bool readOnly;
  final Widget? suffixIcon;
  final Widget? prefixIcon;
  final int maxLines;
  final int minLines;
  final List<TextInputFormatter>? inputFormatters;

  const CustomTextField({
    Key? key,
    required this.label,
    this.hint,
    this.controller,
    this.validator,
    this.onChanged,
    this.onTap,
    this.keyboardType = TextInputType.text,
    this.maxLength = 255,
    this.obscureText = false,
    this.readOnly = false,
    this.suffixIcon,
    this.prefixIcon,
    this.maxLines = 1,
    this.minLines = 1,
    this.inputFormatters,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      onChanged: onChanged,
      onTap: onTap,
      keyboardType: keyboardType,
      maxLength: maxLength,
      obscureText: obscureText,
      readOnly: readOnly,
      maxLines: obscureText ? 1 : maxLines,
      minLines: minLines,
      inputFormatters: inputFormatters,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        suffixIcon: suffixIcon,
        prefixIcon: prefixIcon,
        counterText: '',
      ),
    );
  }
}
