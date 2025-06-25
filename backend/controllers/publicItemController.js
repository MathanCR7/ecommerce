// backend/controllers/publicItemController.js
import asyncHandler from "express-async-handler";
import Item from "../models/Item.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";
import Order from "../models/Order.js"; // <--- NEW: Import the Order model

// Helper to prepare item data for public list view (MODIFIED)
const preparePublicListItem = (itemDoc) => {
  if (!itemDoc) return null;
  // Ensure itemDoc is a plain object if it's a Mongoose document
  const item = itemDoc.toObject ? itemDoc.toObject() : { ...itemDoc };

  let imagePath = null;
  if (item.images && item.images.length > 0) {
    const primaryImage =
      item.images.find((img) => img.isPrimary) || item.images[0];
    imagePath = primaryImage ? primaryImage.path : null;
  }

  // Calculate the effective stock based on manageStock (NEW LOGIC)
  const effectiveStock =
    item.manageStock === false ? Infinity : item.stock || 0;

  // Calculate discount percentage for badge text (Refined)
  let discountBadgeText = null;
  const calculatedPrice = parseFloat(item.price) || 0;
  // Use mrp if available and higher, otherwise use price as fallback for comparison
  const calculatedOriginalPrice = parseFloat(item.mrp) || calculatedPrice;

  // Only show discount badge if there's a meaningful price difference
  if (calculatedOriginalPrice > calculatedPrice) {
    if (item.discountType === "percentage") {
      if ((item.discountValue || 0) > 0) {
        // Ensure discount value is positive
        discountBadgeText = `-${Math.round(item.discountValue || 0)}%`;
      }
    } else if (item.discountType === "fixed") {
      if (calculatedOriginalPrice > 0) {
        // Avoid division by zero
        const percentOff =
          ((calculatedOriginalPrice - calculatedPrice) /
            calculatedOriginalPrice) *
          100;
        if (percentOff > 0) discountBadgeText = `-${Math.round(percentOff)}%`;
        // You could add a fallback here to show amount off if percent is small or 0 but price is different
      }
    }
  } else if (
    item.discountType === "percentage" &&
    (item.discountValue || 0) > 0
  ) {
    // Handle cases where price and mrp might be the same due to calculation, but % discount exists
    discountBadgeText = `-${Math.round(item.discountValue || 0)}%`;
  }

  return {
    _id: item._id,
    name: item.name,
    slug: item.slug,
    price: calculatedPrice, // Use calculated price from schema pre-save
    category: item.category, // This will be populated by Mongoose
    imagePath: imagePath, // Direct path to primary image
    originalPrice: calculatedOriginalPrice, // Use calculated original price
    discountType: item.discountType, // Include type/value for potential frontend use
    discountValue: item.discountValue,
    discountBadgeText: discountBadgeText, // Add prepared discount text
    shortDescription: item.shortDescription,
    // Pass the calculated effective stock value (MODIFIED FIELD)
    stock: effectiveStock,
    manageStock: item.manageStock, // Can keep this flag if frontend uses it
    status: item.status,
    // Include other fields used by list components (like ItemCardWithQuantity)
    unit: item.unit, // Assuming this is selected/available
    rating: item.rating, // Assuming this is selected/available
    // createdAt: item.createdAt, // Included in timestamps by default
  };
};

