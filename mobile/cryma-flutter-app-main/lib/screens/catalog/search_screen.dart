import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/buyer_category.dart';
import '../../utils/colors.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  static const _recentKey = 'cryma_recent_searches';
  static const _maxRecent = 8;

  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  String _query = '';
  String? _selectedCategory;
  List<String> _recent = [];

  @override
  void initState() {
    super.initState();
    _loadRecent();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!kIsWeb) _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadRecent() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_recentKey) ?? [];
    if (mounted) setState(() => _recent = stored);
  }

  Future<void> _saveRecent(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return;
    final updated = [
      trimmed,
      ..._recent.where((s) => s.toLowerCase() != trimmed.toLowerCase()),
    ].take(_maxRecent).toList();
    if (mounted) setState(() => _recent = updated);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_recentKey, updated);
  }

  Future<void> _removeRecent(String query) async {
    setState(() => _recent.remove(query));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_recentKey, _recent);
  }

  Future<void> _clearRecent() async {
    setState(() => _recent = []);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_recentKey);
  }

  void _submit(String query) {
    final q = query.trim();
    if (q.isEmpty) return;
    _saveRecent(q);
    Navigator.pushNamed(context, '/search_results', arguments: q);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Find your next favorite',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 22,
                            height: 1.2,
                            fontWeight: FontWeight.w700,
                            color: AppColors.wine,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Discover products from local sellers',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 13,
                            color: AppColors.gray.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close search',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, size: 21),
                    style: IconButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      backgroundColor: AppColors.white.withValues(alpha: 0.8),
                      side: const BorderSide(color: AppColors.borderNeutral),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
              child: Container(
                height: 56,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: AppColors.borderNeutral.withValues(alpha: 0.8),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.wine.withValues(alpha: 0.09),
                      blurRadius: 22,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.search_rounded,
                      size: 22,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        focusNode: _focusNode,
                        textInputAction: TextInputAction.search,
                        textAlignVertical: TextAlignVertical.center,
                        onChanged: (value) => setState(() => _query = value),
                        onSubmitted: _submit,
                        cursorColor: AppColors.primary,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 14,
                          color: AppColors.darkGray,
                        ),
                        decoration: const InputDecoration.collapsed(
                          hintText: 'Search products or brands',
                          hintStyle: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 14,
                            color: AppColors.textSubtle,
                          ),
                        ),
                      ),
                    ),
                    if (_query.isNotEmpty)
                      SizedBox(
                        width: 32,
                        height: 32,
                        child: IconButton(
                          tooltip: 'Clear',
                          constraints: const BoxConstraints.expand(),
                          padding: EdgeInsets.zero,
                          icon: const Icon(Icons.close_rounded, size: 18),
                          color: AppColors.gray,
                          onPressed: () {
                            _controller.clear();
                            setState(() => _query = '');
                            _focusNode.requestFocus();
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // ── CONTENT ─────────────────────────────────────────────
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildRecentSection(),
                    _buildPopularSection(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.history_rounded,
                      size: 18, color: AppColors.primary),
                  SizedBox(width: 7),
                  Text(
                    'Recent searches',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.darkGray,
                    ),
                  ),
                ],
              ),
              if (_recent.isNotEmpty)
                TextButton(
                  onPressed: _clearRecent,
                  style: TextButton.styleFrom(
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: EdgeInsets.zero,
                  ),
                  child: const Text(
                    'Clear all',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 12,
                      color: AppColors.primary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (_recent.isEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 2),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              decoration: BoxDecoration(
                color: AppColors.white.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderNeutral),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.manage_search_rounded,
                    color: AppColors.gray,
                    size: 20,
                  ),
                  SizedBox(width: 9),
                  Text(
                    'Your recent searches will show up here.',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 12,
                      color: AppColors.gray,
                    ),
                  ),
                ],
              ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _recent.map(_buildRecentChip).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildRecentChip(String query) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.borderNeutral),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: () => _submit(query),
            borderRadius: BorderRadius.circular(22),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
              child: Text(
                query,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 12,
                  color: AppColors.darkGray,
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Remove $query',
            onPressed: () => _removeRecent(query),
            constraints: const BoxConstraints.tightFor(width: 32, height: 34),
            padding: EdgeInsets.zero,
            icon: const Icon(Icons.close_rounded,
                size: 15, color: AppColors.gray),
          ),
        ],
      ),
    );
  }

  Widget _buildPopularSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.grid_view_rounded, size: 17, color: AppColors.primary),
              SizedBox(width: 7),
              Text(
                'Explore categories',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.darkGray,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 42,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 1, vertical: 1),
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: buyerCategories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) =>
                  _buildCategoryPill(buyerCategories[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryPill(BuyerCategory category) {
    final selected = _selectedCategory == category.name;
    final foreground = selected ? AppColors.white : AppColors.primaryDark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: () {
          setState(() => _selectedCategory = category.name);
          Navigator.pushNamed(
            context,
            '/search_results',
            arguments: {'category': category.name},
          );
        },
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
              color: selected ? AppColors.primaryDark : const Color(0xFFE7CCD3),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.wine.withValues(
                  alpha: selected ? 0.2 : 0.09,
                ),
                blurRadius: selected ? 14 : 10,
                offset: const Offset(0, 4),
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
    );
  }
}
