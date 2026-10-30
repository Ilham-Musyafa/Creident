import { mergeCriteria, TERMS_TEMPLATES } from './termsTemplates';

export interface DealSubcategory { id: string; label: string; templateId?: string }
export interface DealCategory { id: string; label: string; hint?: string; subcategories: readonly DealSubcategory[] }
// Persist these explicit slugs; changing a display label must not change its id.
export const DEAL_CATEGORIES: readonly DealCategory[] = [
  { id: "electronics-computers", label: "Electronics & Computers", subcategories: [
    { id: "electronics-computers-laptops", label: "Laptops", templateId: "laptop" },
    { id: "electronics-computers-desktops-monitors", label: "Desktops & Monitors" },
    { id: "electronics-computers-tablets", label: "Tablets" },
    { id: "electronics-computers-cameras", label: "Cameras", templateId: "camera" },
    { id: "electronics-computers-headphones-speakers", label: "Headphones & Speakers", templateId: "audio" },
    { id: "electronics-computers-smartwatches-wearables", label: "Smartwatches & Wearables" },
    { id: "electronics-computers-computer-parts-accessories", label: "Computer Parts & Accessories" },
    { id: "electronics-computers-tvs-home-audio", label: "TVs & Home Audio" },
    { id: "electronics-computers-other", label: "Other" },
  ] },
  { id: "mobile-phones", label: "Mobile Phones", subcategories: [
    { id: "mobile-phones-smartphones", label: "Smartphones", templateId: "phone" },
    { id: "mobile-phones-feature-phones", label: "Feature Phones" },
    { id: "mobile-phones-cases-accessories", label: "Cases & Accessories" },
    { id: "mobile-phones-chargers-cables", label: "Chargers & Cables" },
    { id: "mobile-phones-other", label: "Other" },
  ] },
  { id: "video-games-consoles", label: "Video Games & Consoles", hint: "Physical items only", subcategories: [
    { id: "video-games-consoles-consoles", label: "Consoles", templateId: "console" },
    { id: "video-games-consoles-controllers-accessories", label: "Controllers & Accessories" },
    { id: "video-games-consoles-physical-games", label: "Physical Games" },
    { id: "video-games-consoles-retro-gaming", label: "Retro Gaming" },
    { id: "video-games-consoles-other", label: "Other" },
  ] },
  { id: "appliances", label: "Appliances", subcategories: [
    { id: "appliances-kitchen-appliances", label: "Kitchen Appliances" },
    { id: "appliances-laundry", label: "Laundry" },
    { id: "appliances-heating-cooling", label: "Heating & Cooling" },
    { id: "appliances-vacuums-cleaning", label: "Vacuums & Cleaning" },
    { id: "appliances-small-appliances", label: "Small Appliances" },
    { id: "appliances-other", label: "Other" },
  ] },
  { id: "furniture", label: "Furniture", subcategories: [
    { id: "furniture-sofas-chairs", label: "Sofas & Chairs" },
    { id: "furniture-tables-desks", label: "Tables & Desks" },
    { id: "furniture-beds-mattresses", label: "Beds & Mattresses" },
    { id: "furniture-storage-shelves", label: "Storage & Shelves" },
    { id: "furniture-outdoor-furniture", label: "Outdoor Furniture" },
    { id: "furniture-other", label: "Other" },
  ] },
  { id: "garden-outdoor", label: "Garden & Outdoor", subcategories: [
    { id: "garden-outdoor-garden-tools", label: "Garden Tools" },
    { id: "garden-outdoor-lawn-patio", label: "Lawn & Patio" },
    { id: "garden-outdoor-camping-hiking", label: "Camping & Hiking" },
    { id: "garden-outdoor-grills-bbq", label: "Grills & BBQ" },
    { id: "garden-outdoor-other", label: "Other" },
  ] },
  { id: "tools-equipment", label: "Tools & Equipment", subcategories: [
    { id: "tools-equipment-power-tools", label: "Power Tools" },
    { id: "tools-equipment-hand-tools", label: "Hand Tools" },
    { id: "tools-equipment-workshop-equipment", label: "Workshop Equipment" },
    { id: "tools-equipment-office-business-equipment", label: "Office & Business Equipment" },
    { id: "tools-equipment-other", label: "Other" },
  ] },
  { id: "bicycles", label: "Bicycles", subcategories: [
    { id: "bicycles-road-bikes", label: "Road Bikes" },
    { id: "bicycles-mountain-bikes", label: "Mountain Bikes" },
    { id: "bicycles-electric-bikes", label: "Electric Bikes" },
    { id: "bicycles-parts-accessories", label: "Parts & Accessories" },
    { id: "bicycles-other", label: "Other" },
  ] },
  { id: "automotive-parts", label: "Automotive Parts", subcategories: [
    { id: "automotive-parts-car-parts", label: "Car Parts" },
    { id: "automotive-parts-motorcycle-parts", label: "Motorcycle Parts" },
    { id: "automotive-parts-wheels-tires", label: "Wheels & Tires" },
    { id: "automotive-parts-car-electronics", label: "Car Electronics" },
    { id: "automotive-parts-accessories", label: "Accessories" },
    { id: "automotive-parts-other", label: "Other" },
  ] },
  { id: "clothing-accessories", label: "Clothing & Accessories", subcategories: [
    { id: "clothing-accessories-mens", label: "Men's" },
    { id: "clothing-accessories-womens", label: "Women's" },
    { id: "clothing-accessories-kids", label: "Kids'" },
    { id: "clothing-accessories-shoes", label: "Shoes" },
    { id: "clothing-accessories-bags-wallets", label: "Bags & Wallets" },
    { id: "clothing-accessories-watches-jewelry", label: "Watches & Jewelry" },
    { id: "clothing-accessories-other", label: "Other" },
  ] },
  { id: "toys", label: "Toys", subcategories: [
    { id: "toys-building-sets", label: "Building Sets" },
    { id: "toys-dolls-plush", label: "Dolls & Plush" },
    { id: "toys-remote-control-models", label: "Remote-Control & Models" },
    { id: "toys-board-games-puzzles", label: "Board Games & Puzzles" },
    { id: "toys-other", label: "Other" },
  ] },
  { id: "books", label: "Books", subcategories: [
    { id: "books-textbooks", label: "Textbooks" },
    { id: "books-fiction", label: "Fiction" },
    { id: "books-non-fiction", label: "Non-fiction" },
    { id: "books-comics-manga", label: "Comics & Manga" },
    { id: "books-childrens-books", label: "Children's Books" },
    { id: "books-other", label: "Other" },
  ] },
  { id: "movies-music", label: "Movies & Music", subcategories: [
    { id: "movies-music-dvds-blu-rays", label: "DVDs & Blu-rays" },
    { id: "movies-music-vinyl-records", label: "Vinyl Records" },
    { id: "movies-music-cds", label: "CDs" },
    { id: "movies-music-other", label: "Other" },
  ] },
  { id: "musical-instruments", label: "Musical Instruments", subcategories: [
    { id: "musical-instruments-guitars-basses", label: "Guitars & Basses" },
    { id: "musical-instruments-keyboards-pianos", label: "Keyboards & Pianos" },
    { id: "musical-instruments-drums-percussion", label: "Drums & Percussion" },
    { id: "musical-instruments-audio-gear", label: "Audio Gear" },
    { id: "musical-instruments-other", label: "Other" },
  ] },
  { id: "arts-crafts", label: "Arts & Crafts", subcategories: [
    { id: "arts-crafts-painting-drawing-supplies", label: "Painting & Drawing Supplies" },
    { id: "arts-crafts-sewing-fabric", label: "Sewing & Fabric" },
    { id: "arts-crafts-craft-kits", label: "Craft Kits" },
    { id: "arts-crafts-handmade-items", label: "Handmade Items" },
    { id: "arts-crafts-other", label: "Other" },
  ] },
  { id: "antiques-collectibles", label: "Antiques & Collectibles", subcategories: [
    { id: "antiques-collectibles-coins-stamps", label: "Coins & Stamps" },
    { id: "antiques-collectibles-trading-cards", label: "Trading Cards" },
    { id: "antiques-collectibles-vintage-items", label: "Vintage Items" },
    { id: "antiques-collectibles-memorabilia", label: "Memorabilia" },
    { id: "antiques-collectibles-other", label: "Other" },
  ] },
  { id: "sports-fitness", label: "Sports & Fitness", subcategories: [
    { id: "sports-fitness-gym-equipment", label: "Gym Equipment" },
    { id: "sports-fitness-team-sports", label: "Team Sports" },
    { id: "sports-fitness-water-sports", label: "Water Sports" },
    { id: "sports-fitness-fitness-accessories", label: "Fitness Accessories" },
    { id: "sports-fitness-other", label: "Other" },
  ] },
  { id: "other", label: "Other", subcategories: [
  ] },
] as const;

