import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/buyer_category.dart';
import '../../services/api_service.dart';
import '../../services/cart_store.dart';
import '../../services/favorites_store.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_bottom_navigation_bar.dart';
import '../../widgets/buyer_auth_guard.dart';
import '../../widgets/product_card.dart';
import '../../widgets/section_header.dart';

class _ProductGridSkeleton extends StatefulWidget {
  const _ProductGridSkeleton();

  @override
  State<_ProductGridSkeleton> createState() => _ProductGridSkeletonState();
}

class _ProductGridSkeletonState extends State<_ProductGridSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) => LinearGradient(
            begin: Alignment(-1.5 + 3 * _controller.value, 0),
            end: Alignment(-0.5 + 3 * _controller.value, 0),
            colors: const [
              Color(0xFFF2E8E8),
              Color(0xFFFFF9F9),
              Color(0xFFF2E8E8),
            ],
          ).createShader(bounds),
          child: child,
        ),
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 4,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.72,
          ),
          itemBuilder: (context, index) => Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF2E8E8),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFFEBDDDD),
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(16)),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(width: 54, height: 8, color: Colors.white),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        height: 10,
                        color: Colors.white,
                      ),
                      const SizedBox(height: 6),
                      Container(width: 78, height: 10, color: Colors.white),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Map<String, dynamic>> _featuredProducts = [];
  bool _productsLoading = true;
  String? _productsError;
  String _firstName = '';
  String? _selectedHomeCategory;
  final Set<String> _favoriteIds = {};
  int _cartCount = 0;
  bool _hasUnreadMessages = false;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
    _loadFeaturedProducts();
    _loadCartCount();
    _loadGreeting();
  }

  Future<void> _loadGreeting() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('cryma_api_user');
      if (raw == null) return;
      final user = jsonDecode(raw);
      if (user is! Map<String, dynamic>) return;
      if (!mounted) return;
      setState(() => _firstName = user['first_name']?.toString().trim() ?? '');
      final conversations =
          await ApiService.instance.getBuyerChatConversations();
      if (!mounted) return;
      setState(() {
        _hasUnreadMessages = conversations.any(
          (conversation) =>
              (int.tryParse(
                    conversation['unread_messages_count']?.toString() ?? '',
                  ) ??
                  0) >
              0,
        );
      });
    } catch (error, stackTrace) {
      debugPrint('Could not load message notification state: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  Future<void> _loadFavorites() async {
    final ids = await FavoritesStore.instance.getIds();
    if (!mounted) return;
    setState(() {
      _favoriteIds
        ..clear()
        ..addAll(ids);
    });
  }

  Future<void> _loadCartCount() async {
    final items = await CartStore.instance.items();
    if (!mounted) return;
    setState(() => _cartCount = items.length);
  }

  Future<void> _loadFeaturedProducts({String? category}) async {
    setState(() {
      _productsLoading = true;
      _productsError = null;
    });
    try {
      final page = await ApiService.instance.getProductsPage(
        perPage: 8,
        category: category,
        sort: 'featured',
      );
      if (!mounted) return;
      setState(() {
        _featuredProducts = page.items;
        _productsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _productsError = error.toString();
        _productsLoading = false;
      });
    }
  }

  Future<void> _toggleFavorite(String id) async {
    if (!await requireBuyerSignIn(
      context,
      title: 'Sign in to save favorites',
      message:
          'Create an account or sign in to save products to your wishlist.',
    )) {
      return;
    }
    await FavoritesStore.instance.toggle(id);
    if (!mounted) return;
    setState(() {
      if (!_favoriteIds.add(id)) _favoriteIds.remove(id);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await _loadFeaturedProducts(
                    category: _selectedHomeCategory,
                  );
                  await _loadCartCount();
                },
                color: AppColors.primary,
                child: CustomScrollView(
                  physics: const BouncingScrollPhysics(),
                  slivers: [
                    SliverToBoxAdapter(child: _buildWelcomeSection()),
                    SliverToBoxAdapter(child: _buildCategoriesSection()),
                    SliverToBoxAdapter(
                      child: SectionHeader(
                        title: 'Picked for you',
                        actionLabel: 'See all',
                        onAction: () =>
                            Navigator.pushNamed(context, '/search_results'),
                      ),
                    ),
                    _buildProductsGrid(),
                    const SliverToBoxAdapter(child: SizedBox(height: 24)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 0,
        onDestinationSelected: (index) =>
            BuyerBottomNavigationBar.navigateToTab(context, index, 0),
      ),
    );
  }

  // ── TOPBAR: logo, search, cart, messages ─────────────────────────────────
  Widget _buildTopBar() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
      child: Row(
        children: [
          // Logo image
          Image.asset(
            'assets/image/cryma-logo.png',
            width: 32,
            height: 32,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.storefront_rounded,
                  color: Colors.white, size: 18),
            ),
          ),
          const SizedBox(width: 8),
          const Text(
            'CRYMA',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.wine,
              letterSpacing: 0.6,
            ),
          ),
          const Spacer(),
          // Search
          IconButton(
            tooltip: 'Search',
            icon: const Icon(Icons.search_rounded,
                color: AppColors.darkGray, size: 22),
            onPressed: () => Navigator.pushNamed(context, '/search'),
          ),
          // Cart with badge
          IconButton(
            tooltip: 'Cart',
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.shopping_bag_outlined,
                    color: AppColors.darkGray, size: 22),
                if (_cartCount > 0)
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(999),
                        border:
                            Border.all(color: AppColors.surface, width: 1.5),
                      ),
                      child: Text(
                        _cartCount > 9 ? '9+' : '$_cartCount',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: () => Navigator.pushNamed(context, '/cart'),
          ),
          // Messages
          IconButton(
            tooltip: 'Messages',
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.chat_bubble_outline_rounded,
                    color: AppColors.darkGray, size: 22),
                if (_hasUnreadMessages)
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        border:
                            Border.all(color: AppColors.surface, width: 1.5),
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: () => Navigator.pushNamed(context, '/chat_list'),
          ),
        ],
      ),
    );
  }

  // ── WELCOME MESSAGE ──────────────────────────────────────────────────────
  Widget _buildWelcomeSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back${_firstName.isEmpty ? '' : ', $_firstName'}! 👋',
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.wine,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Discover local finds near you.',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 13,
              color: AppColors.textSubtle,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // ── CATEGORIES ───────────────────────────────────────────────────────────
  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Shop by category',
          actionLabel: 'See all',
          onAction: () => Navigator.pushNamed(context, '/categories'),
        ),
        SizedBox(
          height: 52,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: buyerCategories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) =>
                _buildCategoryChip(buyerCategories[index]),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryChip(BuyerCategory category) {
    final selected = _selectedHomeCategory == category.name;
    final foreground = selected ? AppColors.white : AppColors.primaryDark;
    return Semantics(
      button: true,
      selected: selected,
      label: category.name,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () async {
            final nextCategory = selected ? null : category.name;
            setState(() => _selectedHomeCategory = nextCategory);
            await _loadFeaturedProducts(category: nextCategory);
          },
          borderRadius: BorderRadius.circular(28),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.fromLTRB(8, 6, 14, 6),
            decoration: BoxDecoration(
              gradient: selected
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.primary, AppColors.primaryDark],
                    )
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.white, AppColors.softRose],
                    ),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color:
                    selected ? AppColors.primaryDark : const Color(0xFFE7CCD3),
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.wine.withValues(
                    alpha: selected ? 0.2 : 0.09,
                  ),
                  blurRadius: selected ? 14 : 10,
                  offset: const Offset(0, 4),
                ),
                if (!selected)
                  const BoxShadow(
                    color: AppColors.white,
                    blurRadius: 0,
                    offset: Offset(0, -1),
                  ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.white.withValues(alpha: 0.16)
                        : AppColors.white,
                    shape: BoxShape.circle,
                    boxShadow: selected
                        ? null
                        : [
                            BoxShadow(
                              color: AppColors.wine.withValues(alpha: 0.07),
                              blurRadius: 5,
                              offset: const Offset(0, 2),
                            ),
                          ],
                  ),
                  child: Icon(category.icon, size: 15, color: foreground),
                ),
                const SizedBox(width: 8),
                Text(
                  category.name,
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: foreground,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── PRODUCTS GRID ────────────────────────────────────────────────────────
  Widget _buildProductsGrid() {
    if (_productsLoading) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: _ProductGridSkeleton(),
        ),
      );
    }
    if (_productsError != null) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              Text(_productsError!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => _loadFeaturedProducts(
                  category: _selectedHomeCategory,
                ),
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }
    if (_featuredProducts.isEmpty) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Center(
            child: Text('No products available yet.',
                style: TextStyle(color: AppColors.gray)),
          ),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final json = _featuredProducts[index];
            final id = json['id'].toString();
            return ProductCardData.fromJson(
              json: json,
              isFavorite: _favoriteIds.contains(id),
              onToggleFavorite: () => _toggleFavorite(id),
              onTap: () => Navigator.pushNamed(context, '/product_detail',
                  arguments: id),
            );
          },
          childCount: _featuredProducts.length,
        ),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: MediaQuery.of(context).size.width >= 600 ? 3 : 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
      ),
    );
  }
}
