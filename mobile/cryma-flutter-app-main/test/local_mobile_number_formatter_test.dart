import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

String toLocalMobileNumber(String phoneNumber) {
  if (phoneNumber.startsWith('+63')) {
    return '0${phoneNumber.substring(3)}';
  }
  return phoneNumber;
}

void main() {
  final formatter = TextInputFormatter.withFunction((oldValue, newValue) {
    final text = newValue.text;
    if (text.isEmpty || RegExp(r'^0(?:9\d*)?$').hasMatch(text)) {
      return newValue;
    }
    return oldValue;
  });

  test('allows the 09 prefix and subsequent digits', () {
    const oldValue = TextEditingValue.empty;
    const zero = TextEditingValue(text: '0');
    const valid = TextEditingValue(text: '09171234567');

    expect(formatter.formatEditUpdate(oldValue, zero), zero);
    expect(formatter.formatEditUpdate(zero, valid), valid);
  });

  test('rejects a first digit other than zero and a second digit other than 9',
      () {
    const oldValue = TextEditingValue.empty;
    const invalidFirst = TextEditingValue(text: '8');
    const zero = TextEditingValue(text: '0');
    const invalidSecond = TextEditingValue(text: '08');

    expect(formatter.formatEditUpdate(oldValue, invalidFirst), oldValue);
    expect(formatter.formatEditUpdate(zero, invalidSecond), zero);
  });

  test('converts the stored Philippine +63 value for local display', () {
    expect(toLocalMobileNumber('+639171234567'), '09171234567');
  });
}
