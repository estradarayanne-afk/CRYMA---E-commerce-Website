import 'package:flutter/material.dart';
import '../utils/colors.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  // FAQs intentionally do not hardcode specific delivery times or return
  // windows — those figures come from the Terms & Conditions managed by the
  // admin through the backend, and should not be duplicated here with stale
  // values. Direct users to the right screens for authoritative answers.
  static const _faqs = <Map<String, String>>[
    {
      'q': 'How do I track my order?',
      'a': 'Go to My Orders, tap the order you want to track, then open the '
          'order details. The delivery timeline and current status are shown '
          'there.',
    },
    {
      'q': 'How can I cancel my order?',
      'a': 'Cancellation is available before shipment activity begins. Open '
          'the order in My Orders and tap "Cancel order" if the action is '
          'shown. The server checks eligibility when you submit the request.',
    },
    {
      'q': 'What payment methods do you accept?',
      'a': 'Cash on Delivery is currently available for eligible orders. You '
          'pay the courier when your parcel is delivered.',
    },
    {
      'q': 'How do I request a refund?',
      'a': 'After your order is delivered or completed, open the order in My '
          'Orders and tap "Request Refund". Fill in the reason and the '
          'amount. Our support team will review your request.',
    },
    {
      'q': 'Can I talk to a seller?',
      'a': 'Yes. Open any product page and tap the message icon to start a '
          'conversation with the seller. You can also access all your '
          'conversations in Messages.',
    },
    {
      'q': 'Where are the Terms and Privacy Policy?',
      'a': 'Both are in Account → Terms & Conditions and Account → Privacy '
          'Policy. They are fetched live from CRYMA and always up to date.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Help Center'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Frequently Asked Questions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 12),
          ..._faqs.map(_buildFaqItem),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 8),
          // Direct shortcut to support chat
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: AppColors.softRose,
                child: Icon(Icons.chat_bubble_outline, color: AppColors.primary),
              ),
              title: const Text(
                'Still need help?',
                style: TextStyle(
                    fontFamily: 'Poppins', fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'Contact our support team directly.',
                style: TextStyle(fontFamily: 'Poppins', color: AppColors.gray),
              ),
              trailing: const Icon(Icons.chevron_right, color: AppColors.gray),
              onTap: () => Navigator.pushNamed(context, '/support'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqItem(Map<String, String> faq) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Theme(
        data: ThemeData().copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          iconColor: AppColors.primary,
          collapsedIconColor: AppColors.gray,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          title: Text(
            faq['q']!,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                faq['a']!,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  fontFamily: 'Poppins',
                  height: 1.55,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
