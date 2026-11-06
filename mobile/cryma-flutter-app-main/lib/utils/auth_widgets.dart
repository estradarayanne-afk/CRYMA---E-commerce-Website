import 'package:flutter/material.dart';

import 'colors.dart';

class CrymaWordmark extends StatelessWidget {
  const CrymaWordmark({
    super.key,
    this.logoSize = 48,
    this.fontSize = 26,
    this.color = AppColors.wine,
    this.onBrandSurface = false,
  });

  final double logoSize;
  final double fontSize;
  final Color color;
  final bool onBrandSurface;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: logoSize,
            height: logoSize,
            padding: EdgeInsets.all(logoSize * .12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(logoSize * .25),
            ),
            child: Image.asset(
              'assets/image/cryma-logo.png',
              fit: BoxFit.contain,
              semanticLabel: 'CRYMA logo',
              errorBuilder: (context, error, stackTrace) => Icon(
                Icons.local_mall_outlined,
                color: AppColors.primaryDark,
                size: logoSize * .62,
              ),
            ),
          ),
          SizedBox(width: logoSize * .2),
          Text(
            'CRYMA',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              letterSpacing: fontSize * .13,
              color: onBrandSurface ? Colors.white : color,
            ),
          ),
        ],
      );
}

class RegistrationProgressHeader extends StatelessWidget {
  const RegistrationProgressHeader({
    super.key,
    required this.currentStep,
  });

  final int currentStep;

  static const _steps = ['Personal', 'Contact', 'Account', 'ID', 'Review'];

  @override
  Widget build(BuildContext context) {
    final step = currentStep.clamp(1, _steps.length);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primaryDark, AppColors.primary],
        ),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: .16),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              const CrymaWordmark(
                logoSize: 42,
                fontSize: 18,
                onBrandSurface: true,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'BUYER REGISTRATION',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.4,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white24),
                ),
                child: Text(
                  '${step.toString().padLeft(2, '0')} / 05',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: .5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var index = 0; index < _steps.length; index++) ...[
                Expanded(
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: index + 1 <= step
                              ? Colors.white
                              : Colors.white.withValues(alpha: .08),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: .5),
                          ),
                        ),
                        child: Center(
                          child: index + 1 < step
                              ? const Icon(Icons.check,
                                  size: 17, color: AppColors.primaryDark)
                              : Text(
                                  '${index + 1}',
                                  style: TextStyle(
                                    color: index + 1 <= step
                                        ? AppColors.primaryDark
                                        : Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        _steps[index],
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white
                              .withValues(alpha: index + 1 <= step ? 1 : .68),
                          fontSize: 9,
                          fontWeight: index + 1 == step
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
                if (index < _steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 28,
                      alignment: Alignment.center,
                      child: Container(
                        height: 1.5,
                        color: index + 1 < step
                            ? Colors.white
                            : Colors.white.withValues(alpha: .3),
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
