import Item from "../models/Item.js";
import Category from "../models/Category.js";

// Helper function to escape regex special characters
const escapeRegex = (text) => {
  if (typeof text !== "string") return ""; // Ensure text is a string
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const searchTerm = req.query.q || "";
    const trimmedSearchTerm = searchTerm.trim();

    if (trimmedSearchTerm.length < 1) {
      return res.json({ results: [] });
    }

    const initialFetchLimit = 15; // Fetch more initially to allow for better sorting
    const finalLimitPerType = 5; // Max results per type after sorting
    const totalSuggestionsLimit = 10; // Max total suggestions

    const escapedSearchTerm = escapeRegex(trimmedSearchTerm);
    // Regex for contains, starts-with, and exact match (case-insensitive)
    const searchRegex = new RegExp(escapedSearchTerm, "i");
    const startsWithRegex = new RegExp("^" + escapedSearchTerm, "i");
    const exactMatchRegex = new RegExp("^" + escapedSearchTerm + "$", "i");

    // --- Search for items ---
    const itemQuery = {
      $or: [
        { name: searchRegex },
        { shortDescription: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
      ],
      status: "active", // Only search active items
    };

    const items = await Item.find(itemQuery)
      .select("_id name shortDescription brand sku images slug status") // Include fields for scoring
      .limit(initialFetchLimit) // Fetch a bit more for better sorting
      .lean();

    let scoredItems = items.map((item) => {
      let score = 0;
      const lowerTrimmedSearchTerm = trimmedSearchTerm.toLowerCase();

      // Name scoring (highest priority)
      if (item.name) {
        if (exactMatchRegex.test(item.name)) score = 100;
        else if (startsWithRegex.test(item.name)) score = 90;
        else if (searchRegex.test(item.name)) score = 80;
      }

      // SKU scoring (high priority, often specific)
      if (item.sku) {
        if (item.sku.toLowerCase() === lowerTrimmedSearchTerm)
          score = Math.max(score, 95); // Exact SKU match
        else if (startsWithRegex.test(item.sku))
          score = Math.max(score, 85); // SKU starts with
        else if (searchRegex.test(item.sku)) score = Math.max(score, 75); // SKU contains
      }

      // Brand scoring
      if (item.brand) {
        if (exactMatchRegex.test(item.brand)) score = Math.max(score, 70);
        else if (startsWithRegex.test(item.brand)) score = Math.max(score, 65);
        else if (searchRegex.test(item.brand)) score = Math.max(score, 60);
      }

      // Short description scoring (lower priority)
      if (item.shortDescription && searchRegex.test(item.shortDescription)) {
        score = Math.max(score, 50);
      }

      // Bonus for items if they matched and have images
      if (score > 0 && item.images && item.images.length > 0) {
        score += 1; // Small bonus for having any image
        if (item.images.some((img) => img.isPrimary)) {
          score += 2; // Slightly more for having a primary image
        }
      }

      return { ...item, score };
    });

    // Filter out items with no match (score 0) and then sort
    scoredItems = scoredItems.filter((item) => item.score > 0);
    scoredItems.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      // Tie-breaking: items with primary images first, then by name
      const aHasPrimary = a.images && a.images.some((img) => img.isPrimary);
      const bHasPrimary = b.images && b.images.some((img) => img.isPrimary);
      if (aHasPrimary !== bHasPrimary) {
        return bHasPrimary ? 1 : -1; // true (primary) comes before false
      }
      return a.name.localeCompare(b.name); // Alphabetical by name
    });

    const finalItems = scoredItems.slice(0, finalLimitPerType);

    const itemResults = finalItems.map((item) => {
      let imagePath = null;
      if (item.images && item.images.length > 0) {
        const primaryImage = item.images.find((img) => img.isPrimary);
        imagePath = primaryImage ? primaryImage.path : item.images[0].path;
      }
      return {
        _id: item._id,
        name: item.name,
        type: "item",
        imagePath: imagePath,
        slug: item.slug,
        // score: item.score // Optional: for debugging on client-side
      };
    });

    // --- Search for categories ---
    const categoryQuery = {
      name: searchRegex,
    };

    const categories = await Category.find(categoryQuery)
      .select("_id name slug imagePath")
      .limit(initialFetchLimit)
      .lean();

    let scoredCategories = categories.map((category) => {
      let score = 0;
      if (category.name) {
        if (exactMatchRegex.test(category.name)) score = 100;
        else if (startsWithRegex.test(category.name)) score = 90;
        else if (searchRegex.test(category.name)) score = 80;
      }

      // Bonus for categories if they matched and have an image
      if (score > 0 && category.imagePath) {
        score += 3;
      }
      return { ...category, score };
    });

    scoredCategories = scoredCategories.filter((cat) => cat.score > 0);
    scoredCategories.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tie-breaking: categories with images first, then by name
      if (!!a.imagePath !== !!b.imagePath) {
        return !!b.imagePath ? 1 : -1; // true (has image) comes before false
      }
      return a.name.localeCompare(b.name);
    });

    const finalCategories = scoredCategories.slice(0, finalLimitPerType);

    const categoryResults = finalCategories.map((category) => ({
      _id: category._id,
      name: category.name,
      type: "category",
      imagePath: category.imagePath,
      slug: category.slug,
      // score: category.score // Optional: for debugging
    }));

    // Combine results - already sorted and limited per type
    let combinedResults = [...itemResults, ...categoryResults];

    // If you want to strictly enforce the total limit by global score,
    // you would need to add 'score' to itemResults/categoryResults and sort 'combinedResults' here.
    // For now, this approach ensures diversity by taking top N of each type.
    if (combinedResults.length > totalSuggestionsLimit) {
      combinedResults = combinedResults.slice(0, totalSuggestionsLimit);
    }

    res.json({ results: combinedResults });
  } catch (error) {
    console.error("Error in search suggestions:", error);
    res.status(500).json({
      message: "Error fetching search suggestions.",
      error: error.message,
    });
  }
};
