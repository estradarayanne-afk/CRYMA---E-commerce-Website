import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/buyer_category.dart';
import '../../services/api_service.dart';
import '../../services/favorites_store.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_auth_guard.dart';
import '../../widgets/product_card.dart';

class _SearchFieldSelectionControls extends MaterialTextSelectionControls {
  _SearchFieldSelectionControls();

  @override
  Widget buildHandle(
    BuildContext context,
    TextSelectionHandleType type,
    double textLineHeight, [
    VoidCallback? onTap,
  ]) {
    return const SizedBox.shrink();
  }

  @override
  Size getHandleSize(double textLineHeight) => Size.zero;
}

final _searchFieldSelectionControls = _SearchFieldSelectionControls();

class SearchResultsScreen extends StatefulWidget {
  const SearchResultsScreen({
    super.key,
    this.searchQuery,
    this.category,
  });

  final String? searchQuery;
  final String? category;

  @override
  State<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends State<SearchResultsScreen> {
  static final _categoryOptions = buyerCategories.map((c) => c.name).toList();

  List<Map<String, dynamic>> _results = [];
  String? _selectedCategory;
  String _sortOrder = 'Newest';
  String? _shuffleDay;
  bool _loading = true;
  bool _loadingMore = false;
  bool _inStockOnly = false;
  double? _minPrice;
  double? _maxPrice;
  int _page = 1;
  int _lastPage = 1;
  int _totalResults = 0;
  late final TextEditingController _searchController;
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = '';
  final Set<String> _favoriteIds = {};
  String? _error;

  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _searchQuery = widget.searchQuery ?? '';
    if (_searchQuery.isEmpty) _sortOrder = 'Recommended';
    _searchController = TextEditingController(text: _searchQuery);
    _selectedCategory = widget.category;
    _scrollController = ScrollController()..addListener(_onScroll);
    _loadFavorites();
    _loadResults();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _submitSearch(String value) async {
    final query = value.trim();
    _searchFocusNode.unfocus();
    if (query == _searchQuery) return;
    setState(() => _searchQuery = query);
    await _loadResults();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_loadingMore &&
        _page < _lastPage) {
      _loadResults(append: true);
    }
  }

