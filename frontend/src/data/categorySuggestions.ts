export interface CategoryDefinition {
  id: string;
  name: string;
  emoji: string;
  colorClass: string;
  items: string[];
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    emoji: '🍔',
    colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    items: [
      'Swiggy / Zomato',
      'Dinner with Flatmates',
      'Lunch / Thali',
      'Breakfast',
      'Evening Snacks',
      'Pizza & Burgers',
      'Biryani',
      'Chai & Coffee',
      'Dessert & Ice Cream',
      'Midnight Cravings',
      'Office Cafeteria',
    ],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    emoji: '🛒',
    colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    items: [
      'Milk & Dairy',
      'Bread & Buns',
      'Eggs (Tray)',
      'Fresh Vegetables',
      'Fresh Fruits',
      'Rice & Atta / Flour',
      'Cooking Oil & Ghee',
      'Spices & Masala',
      'Curd & Paneer',
      'Maggi & Instant Noodles',
      'Dal & Pulses',
      'Tea & Coffee Powder',
      'Butter & Cheese',
      'Onions & Potatoes',
      'Biscuits & Cookies',
    ],
  },
  {
    id: 'household',
    name: 'Household Supplies',
    emoji: '🧹',
    colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    items: [
      'Dishwashing Liquid (Vim)',
      'Washing Powder (Surf Excel)',
      'Garbage / Trash Bags',
      'Toilet Cleaner (Harpic)',
      'Floor Cleaner (Lizol)',
      'Handwash Refill',
      'Broom & Mop',
      'Paper Towels & Tissues',
      'Mosquito Repellent (All Out)',
      'Dish Scrubbers & Sponges',
      'Air Freshener',
      'Aluminium Foil',
    ],
  },
  {
    id: 'utilities',
    name: 'Utilities & Bills',
    emoji: '⚡',
    colorClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    items: [
      'Wi-Fi / Internet Bill',
      'Electricity Bill',
      'Drinking Water Cans (20L)',
      'LPG Gas Cylinder',
      'Maid Salary',
      'Cook Salary',
      'Society Maintenance',
      'Piped Natural Gas (PNG)',
      'DTH / Cable TV',
    ],
  },
  {
    id: 'health',
    name: 'Medicines & Health',
    emoji: '💊',
    colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    items: [
      'Paracetamol / Crocin',
      'Cough & Cold Syrup',
      'First Aid & Bandages',
      'ORS & Electral',
      'Antacid (Digene / Eno)',
      'Pain Relief Spray (Volini)',
      'Daily Multivitamins',
      'Hand Sanitizer',
      'Prescription Medicines',
    ],
  },
  {
    id: 'transport',
    name: 'Transport & Fuel',
    emoji: '🚗',
    colorClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    items: [
      'Uber / Ola Ride',
      'Auto Rickshaw Fare',
      'Metro Card Recharge',
      'Petrol / Fuel',
      'Bus / Shuttle Pass',
      'Parking Fee',
      'Toll Tax',
      'Train / Flight Booking',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment & OTT',
    emoji: '🍿',
    colorClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    items: [
      'Netflix Subscription',
      'Spotify Subscription',
      'Movie Tickets',
      'Board Games',
      'Hotstar / Prime Video',
      'PlayStation / Gaming',
      'Weekend Outing',
    ],
  },
  {
    id: 'personal',
    name: 'Personal Care',
    emoji: '🧴',
    colorClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    items: [
      'Shampoo & Conditioner',
      'Toothpaste & Toothbrush',
      'Body Wash & Soap',
      'Deodorant & Perfume',
      'Salon / Haircut',
      'Sunscreen & Skincare',
      'Shaving Blades / Foam',
    ],
  },
  {
    id: 'misc',
    name: 'Miscellaneous',
    emoji: '📦',
    colorClass: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    items: [
      'Mobile Recharge',
      'Stationery & Printouts',
      'Laundry / Dry Clean',
      'Duplicate Flat Keys',
      'Courier & Shipping',
      'Plumber / Electrician Fee',
    ],
  },
];

/**
 * Match a category by name or keyword (case-insensitive)
 */
export function findCategoryByName(name?: string | null): CategoryDefinition | undefined {
  if (!name || !name.trim()) return undefined;
  const query = name.trim().toLowerCase();

  // Exact or close match on category name or ID
  const directMatch = DEFAULT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === query || c.id.toLowerCase() === query
  );
  if (directMatch) return directMatch;

  // Substring matching
  return DEFAULT_CATEGORIES.find((c) => {
    const cName = c.name.toLowerCase();
    return cName.includes(query) || query.includes(cName) ||
      (query === 'food' && c.id === 'food') ||
      (query === 'grocery' && c.id === 'groceries') ||
      (query === 'bill' && c.id === 'utilities');
  });
}

/**
 * Get items related to a category name. If category is empty or unknown,
 * returns a mix of the most common flatmate purchases.
 */
export function getRelatedItems(categoryName?: string | null): string[] {
  const cat = findCategoryByName(categoryName);
  if (cat) {
    return cat.items;
  }

  // Fallback to popular everyday items across categories
  return [
    'Milk & Dairy',
    'Bread & Buns',
    'Eggs (Tray)',
    'Drinking Water Cans (20L)',
    'Swiggy / Zomato',
    'Dishwashing Liquid (Vim)',
    'Trash / Garbage Bags',
    'Fresh Vegetables',
    'Wi-Fi / Internet Bill',
  ];
}

/**
 * Given an item name, automatically guess the most likely category.
 */
export function guessCategoryForItem(itemName?: string | null): CategoryDefinition | undefined {
  if (!itemName || !itemName.trim()) return undefined;
  const q = itemName.trim().toLowerCase();

  for (const cat of DEFAULT_CATEGORIES) {
    for (const item of cat.items) {
      const itemLower = item.toLowerCase();
      // Match if item contains query or query contains item word
      if (itemLower.includes(q) || q.includes(itemLower)) {
        return cat;
      }
      // Check partial words (e.g. "milk" in "Milk & Dairy")
      const words = itemLower.split(/[\s/()&,]+/).filter((w) => w.length > 2);
      if (words.some((w) => q.includes(w) || w.includes(q))) {
        return cat;
      }
    }
  }

  return undefined;
}
