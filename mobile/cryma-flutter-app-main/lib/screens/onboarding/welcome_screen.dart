import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../utils/colors.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.primaryDark,
        body: Stack(
          fit: StackFit.expand,
          children: [
            const _AnimatedMarketplaceBackdrop(),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x55741F35),
                    Color(0x79741F35),
                    Color(0xC9292326),
                  ],
                  stops: [0, .38, 1],
                ),
              ),
            ),
            const Positioned(
              top: -110,
              right: -135,
              child: _OutlineRing(size: 330),
            ),
            const Positioned(
              top: -72,
              right: -96,
              child: _OutlineRing(size: 250),
            ),
            const Positioned(
              bottom: -180,
              left: -175,
              child: _OutlineRing(size: 390),
            ),
            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final width = constraints.maxWidth;
                  final storyHeight =
                      (constraints.maxHeight * .17).clamp(108.0, 150.0);
                  return SingleChildScrollView(
                    child: ConstrainedBox(
                      constraints:
                          BoxConstraints(minHeight: constraints.maxHeight),
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          width < 360 ? 23 : 28,
                          24,
                          width < 360 ? 23 : 28,
                          18,
                        ),
                        child: IntrinsicHeight(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 13,
                                  vertical: 9,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: .12),
                                  borderRadius: BorderRadius.circular(30),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: .32),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.location_on_outlined,
                                      size: 15,
                                      color: Colors.white,
                                    ),
                                    SizedBox(width: 7),
                                    Flexible(
                                      child: Text(
                                        'LOCAL FINDS · REAL PEOPLE',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 1.15,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(
                                height: storyHeight,
                                child: const _AnimatedMarketplaceIllustration(),
                              ),
                              Text(
                                'A MARKETPLACE THAT FEELS CLOSER.',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: .78),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.6,
                                ),
                              ),
                              const SizedBox(height: 13),
                              Text(
                                'Good things\nmove closer.',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: width < 360 ? 43 : 49,
                                  fontWeight: FontWeight.w700,
                                  height: 1.02,
                                  letterSpacing: -1.6,
                                ),
                              ),
                              const SizedBox(height: 17),
                              ConstrainedBox(
                                constraints:
                                    const BoxConstraints(maxWidth: 350),
                                child: Text(
                                  'Meet local sellers, discover things you love, and have your finds delivered.',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: .88),
                                    fontSize: 15,
                                    height: 1.55,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              const SizedBox(height: 28),
                              SizedBox(
                                width: double.infinity,
                                height: 60,
                                child: FilledButton.icon(
                                  onPressed: () =>
                                      Navigator.pushReplacementNamed(
                                    context,
                                    '/home',
                                  ),
                                  icon: const Icon(Icons.arrow_forward_rounded),
                                  label: const Text('Explore the marketplace'),
                                  style: FilledButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: AppColors.primaryDark,
                                    textStyle: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Center(
                                child: TextButton(
                                  onPressed: () => Navigator.pushNamed(
                                    context,
                                    '/register_personal',
                                  ),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    minimumSize: const Size(48, 48),
                                    textStyle: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  child: const Text('Create an account'),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Center(
                                child: Wrap(
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Text(
                                      'Already have an account? ',
                                      style: TextStyle(
                                        color:
                                            Colors.white.withValues(alpha: .8),
                                        fontSize: 13,
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () => Navigator.pushNamed(
                                        context,
                                        '/login',
                                      ),
                                      style: TextButton.styleFrom(
                                        foregroundColor: Colors.white,
                                        minimumSize: const Size(48, 48),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 4,
                                        ),
                                        textStyle: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          decoration: TextDecoration.underline,
                                          decorationColor: Colors.white,
                                        ),
                                      ),
                                      child: const Text('Sign in'),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      );
}

class _OutlineRing extends StatelessWidget {
  const _OutlineRing({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: SizedBox.square(
          dimension: size,
          child: DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withValues(alpha: .12),
                width: 1,
              ),
            ),
          ),
        ),
      );
}

class _AnimatedMarketplaceBackdrop extends StatelessWidget {
  const _AnimatedMarketplaceBackdrop();

  @override
  Widget build(BuildContext context) => Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF701D3B),
                  Color(0xFF4B172D),
                  Color(0xFF20151D),
                ],
                stops: [0, .55, 1],
              ),
            ),
          ),
          Positioned(
            top: -180,
            right: -130,
            child: Container(
              width: 430,
              height: 430,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [Color(0x40F4A8BC), Colors.transparent],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -240,
            left: -180,
            child: Container(
              width: 480,
              height: 480,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [Color(0x2FE3A0B2), Colors.transparent],
                ),
              ),
            ),
          ),
        ],
      );
}

