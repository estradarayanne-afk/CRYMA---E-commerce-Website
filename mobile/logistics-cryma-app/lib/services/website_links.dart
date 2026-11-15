import 'package:url_launcher/url_launcher.dart';

const _websiteBaseUrl = String.fromEnvironment(
  'WEBSITE_BASE_URL',
  defaultValue: 'https://cryma.shop',
);

final courierRegistrationUri = Uri.parse('$_websiteBaseUrl/register/rider');

Future<void> openCourierRegistration() async {
  final opened = await launchUrl(
    courierRegistrationUri,
    mode: LaunchMode.externalApplication,
  );
  if (!opened) {
    throw StateError('Could not open $courierRegistrationUri');
  }
}
