const fs = require('fs');
const path = require('path');

// Define the path to the file
const filePath = path.join(__dirname, 'flag.txt');

// Read the file asynchronously
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }
  
  // Output the contents of the file to stdout
  console.log(data);
});