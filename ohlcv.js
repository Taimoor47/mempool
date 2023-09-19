const fs = require("fs");
const readline = require("readline");

// Input CSV file path
const inputFile = "./swap_data_0x94Be6962be41377d5BedA8dFe1b100F3BF0eaCf3.csv";

// Output JSON file path
const outputFile = "output.json";

// Aggregation interval (minute, hour, or day)
const aggregationInterval = "minute"; // Change this to 'hour' or 'day' as needed

// Initialize OHLCV data
const ohlcvData = [];

// Create a readable stream to read the CSV file
const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  output: process.stdout,
  terminal: false,
});

// Custom date parsing function (assuming timestamp is in seconds)
function parseCustomDate(timestampStr) {
  return parseInt(timestampStr) * 1000; // Convert seconds to milliseconds
}

// Initialize the first interval
let currentIntervalStart = null;
let currentOpenPrice = null;
let currentHighPrice = null;
let currentLowPrice = null;
let currentVolume = 0;

// Process each line of the CSV file
rl.on("line", (line) => {
  const [timestampStr, priceStr, volumeStr] = line.split(",");

  // Parse the timestamp string using the custom date parsing function
  const timestamp = parseCustomDate(timestampStr);

  // Convert price and volume to numbers
  const price = parseFloat(priceStr);
  const volume = parseFloat(volumeStr);

  // Check if the line is valid
  if (!isNaN(timestamp) && !isNaN(price) && !isNaN(volume)) {
    // Determine the interval start time based on aggregationInterval
    let intervalStart;

    if (aggregationInterval === "hour") {
      intervalStart = timestamp - (timestamp % 3600000); // Round down to the nearest hour (1 hour = 3600000 milliseconds)
      console.log(timestamp % 3600000, "hour");
    } else if (aggregationInterval === "day") {
      intervalStart = timestamp - (timestamp % 86400000); // Round down to the nearest day (1 day = 86400000 milliseconds)
      console.log(intervalStart, "day");
    } else if (aggregationInterval === "minute") {
      intervalStart = timestamp - (timestamp % 60000); // Round down to the nearest minute (1 minute = 60000 milliseconds)
      console.log(intervalStart, "minute");
    } else if (aggregationInterval === "5-minute") {
      intervalStart = timestamp - (timestamp % 300000); // Round down to the nearest 5 minutes (5 minutes = 300000 milliseconds)
      console.log(intervalStart, "5-minute");
    } else if (aggregationInterval === "15-minute") {
      intervalStart = timestamp - (timestamp % 900000); // Round down to the nearest 15 minutes (15 minutes = 900000 milliseconds)
      console.log(intervalStart, "15-minute");
    } else {
      // Handle other aggregation intervals or use the provided timestamp if none is specified
      intervalStart = timestamp;
    }

    // Check if a new interval has started
    if (currentIntervalStart === null) {
      currentIntervalStart = intervalStart;
      currentOpenPrice = price;
      currentHighPrice = price;
      currentLowPrice = price;
    }

    // Update OHLCV data within the same interval
    if (intervalStart === currentIntervalStart) {
      currentHighPrice = Math.max(currentHighPrice, price);
      currentLowPrice = Math.min(currentLowPrice, price);
      currentVolume += volume;
    } else {
      // Close the previous interval and start a new one
      ohlcvData.push({
        timestamp: currentIntervalStart,
        open: currentOpenPrice,
        high: currentHighPrice,
        low: currentLowPrice,
        close: currentOpenPrice, // Close price for the last interval
        volume: currentVolume,
      });
      // Initialize values for the new interval
      currentIntervalStart = intervalStart;
      currentOpenPrice = price;
      currentHighPrice = price;
      currentLowPrice = price;
      currentVolume = volume;
    }
  }
});

// When reading is complete, write the OHLCV data to the output JSON file
rl.on("close", () => {
  // Push the last interval to the OHLCV data
  if (currentIntervalStart !== null) {
    ohlcvData.push({
      timestamp: currentIntervalStart,
      open: currentOpenPrice,
      high: currentHighPrice,
      low: currentLowPrice,
      close: currentOpenPrice, // Close price for the last interval
      volume: currentVolume,
    });
  }

  const sortedData = ohlcvData.sort((a, b) => a.timestamp - b.timestamp);
  fs.writeFileSync(outputFile, JSON.stringify(sortedData, null, 2));
  console.log(
    `OHLCV data (${aggregationInterval} intervals) has been generated and saved to ${outputFile}`
  );
});
