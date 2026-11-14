import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    await Future<void>.delayed(const Duration(seconds: 1));
    String route = '/welcome';
    try {
      if (await ApiService.instance.restoreBuyerSession() != null) {
        route = '/home';
      }
    } catch (error, stackTrace) {
      debugPrint('Could not restore the buyer session: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
    if (mounted) Navigator.pushReplacementNamed(context, route);
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 1250),
      builder: (context, progress, _) => Scaffold(
        backgroundColor: AppColors.primary,
        body: Stack(
          children: [
            // Top-left subtle circle
            Positioned(
              left: -screenWidth * 0.22,
              top: screenHeight * 0.08,
              child: Container(
                width: screenWidth * 0.55,
                height: screenWidth * 0.55,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.035),
                ),
              ),
            ),

            // Top-right subtle outlined circle
            Positioned(
              right: -screenWidth * 0.40,
              top: -screenHeight * 0.16,
              child: Container(
                width: screenWidth * 0.95,
                height: screenWidth * 0.95,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.035),
                    width: 2,
                  ),
                ),
              ),
            ),

            // Bottom-left subtle outlined circle
            Positioned(
              left: -screenWidth * 0.30,
              bottom: -screenHeight * 0.04,
              child: Container(
                width: screenWidth * 0.72,
                height: screenWidth * 0.72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.035),
                    width: 2,
                  ),
                ),
              ),
            ),

            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: screenWidth * .88,
                    height: screenHeight * .17,
                    child: CustomPaint(
                      key: const Key('startup-delivery-scene'),
                      painter: _SplashDeliveryPainter(
                        progress: Curves.easeInOutCubic.transform(progress),
                      ),
                    ),
                  ),
                  SizedBox(height: screenHeight * .012),
                  // CRYMA logo image
                  Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()
                      ..setEntry(3, 2, .002)
                      ..rotateY(math.sin(progress * math.pi) * .22),
                    child: Opacity(
                      opacity: progress.clamp(0.0, 1.0),
                      child: Image.asset(
                        'assets/image/cryma-logo.png',
                        width: screenWidth * 0.35,
                        height: screenWidth * 0.35,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Container(
                          width: screenWidth * 0.18,
                          height: screenWidth * 0.18,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: Icon(
                            Icons.storefront_rounded,
                            color: Colors.white,
                            size: screenWidth * 0.08,
                          ),
                        ),
                      ),
                    ),
                  ),

                  SizedBox(height: screenHeight * 0.035),

                  // CRYMA
                  Text(
                    'CRYMA',
                    style: TextStyle(
                      fontSize: screenWidth * 0.085,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontFamily: 'Poppins',
                      letterSpacing: screenWidth * 0.012,
                    ),
                  ),

                  SizedBox(height: screenHeight * 0.018),

                  // Small line
                  Container(
                    width: screenWidth * 0.10,
                    height: 3,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),

                  SizedBox(height: screenHeight * 0.018),

                  // Tagline
                  Text(
                    'Your Shopping, Your Way',
                    style: TextStyle(
                      fontSize: screenWidth * 0.043,
                      fontWeight: FontWeight.w400,
                      color: Colors.white.withValues(alpha: 0.48),
                      fontFamily: 'Poppins',
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),

            // Bottom page indicator
            Positioned(
              bottom: screenHeight * 0.045,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _indicatorDot(),
                  const SizedBox(width: 12),
                  Container(
                    width: screenWidth * 0.055,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  const SizedBox(width: 12),
                  _indicatorDot(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _indicatorDot() {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.35),
      ),
    );
  }
}

class _SplashDeliveryPainter extends CustomPainter {
  const _SplashDeliveryPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final unit = math
        .min(size.width / 350, size.height / 132)
        .clamp(.7, 1.15)
        .toDouble();
    final groundY = size.height * .76;
    final start = Offset(size.width * .23, groundY - 5);
    final control = Offset(size.width * .5, size.height * .09);
    final end = Offset(size.width * .77, groundY - 5);
    final route = Path()
      ..moveTo(start.dx, start.dy)
      ..quadraticBezierTo(control.dx, control.dy, end.dx, end.dy);

    final glow = Rect.fromCenter(
      center: Offset(size.width * .5, groundY + 2),
      width: size.width * .92,
      height: size.height * .34,
    );
    canvas.drawOval(
      glow,
      Paint()
        ..shader = const RadialGradient(
          colors: [Color(0x35F4A8BC), Color(0x001B1018)],
        ).createShader(glow),
    );

    final routeMetric = route.computeMetrics().first;
    for (double distance = 0; distance < routeMetric.length; distance += 9) {
      canvas.drawPath(
        routeMetric.extractPath(
          distance,
          math.min(distance + 2.4, routeMetric.length),
        ),
        Paint()
          ..color = Colors.white.withValues(alpha: .38)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5
          ..strokeCap = StrokeCap.round,
      );
    }

    _drawShop(canvas, size.width * .08, groundY, unit);
    _drawHome(canvas, size.width * .69, groundY, unit);

    if (progress > 0) {
      canvas.drawPath(
        routeMetric.extractPath(0, routeMetric.length * progress),
        Paint()
          ..color = const Color(0xFFFFE6B8).withValues(alpha: .3)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 7
          ..strokeCap = StrokeCap.round,
      );
      canvas.drawPath(
        routeMetric.extractPath(0, routeMetric.length * progress),
        Paint()
          ..color = const Color(0xFFFFE6B8)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round,
      );
    }