class _AnimatedMarketplaceIllustration extends StatefulWidget {
  const _AnimatedMarketplaceIllustration();

  @override
  State<_AnimatedMarketplaceIllustration> createState() =>
      _AnimatedMarketplaceIllustrationState();
}

class _AnimatedMarketplaceIllustrationState
    extends State<_AnimatedMarketplaceIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
        key: const Key('welcome-marketplace-illustration'),
        image: true,
        label: 'Animated delivery story from a local shop to your door',
        child: ExcludeSemantics(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => LayoutBuilder(
              builder: (context, constraints) {
                final progress = _controller.value;
                final journey =
                    ((progress - .14) / .62).clamp(0.0, 1.0).toDouble();
                final easedJourney = Curves.easeInOutCubic.transform(journey);
                final height = constraints.maxHeight;
                final width = constraints.maxWidth;
                final groundY = height * .7;
                final startX = width * .23;
                final endX = width * .77;
                final parcelX = startX + (endX - startX) * easedJourney;
                final startY = groundY - 8;
                final controlY = height * .18;
                final remaining = 1 - easedJourney;
                final parcelY = remaining * remaining * startY +
                    2 * remaining * easedJourney * controlY +
                    easedJourney * easedJourney * startY;
                final shopActive = progress < .24;
                final homeActive = progress >= .76 && progress < .96;
                final storyBeat = progress < .14
                    ? 'GOOD THINGS, CLOSE BY'
                    : progress < .76
                        ? 'ON ITS WAY TO YOU'
                        : 'AT YOUR DOOR';
                return Stack(
                  children: [
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          storyBeat,
                          key: ValueKey(storyBeat),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: .9,
                            color: Colors.white.withValues(alpha: .8),
                          ),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _IsometricDeliveryPainter(
                          progress: easedJourney,
                          deliveryComplete: homeActive,
                        ),
                      ),
                    ),
                    Positioned(
                      left: width * .04,
                      bottom: 0,
                      child: _StoryStop(
                        label: 'LOCAL SHOP',
                        isActive: shopActive,
                      ),
                    ),
                    Positioned(
                      right: width * .04,
                      bottom: 0,
                      child: _StoryStop(
                        label: 'YOUR DOOR',
                        isActive: homeActive,
                      ),
                    ),
                    Positioned(
                      left: parcelX - 23,
                      top: parcelY - 20,
                      child: Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.identity()
                          ..setEntry(3, 2, .002)
                          ..rotateY(math.sin(easedJourney * math.pi) * .5)
                          ..rotateZ(math.sin(easedJourney * math.pi) * .08),
                        child: Transform.scale(
                          scale: 1 - math.sin(easedJourney * math.pi) * .16,
                          child: _MovingParcel(
                            progress: easedJourney,
                            key: const Key('welcome-moving-parcel'),
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );
}

class _StoryStop extends StatelessWidget {
  const _StoryStop({
    required this.label,
    required this.isActive,
  });

  final String label;
  final bool isActive;

  @override
  Widget build(BuildContext context) => Container(
        width: 76,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: isActive ? .17 : .09),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.white.withValues(alpha: isActive ? .52 : .22),
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: const Color(0xFFE9A7B8).withValues(alpha: .17),
                    blurRadius: 16,
                  ),
                ]
              : const [],
        ),
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 350),
          style: TextStyle(
            fontFamily: 'Poppins',
            fontSize: 8,
            fontWeight: FontWeight.w700,
            letterSpacing: .5,
            color: Colors.white.withValues(alpha: isActive ? .95 : .7),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
          ),
        ),
      );
}

class _MovingParcel extends StatelessWidget {
  const _MovingParcel({required this.progress, super.key});

  final double progress;

  @override
  Widget build(BuildContext context) => CustomPaint(
        size: const Size(46, 42),
        painter: _IsometricParcelPainter(progress: progress),
      );
}

class _IsometricParcelPainter extends CustomPainter {
  const _IsometricParcelPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final unit = math.min(size.width / 46, size.height / 42);
    Offset point(double x, double y) => Offset(x * unit, y * unit);

    canvas.drawOval(
      Rect.fromCenter(
        center: point(23, 38),
        width: 31 * unit,
        height: 5 * unit,
      ),
      Paint()..color = const Color(0x440A0710),
    );

