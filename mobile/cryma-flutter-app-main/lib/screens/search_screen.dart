import 'package:flutter/material.dart';
import '../utils/colors.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  bool _isSearching = false;

  final List<String> _recentSearches = [
    'Puma sneakers',
    'Human Nature sunscreen',
    'Bench polo',
    'Anker earbuds',
  ];

  final List<String> _popularSearches = [
    'Korean skincare',
    'Gaming headset',
    'School bag',
    'Air fryer',
    'Running shoes',
  ];

  // ============================================================
  // INIT
  // ============================================================

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _searchFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  // ============================================================
  // HANDLE SEARCH
  // ============================================================

  void _handleSearch() {
    if (_searchController.text.trim().isNotEmpty) {
      Navigator.pushNamed(
        context,
        '/search_results',
        arguments: _searchController.text.trim(),
      );
    }
  }

  // ============================================================
  // CLEAR / CANCEL SEARCH
  // ============================================================

  void _clearSearch() {
    setState(() {
      _searchController.clear();
      _isSearching = false;
    });

    _searchFocusNode.unfocus();
  }

  // ============================================================
  // REMOVE RECENT SEARCH
  // ============================================================

  void _removeRecentSearch(String query) {
    setState(() {
      _recentSearches.remove(query);
    });
  }

  // ============================================================
  // CLEAR ALL RECENT SEARCHES
  // ============================================================

  void _clearAllRecentSearches() {
    setState(() {
      _recentSearches.clear();
    });
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // SEARCH BAR + CANCEL
            // ============================================================

            Padding(
              padding: const EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // ========================================================
                  // SEARCH CONTAINER
                  // ========================================================

                  Expanded(
                    child: Container(
                      height: 54,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: AppColors.primary,
                          width: 2,
                        ),
                      ),
                      child: Row(
                        children: [
                          // SEARCH ICON
                          const Icon(
                            Icons.search,
                            size: 24,
                            color: AppColors.primary,
                          ),

                          const SizedBox(width: 10),

                          // SEARCH TEXT FIELD
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              focusNode: _searchFocusNode,
                              onChanged: (value) {
                                setState(() {
                                  _isSearching = value.isNotEmpty;
                                });
                              },
                              onSubmitted: (_) => _handleSearch(),
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.darkGray,
                                fontFamily: 'Poppins',
                              ),
                              decoration: const InputDecoration(
                                hintText: 'Search products, brands...',
                                hintStyle: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.gray,
                                  fontFamily: 'Poppins',
                                ),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  // ========================================================
                  // CANCEL — OUTSIDE SEARCH CONTAINER
                  // ========================================================

                  GestureDetector(
                    onTap: _clearSearch,
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ============================================================
            // RECENT & POPULAR SEARCHES
            // ============================================================

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(
                  bottom: 20,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // RECENT SEARCHES
                    _buildRecentSection(),

                    // POPULAR SEARCHES
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

  // ============================================================
  // RECENT SEARCHES SECTION
  // ============================================================

  Widget _buildRecentSection() {
    return Container(
      margin: const EdgeInsets.only(
        top: 24,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // TITLE + CLEAR ALL
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Searches',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkGray,
                  fontFamily: 'Poppins',
                ),
              ),
              GestureDetector(
                onTap: _clearAllRecentSearches,
                child: const Text(
                  'Clear All',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // RECENT ITEMS
          if (_recentSearches.isNotEmpty)
            ..._recentSearches.map(
              (item) => _buildRecentItem(item),
            )
          else
            const Padding(
              padding: EdgeInsets.symmetric(
                vertical: 12,
              ),
              child: Text(
                'No recent searches',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ============================================================
  // RECENT SEARCH ITEM
  // ============================================================

  Widget _buildRecentItem(String query) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/search_results',
          arguments: query,
        );
      },
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              vertical: 8,
            ),
            child: Row(
              children: [
                // CLOCK ICON
                const Icon(
                  Icons.access_time,
                  size: 20,
                  color: AppColors.gray,
                ),

                const SizedBox(width: 12),

                // SEARCH QUERY
                Expanded(
                  child: Text(
                    query,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),

                // REMOVE
                GestureDetector(
                  onTap: () {
                    _removeRecentSearch(query);
                  },
                  child: const Icon(
                    Icons.close,
                    size: 20,
                    color: AppColors.gray,
                  ),
                ),
              ],
            ),
          ),

          // DIVIDER
          const Divider(
            height: 1,
            thickness: 1,
            color: AppColors.lightGray,
          ),
        ],
      ),
    );
  }

  // ============================================================
  // POPULAR SEARCHES SECTION
  // ============================================================

  Widget _buildPopularSection() {
    return Container(
      margin: const EdgeInsets.only(
        top: 20,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Popular Searches',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _popularSearches
                .map(
                  (item) => _buildPopularTag(item),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // POPULAR SEARCH TAG
  // ============================================================

  Widget _buildPopularTag(String query) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/search_results',
          arguments: query,
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 7,
        ),
        decoration: BoxDecoration(
          color: const Color(0xFFE5F1EF),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          query,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.primary,
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }
}
