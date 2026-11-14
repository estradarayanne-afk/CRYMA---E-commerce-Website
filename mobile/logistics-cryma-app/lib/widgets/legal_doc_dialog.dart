import 'package:flutter/material.dart';
import '../theme.dart';

class LegalDocDialog extends StatelessWidget {
  final String title;
  final List<_LegalSection> sections;
  const LegalDocDialog({super.key, required this.title, required this.sections});

  static const String termsVersion = '1.0';
  static const String privacyVersion = '1.0';

  static void showTerms(BuildContext context) {
    showDialog(context: context, builder: (_) => LegalDocDialog(title: 'Terms and Conditions', sections: _termsContent));
  }

  static void showPrivacy(BuildContext context) {
    showDialog(context: context, builder: (_) => LegalDocDialog(title: 'Privacy Policy', sections: _privacyContent));
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
            decoration: const BoxDecoration(
              color: CrymaColors.primary,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Expanded(child: Text('CRYMA LOGISTICS\n$title', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15))),
                IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: sections.map((s) => _SectionWidget(section: s)).toList(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionWidget extends StatelessWidget {
  final _LegalSection section;
  const _SectionWidget({required this.section});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(section.heading, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: CrymaColors.primary)),
          const SizedBox(height: 4),
          Text(section.body, style: const TextStyle(fontSize: 13, color: CrymaColors.textPrimary, height: 1.55)),
        ],
      ),
    );
  }
}

class _LegalSection {
  final String heading;
  final String body;
  const _LegalSection(this.heading, this.body);
}

const _termsContent = [
  _LegalSection('1. Acceptance of Terms',
      'By registering as a CRYMA Logistics Rider, you acknowledge that you have read and agreed to these Terms and Conditions.'),
  _LegalSection('2. Accurate Information',
      'You agree to provide accurate, current, and complete registration information, including your name, contact information, address, identification details, driver\'s license information, and vehicle details where applicable. You are responsible for updating your information when it changes.'),
  _LegalSection('3. Eligibility and Documentation',
      'Riders must satisfy applicable legal requirements for the duties they perform. Where required, Riders must maintain valid driver\'s licenses, vehicle registrations, permits, and other relevant documentation. Submitting information through this prototype does not constitute official verification of those documents.'),
  _LegalSection('4. Account Security',
      'You are responsible for protecting your login credentials. Do not share your password with other people. Notify the appropriate administrator if you suspect unauthorized access.'),
  _LegalSection('5. Delivery Responsibilities',
      'Riders must handle assigned deliveries responsibly, follow applicable traffic and safety laws, protect items in their custody, and provide accurate delivery information.'),
  _LegalSection('6. Reports and Warning Notices',
      'CRYMA administrators may record reports relating to delivery incidents, incorrect information, or other issues involving Rider activity. An administrator may send a Warning Notice requesting that a Rider correct an issue. Riders may respond through the application\'s available chat functionality.'),
  _LegalSection('7. Prohibited Conduct',
      'Riders must not falsify information, misuse another person\'s account, manipulate delivery records, or use the application to engage in unlawful or fraudulent activities.'),
  _LegalSection('8. Account Suspension or Deletion',
      'An account may be restricted or removed in accordance with applicable policies and law. Where appropriate, the Rider should be informed of the reason and provided an opportunity to respond.'),
  _LegalSection('9. Application Limitations',
      'The current CRYMA Logistics application is a development prototype. Some features may use local data and may not provide live delivery tracking, real-time communication, official identity verification, or production-grade service availability.'),
  _LegalSection('10. Changes to These Terms',
      'These Terms and Conditions may be updated as the application develops. Material changes should be communicated appropriately, and renewed acceptance should be requested when necessary.'),
  _LegalSection('11. Contact and Support',
      'For questions about the application or an account, contact the designated CRYMA administrator through the support channel provided by the application.'),
  _LegalSection('12. Acknowledgment',
      'By selecting the acceptance checkbox and submitting registration, you acknowledge your agreement to these Terms and Conditions.'),
];

const _privacyContent = [
  _LegalSection('1. Purpose',
      'This Privacy Policy explains how the CRYMA Logistics application collects, uses, stores, and protects information provided during Rider registration and application use.'),
  _LegalSection('2. Information Collected',
      'The application may collect: first name and last name, email address, Philippine mobile number, address (region, province, city/municipality, barangay, street, house), Taxpayer Identification Number (TIN), driver\'s license information, vehicle information and plate number, Rider account credentials, order assignments and delivery records, reports, citations, Warning Notices and replies, and other information voluntarily entered.'),
  _LegalSection('3. Purpose of Collection',
      'Information is collected for: creating and managing Rider accounts, authenticating users, managing delivery assignments, identifying Riders for logistics operations, maintaining delivery records, handling reports and Warning Notices, and supporting application administration and troubleshooting.'),
  _LegalSection('4. Local Storage',
      'In the current prototype, information may be stored in a local database on the device. Local storage does not automatically provide secure synchronization, remote backup, or protection against someone with unrestricted device access.'),
  _LegalSection('5. Sensitive Information',
      'TINs, driver\'s license details, contact information, and account credentials must be treated as sensitive. The application collects only information needed for its stated purposes, restricts access to authorized functions, avoids unnecessary display of complete sensitive identifiers, and must not store passwords as plain text.'),
  _LegalSection('6. Sharing and Disclosure',
      'The prototype does not transmit personal information to external services unless required by a documented feature. If an external address API is used, only geographic query data is sent — not Rider identity or TIN information. Information may be disclosed where required by applicable law.'),
  _LegalSection('7. Data Retention and Deletion',
      'Information should be retained only as long as reasonably necessary. When an account is deleted, related personal information should be removed or handled according to a documented retention policy.'),
  _LegalSection('8. Data Security',
      'Reasonable technical and organizational measures should be used to prevent unauthorized access, disclosure, alteration, or destruction of personal information. The prototype does not claim encryption or production-grade protection unless those measures are actually implemented.'),
  _LegalSection('9. User Rights',
      'Subject to applicable law, individuals may have rights to request access to, correction of, or deletion of their personal information. Requests should be directed to the designated CRYMA administrator.'),
  _LegalSection('10. Children\'s Information',
      'The application is intended for eligible Riders who meet applicable requirements. It should not knowingly collect information from ineligible applicants.'),
  _LegalSection('11. Policy Updates',
      'This Privacy Policy may be revised as the application develops. Material changes should be communicated appropriately.'),
  _LegalSection('12. Contact',
      'For privacy questions or requests, contact the designated CRYMA administrator or the privacy contact identified by the application owner.'),
  _LegalSection('13. Acknowledgment',
      'By checking the Privacy Policy acknowledgment box and submitting registration, the applicant confirms they have been given the opportunity to read this notice.\n\nIMPORTANT: This is an initial prototype policy. Review it for compliance with the Philippine Data Privacy Act of 2012 before production deployment.'),
];
