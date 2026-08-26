const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "wardrobe.db");
const db = new sqlite3.Database(dbPath);

// Initialize DB schema
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS clothing_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'outerwear', 'footwear', 'accessory')),
          min_temp REAL,
          max_temp REAL,
          rain_suitable INTEGER DEFAULT 1 CHECK (rain_suitable IN (0, 1)),
          rain_preferred INTEGER DEFAULT 0 CHECK (rain_preferred IN (0, 1)),
          wind_suitable INTEGER DEFAULT 1 CHECK (wind_suitable IN (0, 1)),
          wind_preferred INTEGER DEFAULT 0 CHECK (wind_preferred IN (0, 1)),
          humidity_suitable INTEGER DEFAULT 1 CHECK (humidity_suitable IN (0, 1)),
          description TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

function getRecommendedItem(category, temp, raining, windy, humid) {
  const isRaining = raining ? 1 : 0;
  const isWindy = windy ? 1 : 0;
  const isHumid = humid ? 1 : 0;

  const query = `
    SELECT name, description 
    FROM clothing_items
    WHERE category = ?
      AND (min_temp IS NULL OR min_temp <= ?)
      AND (max_temp IS NULL OR max_temp >= ?)
      AND (? = 0 OR rain_suitable = 1)
      AND (? = 0 OR wind_suitable = 1)
      AND (? = 0 OR humidity_suitable = 1)
    ORDER BY 
      (? * rain_preferred) DESC,
      (? * wind_preferred) DESC,
      RANDOM()
    LIMIT 1
  `;

  return new Promise((resolve, reject) => {
    db.get(
      query,
      [category, temp, temp, isRaining, isWindy, isHumid, isRaining, isWindy],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

module.exports = {
  initDatabase,
  getRecommendedItem,
  db
};
