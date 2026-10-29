import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_model.dart';
import '../../providers/user_provider.dart';

class VehicleLicenseScreen extends StatelessWidget {
  const VehicleLicenseScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vehicle & License')),
      body: Consumer<UserProvider>(
        builder: (context, userProvider, _) {
          final user = userProvider.userProfile;
          final rider = user is Rider ? user : null;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Vehicle Information',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                _buildInfoCard('Vehicle Type', rider?.vehicleType ?? 'N/A'),
                _buildInfoCard('Make', rider?.vehicleMake ?? 'N/A'),
                _buildInfoCard('Model', rider?.vehicleModel ?? 'N/A'),
                _buildInfoCard('Color', rider?.vehicleColor ?? 'N/A'),
                _buildInfoCard('Plate Number', rider?.plateNumber ?? 'N/A'),
                const SizedBox(height: 24),
                Text(
                  'License Information',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                _buildInfoCard('License Number', rider?.licenseNumber ?? 'N/A'),
                _buildInfoCard(
                  'Expiry Date',
                  rider?.licenseExpiry?.toLocal().toString().split(' ')[0] ?? 'N/A',
                ),
                _buildInfoCard('Classification', rider?.licenseClassification ?? 'N/A'),
                _buildInfoCard('Restrictions', rider?.licenseRestrictions ?? 'None'),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('License photo upload coming soon'),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add_a_photo),
                    label: const Text('Update License Photo'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoCard(String label, String value) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
            Flexible(
              child: Text(
                value,
                style: const TextStyle(fontWeight: FontWeight.w600),
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
