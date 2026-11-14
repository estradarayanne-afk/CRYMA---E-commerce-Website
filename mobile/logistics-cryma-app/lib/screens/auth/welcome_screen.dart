import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CrymaColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 2),
              const Center(child: CrymaLogo(size: 36)),
              const SizedBox(height: 48),
              Center(
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    color: CrymaColors.palePink,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.local_shipping_outlined,
                    size: 80,
                    color: CrymaColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: 48),
              const Text(
                'Deliver with\nConfidence',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: CrymaColors.textPrimary,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'View assigned pickups and deliveries, scan parcel codes, and sync delivery proof with CRYMA.',
                style: CrymaText.bodyLarge,
              ),
              const Spacer(flex: 3),
              FilledButton(
                onPressed: () => context.go('/register'),
                child: const Text('Apply as a rider'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/login'),
                child: const Text('I already have an account'),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