  Future<void> _loadFavorites() async {
    if (!await hasBuyerSession()) {
      if (mounted) setState(_favoriteIds.clear);
      return;
    }
    final ids = await FavoritesStore.instance.getIds();
    if (mounted) {
      setState(() {
        _favoriteIds
          ..clear()
          ..addAll(ids);
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
    if (mounted) {
      setState(() {
        if (!_favoriteIds.add(id)) _favoriteIds.remove(id);
      });
    }
  }

  Future<void> _loadResults({bool append = false}) async {
    if (append && _loadingMore) return;
    setState(() {
      if (append) {
        _loadingMore = true;
      } else {
        _loading = true;
        _page = 1;
      }
      _error = null;
    });
    try {
      final sortOrder = switch (_sortOrder) {
        'Recommended' when _searchQuery.isEmpty => 'randomized',
        'Price: low to high' => 'price-low',
        'Price: high to low' => 'price-high',
        _ => 'newest',
      };
      final page = await ApiService.instance.getProductsPage(
        search: _searchQuery.isEmpty ? null : _searchQuery,
        category: _selectedCategory,
        minPrice: _minPrice,
        maxPrice: _maxPrice,
        inStockOnly: _inStockOnly,
        sort: sortOrder,
        shuffleDay: append ? _shuffleDay : null,
        page: append ? _page + 1 : 1,
      );
      if (sortOrder == 'randomized' && page.items.isNotEmpty) {
        unawaited(ApiService.instance
            .recordProductImpressions(
                page.items.map((item) => item['id'].toString()).toList())
            .then(
              (_) {},
              onError: (Object error, StackTrace stackTrace) {
                debugPrint('Unable to record product exposure: $error');
              },
            ));
      }
      if (!mounted) return;
      setState(() {
        if (append) {
          _results.addAll(page.items);
        } else {
          _results = page.items;
          _shuffleDay = page.shuffleDay;
        }
        _page = page.currentPage;
        _lastPage = page.lastPage;
        _totalResults = page.total;
        _loading = false;
        _loadingMore = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _showFilters() async {
    final initialMin = _minPrice?.toString() ?? '';
    final initialMax = _maxPrice?.toString() ?? '';
    var minInput = initialMin;
    var maxInput = initialMax;
    var priceFieldsVersion = 0;
    var category =
        _categoryOptions.contains(_selectedCategory) ? _selectedCategory! : '';
    var inStock = _inStockOnly;
    String? priceRangeError;
    final formKey = GlobalKey<FormState>();

    final values = await showModalBottomSheet<Map<String, Object?>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocal) => Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.9,
          ),
          decoration: const BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 12, 14),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: const BoxDecoration(
                          color: AppColors.softRose,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.tune_rounded,
                          color: AppColors.primary,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Filter products',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppColors.darkGray,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Narrow down your search',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 12,
                                color: AppColors.gray,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Close filters',
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded),
                        color: AppColors.gray,
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderNeutral),
                Expanded(
                  child: Form(
                    key: formKey,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                      children: [
                        const Text(
                          'Category',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.darkGray,
                          ),
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          initialValue: category,
                          decoration: const InputDecoration(
                            hintText: 'Choose a category',
                            prefixIcon: Icon(Icons.category_outlined),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('All categories'),
                            ),
                            ..._categoryOptions.map(
                              (value) => DropdownMenuItem(
                                value: value,
                                child: Text(value),
                              ),
                            ),
                          ],
                          onChanged: (value) =>
                              setLocal(() => category = value ?? ''),
                        ),
                        const SizedBox(height: 22),
                        const Text(
                          'Price range',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.darkGray,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Leave either field blank if it has no limit.',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 12,
                            color: AppColors.gray,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                key: ValueKey(
                                    'minimum-price-$priceFieldsVersion'),
                                initialValue:
                                    priceFieldsVersion == 0 ? initialMin : '',
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                  decimal: true,
                                ),
                                textInputAction: TextInputAction.next,
                                onSaved: (value) => minInput = value ?? '',
                                onChanged: (_) =>
                                    setLocal(() => priceRangeError = null),
                                validator: _validatePrice,
                                decoration: const InputDecoration(
                                  labelText: 'Minimum',
                                  prefixText: '₱ ',
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                key: ValueKey(
                                    'maximum-price-$priceFieldsVersion'),
                                initialValue:
                                    priceFieldsVersion == 0 ? initialMax : '',
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                  decimal: true,
                                ),
                                textInputAction: TextInputAction.done,
                                onSaved: (value) => maxInput = value ?? '',
                                onChanged: (_) =>
                                    setLocal(() => priceRangeError = null),
                                validator: _validatePrice,
                                decoration: const InputDecoration(
                                  labelText: 'Maximum',
                                  prefixText: '₱ ',
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (priceRangeError != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            priceRangeError!,
                            style: const TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 12,
                              color: AppColors.danger,
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        Material(
                          color: AppColors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: const BorderSide(
                                color: AppColors.borderNeutral),
                          ),
                          child: SwitchListTile(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            value: inStock,
                            onChanged: (value) =>
                                setLocal(() => inStock = value),
                            activeThumbColor: AppColors.primary,
                            secondary: const Icon(
                              Icons.inventory_2_outlined,
                              color: AppColors.primary,
                            ),
                            title: const Text(
                              'In stock only',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.darkGray,
                              ),
                            ),
                            subtitle: const Text(
                              'Only show items available to buy now',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 12,
                                color: AppColors.gray,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderNeutral),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  child: Row(
                    children: [
                      TextButton(
                        onPressed: () {
                          setLocal(() {
                            priceFieldsVersion++;
                            minInput = '';
                            maxInput = '';
                            category = '';
                            inStock = false;
                            priceRangeError = null;
                          });
                        },
                        child: const Text('Reset'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () {
                            if (!formKey.currentState!.validate()) return;
                            formKey.currentState!.save();
                            final min = double.tryParse(minInput.trim());
                            final max = double.tryParse(maxInput.trim());
                            if (min != null && max != null && min > max) {
                              setLocal(() {
                                priceRangeError =
                                    'Minimum price must not exceed maximum.';
                              });
                              return;
                            }
                            Navigator.pop(context, <String, Object?>{
                              'category': category,
                              'min': minInput,
                              'max': maxInput,
                              'stock': inStock,
                            });
                          },
                          icon: const Icon(Icons.check_rounded),
                          label: const Text('Apply filters'),
                        ),
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

    if (values == null || !mounted) return;

    final min = double.tryParse((values['min'] as String).trim());
    final max = double.tryParse((values['max'] as String).trim());
    setState(() {
      _selectedCategory = (values['category'] as String).isEmpty
          ? null
          : values['category'] as String;
      _minPrice = min;
      _maxPrice = max;
      _inStockOnly = values['stock'] as bool;
    });
    await _loadResults();
  }

  String? _validatePrice(String? value) {
    final input = value?.trim() ?? '';
    if (input.isEmpty) return null;
    final price = double.tryParse(input);
    if (price == null) return 'Enter a valid amount';
    if (price < 0) return 'Price cannot be negative';
    return null;
  }

  Future<void> _showSortSheet() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Sort by',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkGray,
                  ),
                ),
              ),
            ),
            for (final option in [
              'Recommended',
              'Newest',
              'Price: low to high',
              'Price: high to low',
            ])
              ListTile(
                title:
                    Text(option, style: const TextStyle(fontFamily: 'Poppins')),
                trailing: option == _sortOrder
                    ? const Icon(Icons.check_rounded, color: AppColors.primary)
                    : null,
                onTap: () => Navigator.pop(context, option),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (selected != null && mounted) {
      setState(() => _sortOrder = selected);
      await _loadResults();
    }
  }

  bool get _hasActiveFilters =>
      _selectedCategory != null ||
      _minPrice != null ||
      _maxPrice != null ||
      _inStockOnly;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            // ── SEARCH BAR ROW ─────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
              child: Row(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.arrow_back_rounded,
                        color: AppColors.primary, size: 26),
                    onPressed: () => Navigator.pop(context),
                    tooltip: 'Back',
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: AppColors.borderNeutral,
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.search_rounded,
                            size: 19,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 9),
                          Expanded(
                            child: TextField(
                              key: const Key('buyer-results-search-field'),
                              controller: _searchController,
                              focusNode: _searchFocusNode,
                              textInputAction: TextInputAction.search,
                              onChanged: (_) => setState(() {}),
                              onSubmitted: _submitSearch,
                              cursorColor: AppColors.primary,
                              selectionControls: _searchFieldSelectionControls,
                              style: const TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 14,
                                color: AppColors.darkGray,
                              ),
                              decoration: const InputDecoration.collapsed(
                                hintText: 'Search products…',
                                hintStyle: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 14,
                                  color: AppColors.textSubtle,
                                ),
                              ),
                            ),
                          ),
                          if (_searchController.text.isNotEmpty)
                            IconButton(
                              tooltip: 'Clear search',
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints.tightFor(
                                width: 28,
                                height: 32,
                              ),
                              onPressed: () {
                                _searchController.clear();
                                _submitSearch('');
                              },
                              icon: const Icon(
                                Icons.close_rounded,
                                size: 18,
                              ),
                              color: AppColors.gray,
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── TOOLBAR ────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 12, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _loading
                          ? 'Searching…'
                          : '$_totalResults result${_totalResults == 1 ? '' : 's'}',
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  _ToolbarButton(
                    icon: Icons.filter_alt_outlined,
                    label: 'Filter',
                    active: _hasActiveFilters,
                    onTap: _showFilters,
                  ),
                  const SizedBox(width: 8),
                  _ToolbarButton(
                    icon: Icons.sort_rounded,
                    label: 'Sort',
                    onTap: _showSortSheet,
                  ),
                ],
              ),
            ),