    final tangent = routeMetric.getTangentForOffset(
      routeMetric.length * progress.clamp(0.0, 1.0),
    );
    if (tangent != null) _drawParcel(canvas, tangent.position, progress, unit);
  }

  void _drawShop(Canvas canvas, double x, double bottom, double unit) {
    final width = 54 * unit;
    final depth = 14 * unit;
    final top = bottom - 35 * unit;

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(x + width * .62, bottom + 2 * unit),
        width: width + depth,
        height: 6 * unit,
      ),
      Paint()..color = const Color(0x440A0710),
    );
    _polygon(
        canvas,
        [
          Offset(x + width, top),
          Offset(x + width + depth, top - depth * .4),
          Offset(x + width + depth, bottom - depth * .4),
          Offset(x + width, bottom),
        ],
        const Color(0xFF98485E));
    _polygon(
        canvas,
        [
          Offset(x, top),
          Offset(x + width, top),
          Offset(x + width, bottom),
          Offset(x, bottom),
        ],
        const Color(0xFFFFE4D2));
    _polygon(
        canvas,
        [
          Offset(x, top),
          Offset(x + width, top),
          Offset(x + width + depth, top - depth * .4),
          Offset(x + depth, top - depth * .4),
        ],
        const Color(0xFFFFBBAA));

    canvas.drawRect(
      Rect.fromLTWH(x - unit, top + 8 * unit, width + 2 * unit, 8 * unit),
      Paint()..color = const Color(0xFF8F304B),
    );
    canvas.drawRect(
      Rect.fromLTWH(
        x + 5 * unit,
        top + 20 * unit,
        24 * unit,
        10 * unit,
      ),
      Paint()..color = const Color(0xFFFFF1D9),
    );
    canvas.drawRect(
      Rect.fromLTWH(
        x + 36 * unit,
        top + 16 * unit,
        11 * unit,
        19 * unit,
      ),
      Paint()..color = const Color(0xFF71344A),
    );
  }

  void _drawHome(Canvas canvas, double x, double bottom, double unit) {
    final width = 48 * unit;
    final depth = 13 * unit;
    final wallTop = bottom - 31 * unit;
    final apex = Offset(x + width * .5, wallTop - 17 * unit);

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(x + width * .6, bottom + 2 * unit),
        width: width + depth,
        height: 6 * unit,
      ),
      Paint()..color = const Color(0x440A0710),
    );
    _polygon(
        canvas,
        [
          Offset(x + width, wallTop),
          Offset(x + width + depth, wallTop - depth * .4),
          Offset(x + width + depth, bottom - depth * .4),
          Offset(x + width, bottom),
        ],
        const Color(0xFFB88C9B));
    _polygon(
        canvas,
        [
          Offset(x, wallTop),
          Offset(x + width, wallTop),
          Offset(x + width, bottom),
          Offset(x, bottom),
        ],
        const Color(0xFFFFEAD6));
    _polygon(
        canvas,
        [
          apex,
          Offset(apex.dx + depth, apex.dy - depth * .4),
          Offset(x + width + depth, wallTop - depth * .4),
          Offset(x + width, wallTop),
        ],
        const Color(0xFF8E3B52));
    _polygon(
        canvas,
        [
          apex,
          Offset(x + width, wallTop),
          Offset(x, wallTop),
        ],
        const Color(0xFFCA5C68));

    for (var window = 0; window < 2; window++) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            x + (7 + window * 26) * unit,
            wallTop + 8 * unit,
            12 * unit,
            10 * unit,
          ),
          Radius.circular(2 * unit),
        ),
        Paint()..color = const Color(0xFFFFD98A),
      );
    }
  }

  void _drawParcel(Canvas canvas, Offset center, double progress, double unit) {
    canvas.save();
    canvas.translate(center.dx, center.dy - 8 * unit);
    canvas.rotate(math.sin(progress * math.pi) * .12);

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(0, 14 * unit),
        width: 25 * unit,
        height: 4 * unit,
      ),
      Paint()..color = const Color(0x550A0710),
    );
    _polygon(
        canvas,
        [
          Offset(-11 * unit, -5 * unit),
          Offset(0, -12 * unit),
          Offset(12 * unit, -5 * unit),
          Offset(0, 2 * unit),
        ],
        const Color(0xFFFFE9C9));
    _polygon(
        canvas,
        [
          Offset(-11 * unit, -5 * unit),
          Offset(0, 2 * unit),
          Offset(0, 13 * unit),
          Offset(-11 * unit, 7 * unit),
        ],
        const Color(0xFFE7AF75));
    _polygon(
        canvas,
        [
          Offset(0, 2 * unit),
          Offset(12 * unit, -5 * unit),
          Offset(12 * unit, 7 * unit),
          Offset(0, 13 * unit),
        ],
        const Color(0xFFC98458));
    canvas.drawLine(
      Offset(0, -11 * unit),
      Offset(0, 12 * unit),
      Paint()
        ..color = const Color(0xFFFFF3D8)
        ..strokeWidth = 1.5 * unit
        ..strokeCap = StrokeCap.round,
    );
    canvas.restore();
  }

  void _polygon(Canvas canvas, List<Offset> points, Color color) {
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    path.close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_SplashDeliveryPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
