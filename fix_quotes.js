const fs = require('fs');
let c = fs.readFileSync('similation.js', 'utf8');
// Replace escaped quotes with regular quotes
c = c.replace(/\\"/g, '"');
// Remove any trailing text after the last }
const lastBrace = c.lastIndexOf('}');
if (lastBrace !== -1) {
    c = c.substring(0, lastBrace + 1);
}
fs.writeFileSync('similation.js', c);
console.log('Cleaned similation.js fully');
