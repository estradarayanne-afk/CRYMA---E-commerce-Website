import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/favorites_store.dart';
import '../utils/colors.dart';

// ============================================================
// MODEL
// ============================================================

class SearchResult {
  final String id;
  final String name;
  final int price;
  final int? originalPrice;
  final double rating;
  final String category;
  final String imagePath;
  final bool isSale;

  const SearchResult({
    required this.id,
    required this.name,
    required this.price,
    this.originalPrice,
    required this.rating,
    required this.category,
    required this.imagePath,
    this.isSale = false,
  });
}

// ============================================================
// SEARCH RESULTS SCREEN
// ============================================================

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
  static const _categoryOptions = [
    'Pet Supplies',
    'Electronics & Gadgets',
    "Women's Apparel",
    "Men's Apparel",
    'Kids & Baby',
    'Home & Garden',
    'Sports & Outdoors',
    'Health & Beauty',
    'Books & Media',
    'Food & Gourmet',
    'Automotive & Motorcycle',
    'Furniture & Office Equipment',
    'Jewelry & Watches',
    'Office & School Supplies',
  ];

  List<SearchResult> _results = [];
  String? _selectedCategory;
  String _sortOrder = 'Newest';
  bool _loading = true;
  bool _loadingMore = false;
  bool _inStockOnly = false;
  double? _minPrice;
  double? _maxPrice;
  int _page = 1;
  int _lastPage = 1;
  final Set<String> _favoriteIds = {};
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.category;
    _loadFavorites();
    _loadResults();
  }

  Future<void> _loadFavorites() async {
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
    await FavoritesStore.instance.toggle(id);
    if (mounted) {
      setState(() {
        if (!_favoriteIds.add(id)) _favoriteIds.remove(id);
      });
    }
  }

  Future<void> _loadResults({bool append = false}) async {
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
      final page = await ApiService.instance.getProductsPage(
        search: widget.searchQuery,
        category: _selectedCategory,
        minPrice: _minPrice,
        maxPrice: _maxPrice,
        inStockOnly: _inStockOnly,
        sort: switch (_sortOrder) {
          'Price: low to high' => 'price-low',
          'Price: high to low' => 'price-high',
          _ => 'newest'
        },
        page: append ? _page + 1 : 1,
      );
      final products = page.items;
      if (!mounted) return;
      setState(() {
        final rows = products.map((product) {
          final price =
              double.tryParse(product['price']?.toString() ?? '') ?? 0;
          final originalPrice =
              double.tryParse(product['original_price']?.toString() ?? '');
          final image = product['image']?.toString() ?? '';
          return SearchResult(
            id: product['id'].toString(),
            name: product['name']?.toString() ?? 'Product',
            price: price.round(),
            originalPrice: originalPrice?.round(),
            rating:
                double.tryParse(product['average_rating']?.toString() ?? '') ??
                    0,
            category: product['category']?.toString() ?? 'Other',
            imagePath:
                image.isEmpty ? '' : ApiService.instance.resolveImageUrl(image),
            isSale: originalPrice != null && originalPrice > price,
          );
        }).toList();
        if (append) {
          _results.addAll(rows);
        } else {
          _results = rows;
        }
        _page = page.currentPage;
        _lastPage = page.lastPage;
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

  List<SearchResult> get _displayedResults {
    final results = [..._results];
    if (_sortOrder == 'Price: low to high') {
      results.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortOrder == 'Price: high to low') {
      results.sort((a, b) => b.price.compareTo(a.price));
    }
    return results;
  }

  Future<void> _showFilters() async {
    final minimum = TextEditingController(text: _minPrice?.toString() ?? '');
    final maximum = TextEditingController(text: _maxPrice?.toString() ?? '');
    var category = _selectedCategory ?? '';
    var inStock = _inStockOnly;
    final values = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
                title: const Text('Filter products'),
                content: SingleChildScrollView(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                  DropdownButtonFormField<String>(
                      initialValue: category,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: [
                        const DropdownMenuItem(
                            value: '', child: Text('All categories')),
                        ..._categoryOptions.map((value) =>
                            DropdownMenuItem(value: value, child: Text(value)))
                      ],
                      onChanged: (value) =>
                          setDialogState(() => category = value ?? '')),
                  TextField(
                      controller: minimum,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration:
                          const InputDecoration(labelText: 'Minimum price')),
                  TextField(
                      controller: maximum,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration:
                          const InputDecoration(labelText: 'Maximum price')),
                  CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: inStock,
                      title: const Text('In stock only'),
                      onChanged: (value) =>
                          setDialogState(() => inStock = value ?? false)),
                ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel')),
                  TextButton(
                      onPressed: () => Navigator.pop(context, {
                            'category': category,
                            'min': minimum.text,
                            'max': maximum.text,
                            'stock': inStock
                          }),
                      child: const Text('Apply'))
                ],
              )),
    );
    minimum.dispose();
    maximum.dispose();
    if (values == null || !mounted) return;
    final min = double.tryParse(values['min'] as String);
    final max = double.tryParse(values['max'] as String);
    if (min != null && max != null && min > max) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Minimum price must not exceed maximum price.')));
      return;
    }
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

  Future<void> _showSortOptions() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final option in [
              'Newest',
              'Price: low to high',
              'Price: high to low',
            ])
              ListTile(
                title: Text(option),
                trailing: option == _sortOrder ? const Icon(Icons.check) : null,
                onTap: () => Navigator.pop(context, option),
              ),
          ],
        ),
      ),
    );
    if (selected != null && mounted) {
      setState(() => _sortOrder = selected);
      await _loadResults();
    }
  }

  Future<void> _loadMore() => _loadResults(append: true);

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ====================================================
            // SEARCH AREA
            // ====================================================

            Padding(
              padding: const EdgeInsets.only(
                left: 14,
                right: 14,
                top: 12,
                bottom: 6,
              ),
              child: Row(
                children: [
                  // BACK BUTTON
                  SizedBox(
                    width: 38,
                    height: 54,
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(
                        Icons.arrow_back,
                        size: 28,
                        color: AppColors.primary,
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),

                  const SizedBox(width: 6),

                  // SEARCH CONTAINER
                  Expanded(
                    child: Container(
                      height: 54,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 13,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                          color: const Color(0xFFE3E3E3),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.search,
                            size: 22,
                            color: AppColors.gray,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.category ??
                                  (widget.searchQuery?.isNotEmpty == true
                                      ? widget.searchQuery!
                                      : 'Search products, brands...'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w400,
                                color: widget.category != null ||
                                        widget.searchQuery?.isNotEmpty == true
                                    ? AppColors.darkGray
                                    : AppColors.gray,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ====================================================
            // RESULTS COUNT + FILTER + SORT
            // ====================================================

            Padding(
              padding: const EdgeInsets.fromLTRB(
                16,
                7,
                14,
                9,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // RESULTS COUNT
                  Expanded(
                    child: Text(
                      '${_results.length} results found',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),

                  // FILTER
                  _buildActionButton(
                    icon: Icons.filter_alt_outlined,
                    label: 'Filter',
                    onTap: _showFilters,
                  ),

                  const SizedBox(width: 8),

                  // SORT
                  _buildActionButton(
                    icon: Icons.sort,
                    label: 'Sort',
                    onTap: _showSortOptions,
                  ),
                ],
              ),
            ),

            // ====================================================
            // PRODUCT GRID
            // ====================================================

            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(20),
                                child:
                                    Text(_error!, textAlign: TextAlign.center),
                              ),
                              TextButton(
                                onPressed: _loadResults,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : _displayedResults.isEmpty
                          ? _buildEmptyState()
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(
                                16,
                                0,
                                16,
                                20,
                              ),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 14,
                                mainAxisSpacing: 14,

                                // SMALLER CARD
                                mainAxisExtent: 350,
                              ),
                              itemCount: _displayedResults.length +
                                  (_page < _lastPage ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == _displayedResults.length) {
                                  return Center(
                                      child: OutlinedButton(
                                          onPressed:
                                              _loadingMore ? null : _loadMore,
                                          child: Text(_loadingMore
                                              ? 'Loading…'
                                              : 'Load more')));
                                }
                                return _buildResultCard(
                                  context,
                                  _displayedResults[index],
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // FILTER / SORT BUTTON
  // ============================================================

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 46,
        padding: const EdgeInsets.symmetric(
          horizontal: 13,
        ),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: const Color(0xFFE3E3E3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: AppColors.primary,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 50,
            color: AppColors.gray.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 12),
          const Text(
            'No results found',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Try adjusting your search terms',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.gray,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // PRODUCT CARD
  // ============================================================

  Widget _buildResultCard(
    BuildContext context,
    SearchResult result,
  ) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/product_detail',
          arguments: result.id,
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,

        // IMPORTANT:
        // Image + information will fit inside the card.
        child: Column(
          children: [
            // ==================================================
            // IMAGE
            // ==================================================

            SizedBox(
              height: 165,
              width: double.infinity,
              child: Stack(
                children: [
                  // PRODUCT IMAGE
                  Positioned.fill(
                    child: result.imagePath.isEmpty
                        ? Container(
                            color: AppColors.lightGray,
                            child: const Center(
                                child: Icon(Icons.image_not_supported_outlined,
                                    size: 42, color: AppColors.gray)))
                        : Image(
                            image: result.imagePath.startsWith('http')
                                ? NetworkImage(result.imagePath)
                                : AssetImage(result.imagePath),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                                color: AppColors.lightGray,
                                child: const Center(
                                    child: Icon(
                                        Icons.image_not_supported_outlined,
                                        size: 42,
                                        color: AppColors.gray))),
                          ),
                  ),

                  // ==================================================
                  // SALE BADGE
                  // ==================================================

                  if (result.isSale)
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.danger,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'SALE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.white,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ),
                    ),

                  // ==================================================
                  // HEART
                  // ==================================================

                  Positioned(
                    top: 9,
                    right: 9,
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(13),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 3,
                          ),
                        ],
                      ),
                      child: IconButton(
                        tooltip: _favoriteIds.contains(result.id)
                            ? 'Remove from wishlist'
                            : 'Add to wishlist',
                        onPressed: () => _toggleFavorite(result.id),
                        icon: Icon(
                          _favoriteIds.contains(result.id)
                              ? Icons.favorite
                              : Icons.favorite_border,
                          size: 26,
                          color: _favoriteIds.contains(result.id)
                              ? AppColors.danger
                              : AppColors.gray,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ==================================================
            // PRODUCT INFORMATION
            // ==================================================

            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  12,
                  9,
                  12,
                  9,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // CATEGORY
                    Text(
                      result.category,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),

                    const SizedBox(height: 3),

                    // PRODUCT NAME
                    SizedBox(
                      height: 38,
                      child: Text(
                        result.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.2,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkGray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),

                    const SizedBox(height: 2),

                    // RATING
                    Row(
                      children: [
                        const Icon(
                          Icons.star,
                          size: 16,
                          color: AppColors.gold,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          result.rating.toString(),
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),

                    const Spacer(),

                    // ==================================================
                    // PRICE
                    // ==================================================

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          '₱${result.price}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        if (result.originalPrice != null) ...[
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              '₱${result.originalPrice}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                                color: AppColors.gray,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