    final top = Path()
      ..moveTo(point(7, 13).dx, point(7, 13).dy)
      ..lineTo(point(21, 5).dx, point(21, 5).dy)
      ..lineTo(point(39, 13).dx, point(39, 13).dy)
      ..lineTo(point(24, 22).dx, point(24, 22).dy)
      ..close();
    final left = Path()
      ..moveTo(point(7, 13).dx, point(7, 13).dy)
      ..lineTo(point(24, 22).dx, point(24, 22).dy)
      ..lineTo(point(24, 38).dx, point(24, 38).dy)
      ..lineTo(point(7, 29).dx, point(7, 29).dy)
      ..close();
    final right = Path()
      ..moveTo(point(24, 22).dx, point(24, 22).dy)
      ..lineTo(point(39, 13).dx, point(39, 13).dy)
      ..lineTo(point(39, 29).dx, point(39, 29).dy)
      ..lineTo(point(24, 38).dx, point(24, 38).dy)
      ..close();

    canvas.drawPath(top, Paint()..color = const Color(0xFFFFE9C9));
    canvas.drawPath(left, Paint()..color = const Color(0xFFE7AF75));
    canvas.drawPath(right, Paint()..color = const Color(0xFFC98458));

    final tape = Paint()
      ..color = const Color(0xFFFFF3D8)
      ..strokeWidth = 3 * unit
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(point(21, 6), point(24, 22), tape);
    canvas.drawLine(point(24, 22), point(24, 37), tape);
    canvas.drawLine(point(7, 13), point(24, 22), tape);

    final gleamX = 12 + progress * 21;
    canvas.drawLine(
      point(gleamX, 15),
      point(gleamX, 26),
      Paint()
        ..color = Colors.white.withValues(alpha: .42)
        ..strokeWidth = 1.3 * unit
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_IsometricParcelPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

class _IsometricDeliveryPainter extends CustomPainter {
  const _IsometricDeliveryPainter({
    required this.progress,
    required this.deliveryComplete,
  });

  final double progress;
  final bool deliveryComplete;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = math
        .min(size.height / 150, size.width / 350)
        .clamp(.68, 1.0)
        .toDouble();
    final groundY = size.height * .7;
    _drawGround(canvas, size, groundY);
    _drawShop(canvas, size.width * .04, groundY, scale);
    _drawHome(canvas, size.width * .7, groundY, scale);
    _drawRoute(canvas, size, groundY);

    final destination = Offset(size.width * .77, groundY - 8);
    if (deliveryComplete) {
      canvas.drawCircle(
        destination,
        15,
        Paint()..color = const Color(0xFFFFE6B8).withValues(alpha: .2),
      );
      canvas.drawCircle(
        destination,
        10,
        Paint()
          ..color = const Color(0xFFFFE6B8).withValues(alpha: .72)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.4,
      );
    }

    _drawProgressRoute(canvas, size, groundY);
  }

  void _drawGround(Canvas canvas, Size size, double groundY) {
    final glowBounds = Rect.fromCenter(
      center: Offset(size.width * .5, groundY + 4),
      width: size.width * .92,
      height: size.height * .28,
    );
    canvas.drawOval(
      glowBounds,
      Paint()
        ..shader = const RadialGradient(
          colors: [Color(0x35F1B1C2), Color(0x001B1018)],
        ).createShader(glowBounds),
    );
    for (var index = 0; index < 3; index++) {
      final x = size.width * (.37 + index * .12);
      final y = size.height * (.32 + (index.isEven ? .03 : 0));
      canvas.drawCircle(
        Offset(x, y),
        index == 1 ? 1.5 : 1,
        Paint()..color = Colors.white.withValues(alpha: .32),
      );
    }
  }

  void _drawShop(Canvas canvas, double x, double bottom, double scale) {
    final width = 54 * scale;
    final depth = 16 * scale;
    final height = 38 * scale;
    final top = bottom - height;

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(x + width * .58 + depth * .45, bottom + 2 * scale),
        width: (width + depth * 1.5),
        height: 7 * scale,
      ),
      Paint()..color = const Color(0x440A0710),
    );
    _drawPolygon(
        canvas,
        [
          Offset(x + width, top),
          Offset(x + width + depth, top - depth * .45),
          Offset(x + width + depth, bottom - depth * .45),
          Offset(x + width, bottom),
        ],
        const Color(0xFF9B4960));
    _drawPolygon(
        canvas,
        [
          Offset(x, top),
          Offset(x + width, top),
          Offset(x + width, bottom),
          Offset(x, bottom),
        ],
        const Color(0xFFFFDCCB));
    _drawPolygon(
        canvas,
        [
          Offset(x, top),
          Offset(x + width, top),
          Offset(x + width + depth, top - depth * .45),
          Offset(x + depth, top - depth * .45),
        ],
        const Color(0xFFFFBBAA));

