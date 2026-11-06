class BuyerCategory {
  const BuyerCategory({
    required this.id,
    required this.name,
    required this.imagePath,
    this.items = 'Browse products',
  });

  final String id;
  final String name;
  final String items;
  final String imagePath;
}

const buyerCategories = <BuyerCategory>[
  BuyerCategory(
    id: '1',
    name: 'Pet Supplies',
    imagePath: 'assets/image/others.jpg',
  ),
  BuyerCategory(
    id: '2',
    name: 'Electronics & Gadgets',
    imagePath: 'assets/image/electronics.jpg',
  ),
  BuyerCategory(
    id: '3',
    name: "Women's Apparel",
    imagePath: 'assets/image/fashion.jpg',
  ),
  BuyerCategory(
    id: '4',
    name: "Men's Apparel",
    imagePath: 'assets/image/fashion.jpg',
  ),
  BuyerCategory(
    id: '5',
    name: 'Kids & Baby',
    imagePath: 'assets/image/accessories.jpg',
  ),
  BuyerCategory(
    id: '6',
    name: 'Home & Garden',
    imagePath: 'assets/image/homes.jpg',
  ),
  BuyerCategory(
    id: '7',
    name: 'Sports & Outdoors',
    imagePath: 'assets/image/sports.jpg',
  ),
  BuyerCategory(
    id: '8',
    name: 'Health & Beauty',
    imagePath: 'assets/image/beauty.jpg',
  ),
  BuyerCategory(
    id: '9',
    name: 'Books & Media',
    imagePath: 'assets/image/others.jpg',
  ),
  BuyerCategory(
    id: '10',
    name: 'Food & Gourmet',
    imagePath: 'assets/image/food.jpg',
  ),
  BuyerCategory(
    id: '11',
    name: 'Automotive & Motorcycle',
    imagePath: 'assets/image/others.jpg',
  ),
  BuyerCategory(
    id: '12',
    name: 'Furniture & Office Equipment',
    imagePath: 'assets/image/homes.jpg',
  ),
  BuyerCategory(
    id: '13',
    name: 'Jewelry & Watches',
    imagePath: 'assets/image/accessories.jpg',
  ),
  BuyerCategory(
    id: '14',
    name: 'Office & School Supplies',
    imagePath: 'assets/image/school_supplies.jpg',
  ),
];
