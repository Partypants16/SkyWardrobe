const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "wardrobe.db");
const db = new sqlite3.Database(dbPath);

const clothingItems = [
  // TOPS
  {
    name: "French Terry Sweatshirt",
    category: "top",
    min_temp: 10,
    max_temp: 20,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Long sleeve French terry sweatshirt in heather grey. Rib knit crewneck collar, cuffs, and hem. Relaxed fit."
  },
  {
    name: "Linen Button-Up Shirt",
    category: "top",
    min_temp: 20,
    max_temp: 35,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Long sleeve Italian linen shirt in off-white. Spread collar. Single-button barrel cuffs. Lightweight and highly breathable."
  },
  {
    name: "Rib Knit Turtleneck Sweater",
    category: "top",
    min_temp: -10,
    max_temp: 12,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Long sleeve rib knit wool-blend sweater in black. Rolled turtleneck collar. Tonal stitching. Designed for maximum heat retention."
  },
  {
    name: "Classic Cotton T-Shirt",
    category: "top",
    min_temp: 15,
    max_temp: 35,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Short sleeve organic cotton jersey t-shirt in white. Rib knit crewneck collar."
  },
  {
    name: "Heavyweight Loopback Hoodie",
    category: "top",
    min_temp: 5,
    max_temp: 16,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Long sleeve loopback cotton hoodie in navy. Drawstring at hood. Kangaroo pocket at waist. Rib knit cuffs and hem."
  },

  // BOTTOMS
  {
    name: "Slim-Fit Denim Jeans",
    category: "bottom",
    min_temp: 5,
    max_temp: 22,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Slim-fit stretch denim jeans in indigo. Mid-rise. Five-pocket styling. Zip-fly."
  },
  {
    name: "Linen-Blend Trousers",
    category: "bottom",
    min_temp: 18,
    max_temp: 35,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Relaxed-fit linen and cotton-blend trousers in beige. Mid-rise. Three-pocket styling. Partial elasticized waistband."
  },
  {
    name: "Loopback Sweatpants",
    category: "bottom",
    min_temp: -5,
    max_temp: 18,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Relaxed-fit loopback cotton sweatpants in black. Mid-rise. Two-pocket styling. Elasticized cuffs and waistband."
  },
  {
    name: "Chino Shorts",
    category: "bottom",
    min_temp: 22,
    max_temp: 38,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Mid-rise cotton twill shorts in tan. Four-pocket styling. Zip-fly. Perfect for hot, dry weather."
  },
  {
    name: "Fleece Lining Joggers",
    category: "bottom",
    min_temp: -10,
    max_temp: 10,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Heavyweight fleece joggers in heather grey. Drawstring at waistband. Elasticized cuffs. Insulated for freezing climates."
  },

  // OUTERWEAR
  {
    name: "Technical Gore-Tex Shell",
    category: "outerwear",
    min_temp: 5,
    max_temp: 22,
    rain_suitable: 1,
    rain_preferred: 1,
    wind_suitable: 1,
    wind_preferred: 1,
    humidity_suitable: 1,
    description: "Waterproof and windproof 3-layer Gore-Tex jacket in black. Fully taped internal seams. Drawstring at hood and hem. AquaGuard zip closure."
  },
  {
    name: "Down-Filled Puffer Jacket",
    category: "outerwear",
    min_temp: -15,
    max_temp: 8,
    rain_suitable: 0,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Quilted down-filled nylon satin jacket in navy. Stand collar. Two-way zip closure. Elasticized cuffs and hem. Avoid in heavy rain."
  },
  {
    name: "Gabardine Trench Coat",
    category: "outerwear",
    min_temp: 8,
    max_temp: 18,
    rain_suitable: 1,
    rain_preferred: 1,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Double-breasted cotton gabardine trench coat in beige. Spread collar with buttoned throat guard. Storm flaps at chest."
  },
  {
    name: "Classic Denim Jacket",
    category: "outerwear",
    min_temp: 14,
    max_temp: 22,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Spread collar denim jacket in faded blue. Button closure at front. Adjustable buttoned tabs at back hem."
  },
  {
    name: "Nylon Windbreaker Jacket",
    category: "outerwear",
    min_temp: 10,
    max_temp: 20,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 1,
    humidity_suitable: 1,
    description: "Lightweight nylon ripstop jacket in forest green. Elasticized hood and cuffs. Drawstring at hem. Packable."
  },

  // FOOTWEAR
  {
    name: "Classic Leather Sneakers",
    category: "footwear",
    min_temp: 10,
    max_temp: 35,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Low-top buffed leather sneakers in white. Round toe. Lace-up closure. Tonal treaded rubber sole."
  },
  {
    name: "Waterproof Hiking Boots",
    category: "footwear",
    min_temp: -5,
    max_temp: 15,
    rain_suitable: 1,
    rain_preferred: 1,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Waterproof oiled nubuck boots in brown. D-ring lace-up closure. Vibram rubber traction sole. Best for wet/snow conditions."
  },
  {
    name: "Suede Chelsea Boots",
    category: "footwear",
    min_temp: 5,
    max_temp: 20,
    rain_suitable: 0,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Suede Chelsea boots in tan. Round toe. Elasticized gusset at sides. Leather pull-loop at collar. Material is water sensitive."
  },
  {
    name: "Canvas Slip-On Sneakers",
    category: "footwear",
    min_temp: 16,
    max_temp: 35,
    rain_suitable: 0,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Low-top canvas slip-on sneakers in black. Round toe. Elasticized gussets at sides."
  },
  {
    name: "Leather Strap Sandals",
    category: "footwear",
    min_temp: 22,
    max_temp: 38,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Grainy calfskin sandals in black. Adjustable straps with buckle closure. Molded leather footbed."
  },

  // ACCESSORIES
  {
    name: "Acetate Sunglasses",
    category: "accessory",
    min_temp: 15,
    max_temp: 40,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Handcrafted tortoiseshell acetate sunglasses. Green lenses with 100% UV protection. Integrated nose pads."
  },
  {
    name: "Wool Knit Beanie",
    category: "accessory",
    min_temp: -15,
    max_temp: 10,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Rib knit virgin wool beanie in heather grey. Folded brim. Tonal logo patch."
  },
  {
    name: "Compact Folding Umbrella",
    category: "accessory",
    min_temp: -5,
    max_temp: 30,
    rain_suitable: 1,
    rain_preferred: 1,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Compact eight-rib folding umbrella in black. Matte black curved handle. Automatic open/close button."
  },
  {
    name: "Cotton Twill Baseball Cap",
    category: "accessory",
    min_temp: 12,
    max_temp: 35,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Six-panel cotton twill cap in beige. Curved brim. Adjustable strap with logo-engraved buckle."
  },
  {
    name: "Canvas Tote Bag",
    category: "accessory",
    min_temp: 0,
    max_temp: 40,
    rain_suitable: 1,
    rain_preferred: 0,
    wind_suitable: 1,
    wind_preferred: 0,
    humidity_suitable: 1,
    description: "Heavyweight cotton canvas tote bag in off-white. Twin carry handles. Logo printed in black at face."
  }
];

