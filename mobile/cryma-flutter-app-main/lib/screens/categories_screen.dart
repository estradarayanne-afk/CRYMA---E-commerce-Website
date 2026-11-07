import 'package:flutter/material.dart';

import '../models/buyer_category.dart';
import '../utils/colors.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<BuyerCategory> get _filtered {
    if (_searchQuery.isEmpty) return buyerCategories;
    final q = _searchQuery.toLowerCase();
    return buyerCategories
        .where((c) => c.name.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            // ── HEADER ─────────────────────────────────────────────────
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.fromLTRB(4, 10, 8, 8),
              child: const Row(
                children: [
                  const BackButton(color: AppColors.primary),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Browse',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppColors.wine,
                            height: 1.15,
                          ),
                        ),
                        Text(
                          "Find something you'll love",
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 10,
                            color: AppColors.gray,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── SEARCH ────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 11),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(27),
                  border: Border.all(
                    color: AppColors.borderNeutral.withValues(alpha: 0.8),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.wine.withValues(alpha: 0.07),
                      blurRadius: 18,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: AppColors.softRose,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.search_rounded,
                        size: 19,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (v) =>
                            setState(() => _searchQuery = v.trim()),
                        textAlignVertical: TextAlignVertical.center,
                        cursorColor: AppColors.primary,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 14,
                          color: AppColors.darkGray,
                        ),
                        decoration: const InputDecoration(
                          hintText: 'Search categories',
                          hintStyle: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 14,
                            color: AppColors.textSubtle,
                          ),
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          disabledBorder: InputBorder.none,
                          errorBorder: InputBorder.none,
                          focusedErrorBorder: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                          isCollapsed: true,
                        ),
                      ),
                    ),
                    if (_searchQuery.isNotEmpty)
                      SizedBox(
                        width: 32,
                        height: 32,
                        child: IconButton(
                          tooltip: 'Clear',
                          constraints: const BoxConstraints.expand(),
                          padding: EdgeInsets.zero,
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                          icon: const Icon(
                            Icons.close_rounded,
                            size: 17,
                            color: AppColors.gray,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // ── GRID ──────────────────────────────────────────────────
            Expanded(
              child: _filtered.isEmpty
                  ? const Center(
                      child: Text(
                        'No categories found.',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 14,
                          color: AppColors.gray,
                        ),
                      ),
                    )
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final cols = constraints.maxWidth >= 600 ? 3 : 2;
                        return GridView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: cols,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.88,
                          ),
                          itemCount: _filtered.length,
                          itemBuilder: (context, index) =>
                              _buildCard(_filtered[index]),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(BuyerCategory category) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.pushNamed(
          context,
          '/search_results',
          arguments: {'category': category.name},
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    category.imagePath,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.softRose,
                      child: Center(
                        child: Icon(category.icon,
                            color: AppColors.primary, size: 32),
                      ),
                    ),
                  ),
                  // Arrow overlay
                  Positioned(
                    right: 8,
                    bottom: 8,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: const Icon(Icons.arrow_forward_rounded,
                          size: 15, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
            // Label
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 8, 10),
              child: Text(
                category.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                  color: AppColors.wine,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