    final awningTop = top + 8 * scale;
    final awning =
        Rect.fromLTWH(x - scale, awningTop, width + 2 * scale, 10 * scale);
    canvas.drawRRect(
      RRect.fromRectAndRadius(awning, Radius.circular(2 * scale)),
      Paint()..color = const Color(0xFF8F304B),
    );
    for (var stripe = 0; stripe < 5; stripe++) {
      final stripeX = x + stripe * width / 5;
      canvas.drawRect(
        Rect.fromLTWH(stripeX, awningTop, width / 10, 10 * scale),
        Paint()..color = const Color(0xFFFFE6C9),
      );
    }

    final window = Rect.fromLTWH(
      x + 5 * scale,
      awningTop + 14 * scale,
      24 * scale,
      13 * scale,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(window, Radius.circular(2 * scale)),
      Paint()..color = const Color(0xFFFFF0D8),
    );
    canvas.drawRect(
      Rect.fromLTWH(
          x + 35 * scale, awningTop + 14 * scale, 12 * scale, 24 * scale),
      Paint()..color = const Color(0xFF71344A),
    );
    canvas.drawCircle(
      Offset(x + 44 * scale, awningTop + 27 * scale),
      1.2 * scale,
      Paint()..color = const Color(0xFFFFE6B8),
    );
  }

  void _drawHome(Canvas canvas, double x, double bottom, double scale) {
    final width = 48 * scale;
    final depth = 15 * scale;
    final wallHeight = 34 * scale;
    final wallTop = bottom - wallHeight;
    final roofHeight = 19 * scale;
    final apex = Offset(x + width * .5, wallTop - roofHeight);

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(x + width * .58 + depth * .45, bottom + 2 * scale),
        width: width + depth * 1.5,
        height: 7 * scale,
      ),
      Paint()..color = const Color(0x440A0710),
    );
    _drawPolygon(
        canvas,
        [
          Offset(x + width, wallTop),
          Offset(x + width + depth, wallTop - depth * .45),
          Offset(x + width + depth, bottom - depth * .45),
          Offset(x + width, bottom),
        ],
        const Color(0xFFB88C9B));
    _drawPolygon(
        canvas,
        [
          Offset(x, wallTop),
          Offset(x + width, wallTop),
          Offset(x + width, bottom),
          Offset(x, bottom),
        ],
        const Color(0xFFFFEAD6));
    _drawPolygon(
        canvas,
        [
          apex,
          Offset(apex.dx + depth, apex.dy - depth * .45),
          Offset(x + width + depth + 3 * scale, wallTop - depth * .45),
          Offset(x + width + 3 * scale, wallTop),
        ],
        const Color(0xFF8E3B52));
    _drawPolygon(
        canvas,
        [
          apex,
          Offset(x + width + 3 * scale, wallTop),
          Offset(x - 3 * scale, wallTop),
        ],
        const Color(0xFFCA5C68));

    for (var window = 0; window < 2; window++) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            x + (7 + window * 27) * scale,
            wallTop + 9 * scale,
            12 * scale,
            11 * scale,
          ),
          Radius.circular(2 * scale),
        ),
        Paint()..color = const Color(0xFFFFD98A),
      );
    }
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          x + 20 * scale,
          wallTop + 21 * scale,
          12 * scale,
          13 * scale,
        ),
        Radius.circular(3 * scale),
      ),
      Paint()..color = const Color(0xFF823C50),
    );
  }

  void _drawRoute(Canvas canvas, Size size, double groundY) {
    final path = _routePath(size, groundY);
    final metric = path.computeMetrics().first;
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: .34)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;
    for (double distance = 0; distance < metric.length; distance += 9) {
      canvas.drawPath(
        metric.extractPath(distance, math.min(distance + 2.4, metric.length)),
        paint,
      );
    }
  }

  void _drawProgressRoute(Canvas canvas, Size size, double groundY) {
    if (progress <= 0) return;
    final metric = _routePath(size, groundY).computeMetrics().first;
    final path = metric.extractPath(0, metric.length * progress);
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0xFFFFE6B8).withValues(alpha: .28)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0xFFFFE6B8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round,
    );
  }

  Path _routePath(Size size, double groundY) {
    final start = Offset(size.width * .23, groundY - 8);
    final control = Offset(size.width * .5, size.height * .18);
    final end = Offset(size.width * .77, groundY - 8);
    return Path()
      ..moveTo(start.dx, start.dy)
      ..quadraticBezierTo(control.dx, control.dy, end.dx, end.dy);
  }

  void _drawPolygon(Canvas canvas, List<Offset> points, Color color) {
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    path.close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_IsometricDeliveryPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.deliveryComplete != deliveryComplete;
}
