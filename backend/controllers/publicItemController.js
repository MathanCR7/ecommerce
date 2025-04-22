// backend/controllers/publicItemController.js
import asyncHandler from "express-async-handler";
import Item from "../models/Item.js"; // Changed from Product to Item
import Category from "../models/Category.js"; // Needed if filtering by category slug

// GET /api/items - Fetch all active items (public), allow filtering/pagination
export const getPublicItems = asyncHandler(async (req, res) => {
  const {
    category: categorySlug, // Filter by category slug
    search, // Search term
    sort, // Sorting option
    page = 1, // Current page number
    limit = 10, // Items per page
  } = req.query;
  console.log("[Ctrl Public Item] Fetching items with query:", req.query); // Changed Log Prefix

  // Base query filter: only fetch 'active' items publicly
  const queryFilter = { status: "active" };

  // Filter by Category Slug if provided
  if (categorySlug) {
    const category = await Category.findOne({
      slug: categorySlug.toLowerCase(),
    }).select("_id"); // Only need the ID for filtering
    if (category) {
      queryFilter.category = category._id; // Add category ID to the filter
    } else {
      // If the category slug doesn't exist, return no items for this filter
      console.log(
        `[Ctrl Public Item] Category slug "${categorySlug}" not found.`
      );
      return res
        .status(200)
        .json({ success: true, items: [], page: 1, pages: 0, count: 0 }); // Changed response key to items
    }
  }

  // Filter by Search Term (using text index on 'name' and 'description')
  if (search) {
    queryFilter.$text = { $search: search };
  }

  // Sorting options
  let sortOptions = { createdAt: -1 }; // Default sort: newest first
  if (sort === "price_asc") sortOptions = { price: 1 }; // Price: Low to High
  else if (sort === "price_desc")
    sortOptions = { price: -1 }; // Price: High to Low
  else if (sort === "name_asc") sortOptions = { name: 1 }; // Name: A to Z
  else if (sort === "name_desc") sortOptions = { name: -1 }; // Name: Z to A

  // Pagination Calculation
  const count = await Item.countDocuments(queryFilter); // Use Item model
  const pages = Math.ceil(count / limit); // Total number of pages
  const skip = (page - 1) * limit; // Number of documents to skip

  // Execute Query to fetch items
  const items = await Item.find(queryFilter) // Use Item model
    .populate("category", "name slug") // Populate referenced category details
    .select("-createdBy -updatedAt -sku -stock -status") // Exclude internal/sensitive fields from public view
    .sort(sortOptions) // Apply sorting
    .limit(parseInt(limit)) // Apply limit per page
    .skip(skip); // Apply skip for pagination

  console.log(
    `[Ctrl Public Item] Found ${items.length} items (Page ${page}/${pages}, Total ${count}).` // Changed Log Prefix
  );
  res.status(200).json({
    success: true,
    items, // Changed response key to items
    page: parseInt(page),
    pages,
    count,
  });
});

// GET /api/items/:id - Fetch a single active item by ID (public)
export const getPublicItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`[Ctrl Public Item] Fetching item by ID: ${id}`); // Changed Log Prefix

  // Mongoose automatically validates ObjectId format, errorHandler handles CastError
  const item = await Item.findOne({ _id: id, status: "active" }) // Use Item model, ensure active status
    .populate("category", "name slug")
    .select("-createdBy -updatedAt -sku -stock -status"); // Exclude internal/sensitive fields

  if (!item) {
    res.status(404);
    throw new Error("Item not found or is inactive."); // Changed message
  }

  console.log(`[Ctrl Public Item] Found item: ${item.name}`); // Changed Log Prefix
  res.status(200).json({ success: true, item }); // Changed response key to item
});