            // ── RESULTS ────────────────────────────────────────────
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                        color: AppColors.textSecondary)),
                                const SizedBox(height: 12),
                                FilledButton(
                                    onPressed: _loadResults,
                                    child: const Text('Retry')),
                              ],
                            ),
                          ),
                        )
                      : _results.isEmpty
                          ? _buildEmpty()
                          : GridView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              gridDelegate:
                                  SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount:
                                    MediaQuery.of(context).size.width >= 600
                                        ? 3
                                        : 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 0.72,
                              ),
                              itemCount:
                                  _results.length + (_loadingMore ? 2 : 0),
                              itemBuilder: (context, index) {
                                if (index >= _results.length) {
                                  return Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: const Center(
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2)),
                                  );
                                }
                                final json = _results[index];
                                final id = json['id'].toString();
                                return ProductCardData.fromJson(
                                  json: json,
                                  isFavorite: _favoriteIds.contains(id),
                                  onToggleFavorite: () => _toggleFavorite(id),
                                  onTap: () => Navigator.pushNamed(
                                    context,
                                    '/product_detail',
                                    arguments: id,
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded,
                size: 52, color: AppColors.gray.withValues(alpha: 0.5)),
            const SizedBox(height: 14),
            const Text(
              'No results found',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.darkGray,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Try different keywords or adjust your filters.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                color: AppColors.gray,
                height: 1.45,
              ),
            ),
            if (_hasActiveFilters) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  setState(() {
                    _selectedCategory = null;
                    _minPrice = null;
                    _maxPrice = null;
                    _inStockOnly = false;
                  });
                  _loadResults();
                },
                child: const Text('Clear filters'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ToolbarButton extends StatelessWidget {
  const _ToolbarButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 11),
        decoration: BoxDecoration(
          color: active ? AppColors.softRose : AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: active ? AppColors.primary : AppColors.borderNeutral,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 16, color: active ? AppColors.primary : AppColors.gray),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: active ? AppColors.primary : AppColors.darkGray,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
