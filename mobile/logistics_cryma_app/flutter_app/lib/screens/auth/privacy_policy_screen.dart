import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatefulWidget {
  final bool requireAcknowledgment;
  const PrivacyPolicyScreen({Key? key, this.requireAcknowledgment = false})
      : super(key: key);

  @override
  State<PrivacyPolicyScreen> createState() => _PrivacyPolicyScreenState();
}

class _PrivacyPolicyScreenState extends State<PrivacyPolicyScreen> {
  bool _acknowledged = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CRYMA LOGISTICS — PRIVACY POLICY',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Development Prototype — Requires review under the Philippine Data Privacy Act of 2012 before production deployment.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.orange.shade700,
                          fontStyle: FontStyle.italic,
                        ),
                  ),
                  const SizedBox(height: 24),
                  _buildSection(
                    '1. Information Collected',
                    'The application collects necessary Rider information, including names, contact details, addresses, TIN, license and vehicle details, credentials, delivery records, reports, and chat messages.',
                  ),
                  _buildSection(
                    '2. Purpose of Collection',
                    'Information is used for account management, authentication, delivery operations, administration, and application troubleshooting.',
                  ),
                  _buildSection(
                    '3. Storage',
                    'The current prototype uses local database storage. Local storage does not automatically guarantee encryption, backups, or protection against device access.',
                  ),
                  _buildSection(
                    '4. Data Protection',
                    'Sensitive information must be restricted to authorized functions, and passwords must never be stored as plain text.',
                  ),
                  _buildSection(
                    '5. Third-Party Services',
                    'Personal information must not be sent to external services unnecessarily. Address APIs receive only the information needed to retrieve location options.',
                  ),
                  _buildSection(
                    '6. Retention and Deletion',
                    'Information should be retained only as necessary for its intended purpose and applicable requirements. Account deletion must handle associated personal data appropriately.',
                  ),
                  _buildSection(
                    '7. Your Rights',
                    'Individuals may request access to, correction of, or deletion of their information, subject to applicable law.',
                  ),
                  _buildSection(
                    '8. Policy Changes',
                    'Material policy changes should be communicated appropriately.',
                  ),
                  _buildSection(
                    '9. Contact',
                    'Privacy questions may be directed to the designated CRYMA administrator or privacy contact.',
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
                      'This policy requires review under the Philippine Data Privacy Act of 2012 and applicable regulations before production deployment. The existence of this policy does not constitute legal compliance.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.amber.shade900,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (widget.requireAcknowledgment) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: CheckboxListTile(
                value: _acknowledged,
                onChanged: (v) => setState(() => _acknowledged = v ?? false),
                title: const Text(
                  'I have read and acknowledge the Privacy Policy',
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
                  onPressed: _acknowledged
                      ? () => Navigator.pop(context, true)
                      : null,
                  child: const Text('Acknowledge and Continue'),
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
