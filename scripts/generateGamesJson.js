const fs = require('fs');
const path = require('path');

const packagesPath = path.join(__dirname, '../packages');
const sharedPath = path.join(__dirname, '../shared');
const outputPath = path.join(sharedPath, 'games.json');

// shared klasörü yoksa oluştur
if (!fs.existsSync(sharedPath)) {
  fs.mkdirSync(sharedPath, { recursive: true });
  console.log("📁 'shared/' klasörü oluşturuldu.");
}

const gameDirs = fs.readdirSync(packagesPath).filter(dir => dir !== 'core-server');

const games = gameDirs
  .map(dir => {
    const configPath = path.join(packagesPath, dir, 'game.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config;
    }
    return null;
  })
  .filter(Boolean);

fs.writeFileSync(outputPath, JSON.stringify(games, null, 2));
console.log("✅ games.json başarıyla oluşturuldu!");
