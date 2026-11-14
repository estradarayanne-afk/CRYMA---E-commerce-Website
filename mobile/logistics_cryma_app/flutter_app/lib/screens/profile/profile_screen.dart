import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_config.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import 'edit_profile_screen.dart';
import 'vehicle_license_screen.dart';
import 'change_password_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<UserProvider>().fetchProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Consumer2<AuthProvider, UserProvider>(
        builder: (context, authProvider, userProvider, _) {
          final user = userProvider.userProfile ?? authProvider.currentUser;

          return SingleChildScrollView(
            child: Column(
              children: [
                // Header Card
                Container(
                  color: AccentColors.maroon,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 48,
                        backgroundColor: Colors.white,
                        child: Text(
                          (user?.firstName ?? 'U')[0].toUpperCase(),
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF8B0000),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        user?.fullName ?? 'User',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Rider',
                          style: TextStyle(
                            color: Color(0xFF8B0000),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        user?.email ?? '',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Menu Items
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Account',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      _buildMenuTile(
                        icon: Icons.person,
                        title: 'Edit Profile',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  const EditProfileScreen(),
                            ),
                          );
                        },
                      ),
                      _buildMenuTile(
                        icon: Icons.directions_car,
                        title: 'Vehicle & License',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  const VehicleLicenseScreen(),
                            ),
                          );
                        },
                      ),
                      _buildMenuTile(
                        icon: Icons.lock,
                        title: 'Change Password',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  const ChangePasswordScreen(),
                            ),
                          );
                        },
                      ),
                      _buildMenuTile(
                        icon: Icons.notifications,
                        title: 'Notifications',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Notifications coming soon'),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Support',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      _buildMenuTile(
                        icon: Icons.help,
                        title: 'Help & FAQ',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('FAQ coming soon'),
                            ),
                          );
                        },
                      ),
                      _buildMenuTile(
                        icon: Icons.info,
                        title: 'About CRYMA',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content:
                                  Text('About page coming soon'),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Logout Button
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Logout'),
                            content: const Text(
                                'Are you sure you want to logout?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  Navigator.pop(context);
                                  final navigator = Navigator.of(context);
                                  await context.read<AuthProvider>().logout();
                                  if (mounted) {
                                    navigator.pushReplacementNamed('/login');
                                  }
                                },
                                child: const Text('Logout'),
                              ),
                            ],
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AccentColors.maroon,
                      ),
                      child: const Text('Logout'),
                    ),
                  ),
                ),

                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AccentColors.maroon),
        title: Text(title),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