// Helper to prepare item data for public detail view (Keep as is, already calculates effective stock)
const preparePublicDetailItem = (itemDoc) => {
  if (!itemDoc) return null;
  const item = itemDoc.toObject ? itemDoc.toObject() : { ...itemDoc };

  let primaryImagePath = null; // For convenience on detail page
  if (item.images && item.images.length > 0) {
    const primaryImage =
      item.images.find((img) => img.isPrimary) || item.images[0];
    primaryImagePath = primaryImage ? primaryImage.path : null;
  }

  // The schema already calculates the price on save. Use the saved price.
  const calculatedPrice = parseFloat(item.price) || 0;
  // Use mrp if available and higher, otherwise use price as fallback for comparison
  const calculatedOriginalPrice = parseFloat(item.mrp) || calculatedPrice;

  return {
    _id: item._id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    shortDescription: item.shortDescription,
    price: calculatedPrice, // Use calculated price
    originalPrice: calculatedOriginalPrice, // Use calculated original
    discountType: item.discountType, // Send type/value for more detailed discount logic on detail page
    discountValue: item.discountValue,
    category: item.category, // Populated
    images: item.images, // Send all images for gallery on detail page
    primaryImagePath: primaryImagePath, // Main image for initial display
    // Calculate effective stock here too, matching the list view's logic
    stock: item.manageStock === false ? Infinity : item.stock || 0, // Keep this logic consistent
    manageStock: item.manageStock, // Keep the flag
    status: item.status,
    // Include other fields from Item.js schema as needed for the detail page
    weight: item.weight,
    dimensions: item.dimensions,
    brand: item.brand,
    sku: item.sku,
    unit: item.unit, // Assuming this is selected/available
    rating: item.rating, // Assuming this is selected/available
    // cgstRate: item.cgstRate, // If needed
    // sgstRate: item.sgstRate, // If needed
  };
};

// GET /api/items - Fetch all active items (public), allow filtering/pagination (EXISTING - MODIFIED SELECT)
export const getPublicItems = asyncHandler(async (req, res) => {
  const {
    category: categorySlug,
    search,
    sort,
    page = 1,
    limit = 48, // Increased default limit based on frontend usage
  } = req.query;
  console.log("[Ctrl Public Item] Fetching items with query:", req.query);

  const queryFilter = { status: "active" };

  if (categorySlug && categorySlug.toLowerCase() !== "all") {
    // Handle 'all' slug
    const category = await Category.findOne({
      slug: categorySlug.toLowerCase(),
    })
      .select("_id")
      .lean(); // Use .lean() for performance
    if (category) {
      queryFilter.category = category._id;
    } else {
      console.log(
        `[Ctrl Public Item] Category slug "${categorySlug}" not found.`
      );
      // If category not found and slug is not 'all', return empty results
      return res
        .status(200)
        .json({ success: true, items: [], page: 1, pages: 0, count: 0 });
    }
  }

  if (search) {
    // Use text index if search term exists
    queryFilter.$text = { $search: search };
  }

  let sortOptions = { createdAt: -1 }; // Default sort: newest first ('latest')
  // Map frontend filter keys like 'latest', 'popular' to backend sort logic
  if (sort === "price_asc") sortOptions = { price: 1 };
  else if (sort === "price_desc") sortOptions = { price: -1 };
  else if (sort === "name_asc") sortOptions = { name: 1 }; // Name: A to Z
  else if (sort === "name_desc") sortOptions = { name: -1 }; // Name: Z to A
  // 'latest' is already handled by default
  // Add more complex sorting for 'popular', 'recommend', 'trending' if implemented
  // e.g., else if (sort === 'popular') sortOptions = { viewCount: -1 }; (requires viewCount field in schema)

  const count = await Item.countDocuments(queryFilter);
  const pages = Math.ceil(count / limit);
  const skip = (page - 1) * limit;

  // Select fields needed for list items and preparation logic (MODIFIED SELECT)
  const itemsFromDB = await Item.find(queryFilter)
    .populate("category", "name slug")
    .select(
      "name slug price mrp discountType discountValue images category shortDescription createdAt status manageStock stock unit rating weight dimensions" // Added unit, rating, weight, dimensions as they are used in frontend card/detail
    )
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip)
    .lean(); // Use .lean() for performance as we are transforming data

  const items = itemsFromDB.map(preparePublicListItem);

  console.log(
    `[Ctrl Public Item] Found ${items.length} items (Page ${page}/${pages}, Total ${count}).`
  );
  res.status(200).json({
    success: true,
    items,
    page: parseInt(page),
    pages,
    count,
  });
});

