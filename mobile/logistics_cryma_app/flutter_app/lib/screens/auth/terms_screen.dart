import 'package:flutter/material.dart';

class TermsAndConditionsScreen extends StatefulWidget {
  final bool requireAcceptance;
  const TermsAndConditionsScreen({Key? key, this.requireAcceptance = false})
      : super(key: key);

  @override
  State<TermsAndConditionsScreen> createState() =>
      _TermsAndConditionsScreenState();
}

class _TermsAndConditionsScreenState extends State<TermsAndConditionsScreen> {
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Terms and Conditions')),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CRYMA LOGISTICS — TERMS AND CONDITIONS',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Development Prototype — Not yet reviewed for production deployment.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.orange.shade700,
                          fontStyle: FontStyle.italic,
                        ),
                  ),
                  const SizedBox(height: 24),
                  _buildSection(
                    '1. Accurate Information',
                    'Riders must provide accurate and updated registration and identification information.',
                  ),
                  _buildSection(
                    '2. Licenses and Permits',
                    'Riders must maintain applicable valid licenses, vehicle registrations, and permits.',
                  ),
                  _buildSection(
                    '3. Account Security',
                    'Riders must protect their credentials and must not share accounts.',
                  ),
                  _buildSection(
                    '4. Conduct and Delivery',
                    'Riders must follow traffic laws, handle deliveries responsibly, and provide accurate delivery records.',
                  ),
                  _buildSection(
                    '5. Reports and Notices',
                    'Administrators may record incidents, review reports, and issue warning notices. Riders may reply through the application\'s chat system.',
                  ),
                  _buildSection(
                    '6. Prohibited Activities',
                    'Fraud, falsified information, account misuse, and unlawful activities are prohibited.',
                  ),
                  _buildSection(
                    '7. Account Actions',
                    'Accounts may be restricted or deleted in accordance with applicable policies and law.',
                  ),
                  _buildSection(
                    '8. Prototype Notice',
                    'This application is a development prototype; some services and verification features may be limited.',
                  ),
                  _buildSection(
                    '9. Updates to Terms',
                    'These terms may be updated, with renewed acknowledgment required when appropriate.',
                  ),
                  _buildSection(
                    '10. Contact',
                    'Questions may be directed to the designated CRYMA administrator.',
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.amber.shade300),
                    ),
                    child: Text(
                      'These terms are initial policies requiring review under applicable Philippine law before production deployment. The existence of these terms does not constitute legal compliance.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.amber.shade900,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (widget.requireAcceptance) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: CheckboxListTile(
                value: _accepted,
                onChanged: (v) => setState(() => _accepted = v ?? false),
                title: const Text(
                  'I have read and agree to the Terms and Conditions',
                  style: TextStyle(fontSize: 14),
                ),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _accepted
                      ? () => Navigator.pop(context, true)
                      : null,
                  child: const Text('Accept and Continue'),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(content, style: const TextStyle(fontSize: 14, height: 1.5)),
        ],
      ),
    );
  }
}
