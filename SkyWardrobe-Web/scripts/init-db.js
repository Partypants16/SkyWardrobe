const { initDatabase, db } = require("../db");

console.log("Initializing SQLite wardrobe database...");

initDatabase()
  .then(() => {
    console.log("Wardrobe database initialized successfully (table: clothing_items created if not exists).");
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
        process.exit(1);
      } else {
        console.log("Database connection closed.");
        process.exit(0);
      }
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err.message);
    process.exit(1);
  });