// GET /api/items/:id - Fetch a single active item by ID (public) (EXISTING - MODIFIED SELECT)
export const getPublicItemById = asyncHandler(async (req, res) => {
  const { id } = req.params; // This 'id' must be the MongoDB _id
  console.log(`[Ctrl Public Item] Fetching item by ID: ${id}`);

  // Validate id format to avoid CastError on invalid input
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400); // Bad request
    throw new Error("Invalid item ID format.");
  }

  // For detail view, select more fields or don't select out much.
  // Include all potentially relevant fields for the detail page.
  const itemFromDB = await Item.findOne({ _id: id, status: "active" })
    .populate("category", "name slug")
    .select("-createdBy -updatedBy") // Exclude audit fields, select *other* fields implicitly
    .lean(); // Use .lean() for performance

  if (!itemFromDB) {
    res.status(404);
    throw new Error("Item not found or is inactive.");
  }

  const item = preparePublicDetailItem(itemFromDB); // Prepare for detailed view

  console.log(`[Ctrl Public Item] Found item: ${item.name}`);
  res.status(200).json({ success: true, item });
});

// <--- NEW CONTROLLER FUNCTION: getTopSellingItems --->
// GET /api/items/top-selling - Fetch items sorted by quantity sold
export const getTopSellingItems = asyncHandler(async (req, res) => {
  console.log("[Ctrl Public Item] Fetching top selling items");

  // Define how many top items to return
  const limit = parseInt(req.query.limit) || 10; // Allow limit override, default to 10

  // Aggregate orders to find top-selling items
  const topItems = await Order.aggregate([
    // Match completed orders that are not cancelled or failed
    {
      $match: {
        orderStatus: {
          $in: [
            "Delivered",
            "Picked Up",
            "Processing",
            "Shipped",
            "Out For Delivery",
          ],
        }, // Consider which statuses indicate a completed sale
      },
    },
    // Deconstruct the orderItems array
    { $unwind: "$orderItems" },
    // Group by the item ID and sum the quantities
    {
      $group: {
        _id: "$orderItems.item", // Group by the ObjectId of the Item
        totalQuantitySold: { $sum: "$orderItems.quantity" },
      },
    },
    // Sort by the total quantity sold in descending order
    { $sort: { totalQuantitySold: -1 } },
    // Limit to the top N items
    { $limit: limit },
    // Optional: Join with the Items collection to get item details
    {
      $lookup: {
        from: "items", // The collection name (usually lowercase plural of model name)
        localField: "_id",
        foreignField: "_id",
        as: "itemDetails",
      },
    },
    // Deconstruct the itemDetails array (result of lookup is an array)
    { $unwind: "$itemDetails" },
    // Optional: Match only active items after lookup
    {
      $match: {
        "itemDetails.status": "active",
      },
    },
    // Project the final output format to match frontend expectations (similar to preparePublicListItem)
    {
      $project: {
        _id: "$itemDetails._id",
        name: "$itemDetails.name",
        slug: "$itemDetails.slug",
        price: "$itemDetails.price", // Use the price field from the Item model
        mrp: "$itemDetails.mrp", // Include mrp for discount calculation
        discountType: "$itemDetails.discountType",
        discountValue: "$itemDetails.discountValue",
        images: "$itemDetails.images", // Include images to get primary path
        shortDescription: "$itemDetails.shortDescription",
        status: "$itemDetails.status",
        manageStock: "$itemDetails.manageStock",
        stock: "$itemDetails.stock",
        unit: "$itemDetails.unit",
        rating: "$itemDetails.rating",
        // totalQuantitySold: 1, // Optionally include sold count if frontend needs it
      },
    },
  ]);

  // Prepare items using the existing helper, which handles image paths and discounts
  const formattedTopItems = topItems.map(preparePublicListItem);

  console.log(
    `[Ctrl Public Item] Found ${formattedTopItems.length} top selling items.`
  );
  res.status(200).json(formattedTopItems); // Send the array directly
});
// <--- END NEW CONTROLLER FUNCTION --->
