const { initDatabase, db } = require("../db");

console.log("Initializing SQLite wardrobe database...");

try {
  initDatabase();
  console.log("Wardrobe database initialized successfully (table: clothing_items created if not exists).");
  db.close();
  console.log("Database connection closed.");
  process.exit(0);
} catch (err) {
  console.error("Database initialization failed:", err.message);
  process.exit(1);
}