const LEGACY: Record<string, readonly [string, string]> = {
  phone: ['mobile-phones', 'mobile-phones-smartphones'],
  laptop: ['electronics-computers', 'electronics-computers-laptops'],
  camera: ['electronics-computers', 'electronics-computers-cameras'],
  audio: ['electronics-computers', 'electronics-computers-headphones-speakers'],
  console: ['video-games-consoles', 'video-games-consoles-consoles'],
};

/** Read old terms without rewriting them or their locked/audited history. */
export function resolveDealCategory(categoryId: unknown, subcategoryId?: unknown) {
  const legacy = typeof categoryId === 'string' ? LEGACY[categoryId] : undefined;
  const category = DEAL_CATEGORIES.find(c => c.id === (legacy?.[0] ?? categoryId)) ?? DEAL_CATEGORIES[17]!;
  const subcategory = category.subcategories.find(s => s.id === (legacy?.[1] ?? subcategoryId));
  return { category, subcategory };
}

export function categoryTerms(categoryId: string, subcategoryId: string) {
  const { category, subcategory } = resolveDealCategory(categoryId, subcategoryId);
  return { category: category.id, ...(subcategory ? { subcategory: subcategory.id } : {}) };
}

export function categoryChecklist(categoryId: string, subcategoryId: string, criteria: string) {
  const { subcategory } = resolveDealCategory(categoryId, subcategoryId);
  const template = TERMS_TEMPLATES.find(t => t.id === subcategory?.templateId);
  return { criteria: template ? mergeCriteria(criteria, template) : criteria, added: Boolean(template) };
}