console.log(`Seeding database at ${dbPath} with ${clothingItems.length} FashionGen-styled items...`);

db.serialize(() => {
  // Clear existing items
  db.run("DELETE FROM clothing_items", (err) => {
    if (err) {
      console.error("Error clearing clothing_items:", err.message);
      process.exit(1);
    }
  });

  const stmt = db.prepare(`
    INSERT INTO clothing_items (
      name, category, min_temp, max_temp, 
      rain_suitable, rain_preferred, 
      wind_suitable, wind_preferred, 
      humidity_suitable, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of clothingItems) {
    stmt.run([
      item.name,
      item.category,
      item.min_temp,
      item.max_temp,
      item.rain_suitable,
      item.rain_preferred,
      item.wind_suitable,
      item.wind_preferred,
      item.humidity_suitable,
      item.description
    ], (err) => {
      if (err) {
        console.error(`Error inserting ${item.name}:`, err.message);
      }
    });
  }

  stmt.finalize((err) => {
    if (err) {
      console.error("Error finalizing statement:", err.message);
      process.exit(1);
    } else {
      console.log("Database seeded successfully!");
      db.close((closeErr) => {
        if (closeErr) {
          console.error("Error closing database:", closeErr.message);
          process.exit(1);
        } else {
          console.log("Database connection closed.");
          process.exit(0);
        }
      });
    }
  });
});
