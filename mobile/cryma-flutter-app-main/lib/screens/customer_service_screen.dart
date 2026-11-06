import 'package:flutter/material.dart';
import '../utils/colors.dart';

class CustomerServiceScreen extends StatelessWidget {
  const CustomerServiceScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Customer Support'), backgroundColor: AppColors.white, foregroundColor: AppColors.primary, elevation: 0),
        body: ListView(padding: const EdgeInsets.all(18), children: [
          Container(padding: const EdgeInsets.all(22), decoration: BoxDecoration(color: AppColors.softRose, borderRadius: BorderRadius.circular(16)), child: const Column(children: [Icon(Icons.support_agent, size: 48, color: AppColors.primary), SizedBox(height: 10), Text('How can we help?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary, fontFamily: 'Poppins')), SizedBox(height: 6), Text('Contact support through the connected in-app conversation.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'))])),
          const SizedBox(height: 18),
          Card(child: ListTile(leading: const CircleAvatar(backgroundColor: AppColors.softRose, child: Icon(Icons.chat_bubble_outline, color: AppColors.primary)), title: const Text('In-app support chat', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600)), subtitle: const Text('Messages are sent to CRYMA support through your account.', style: TextStyle(fontFamily: 'Poppins')), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.pushNamed(context, '/chat_list'))),
          const SizedBox(height: 12),
          const Text('Email, phone, and FAQ support links are not shown until official contact details and destinations are configured.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.gray, fontFamily: 'Poppins', height: 1.4)),
        ]),
      );
}
