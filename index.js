const ethers = require("ethers");
const axios = require("axios");
const dotenv = require("dotenv");
const Web3 = require("web3");

const fs = require("fs");
dotenv.config();
// d56ee36b62fc46cbad3781027cb5cdcb
// // Otherwise use Alchemy, Infura, QuickNode etc
const wssUrl = "wss://mainnet.infura.io/ws/v3/d2ee43d9b13044b2b37a006cc01f0b9d";
const httpUrl =
  "https://mainnet.infura.io/ws/v3/d2ee43d9b13044b2b37a006cc01f0b9d";
let web3 = new Web3(httpUrl);
// Http Provider
const httpProviderUrl = process.env.PROVIDER_HTTP;
// const provider = new ethers.providers.JsonRpcProvider(httpUrl);

// WSS Provider
const wssProviderUrl = process.env.PROVIDER_WSS;
const providerWSS = new ethers.providers.WebSocketProvider(wssUrl);

// ERC20 ABI
const abiERC20 = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// Uniswap V3 Swap Contract
const routerAddresses = [
  // "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Testnet
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", //v2 router2
  "0xE592427A0AEce92De3Edee1F18E0157C05861564", // v3
  "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // universal
  "0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B", // old universal
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // v3 router2
  "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
];
const targetTopic0 = [
  "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
  "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
];
const tokenAddresses = [
  // "0x85c920a41dd7de0d5bc0f3d6c03241bac9aef0f1",
  "0x20A8BB8F14F14E4F5914C9ffE475C3180db1e089",
  "0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6",
  "0x514910771af9ca656af840dff83e8264ecf986ca",
  "0x94Be6962be41377d5BedA8dFe1b100F3BF0eaCf3",
  // "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
];

const processedTxHashes = new Set();
const processedTopic = new Set();
const processingTransactions = new Set();

// MAIN Function
const main = async () => {
  // On Pending
  providerWSS.on("pending", async (txHash) => {
    try {
      if (!processedTxHashes.has(txHash)) {
        // Check if the transaction has not been processed
        processedTxHashes.add(txHash); // Add the transaction to the set of processed transactions
        // If the array length exceeds the limit, remove the oldest hash
        if (processedTxHashes.size >= 50) {
          const oldestTxHash = processedTxHashes.values().next().value;
          processedTxHashes.delete(oldestTxHash);
        }

        await processTransaction(txHash);
      }
    } catch (err) {
      console.log(err);
    }
  });
};

// Function to process a single transaction
async function processTransaction(txHash) {
  try {
    const tx = await providerWSS.getTransaction(txHash);
    if (tx) {
      for (const address of routerAddresses) {
        if (tx.to === address) {
          console.log("Uniswap transaction found...", txHash);
          if (!processingTransactions.has(txHash)) {
            processingTransactions.add(txHash); // Mark transaction as processing
            await confirmEtherTransaction(txHash);
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
}

async function confirmEtherTransaction(txHash) {
  const confirmationInterval = 10 * 1000; // 30 seconds interval

  const confirmationChecker = setInterval(async () => {
    try {
      // Get the transaction receipt
      const receipt = await providerWSS.waitForTransaction(txHash);
      // console.log("Transaction Receipt:", receipt);
      if (receipt.status) {
        // To chcek address in every log
        for (const log of receipt.logs) {
          if(log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"){
          if (processedTopic.has(txHash)) {
            console.log("TERMINATED MAIN LOOP");
            break;
          }
          // to check token addres machting with log address
          for (const token of tokenAddresses) {
            if (log.address.toLowerCase() === token.toLowerCase()) {
              if (processedTopic.has(txHash)) {
                console.log("TERMINATED TOKEN LOOP");
                break;
              }
              // const contract = new ethers.Contract(
              //   token,
              //   abiERC20,
              //   providerWSS
              // );
              // const = await contract.);
              // checking topic of every log
              try {
                for (const topicLog of receipt.logs) {
                  if (targetTopic0.includes(topicLog.topics[0])) {
                    if (processedTopic.has(txHash)) {
                      console.log("TERMINATED TOKEN LOOP");
                      break;
                    }


                    const block = await providerWSS.getBlock(receipt.blockNumber);
                    const lg = decodeAddress(topicLog.topics);
                    const matches = lg.filter((address) =>
                      routerAddresses.includes(address)
                    );
                    if (matches.length === lg.length) {
                      let swapData = await tokenETHValueFromSwapLog(
                        topicLog,
                        "sell"
                      );
  
                      let price = await fetchPoolData(token, "eth")
                        .then((data) => {
                          if (data) {
                            return data.data[0].attributes.base_token_price_usd;
                          } else {
                            console.log("Failed to fetch pool data.");
                          }
                        })
                        .catch((error) => {
                          console.error("An error occurred:", error);
                        });
  
                      //Finalized Data
                      let data = {
                        price: price,
                        volume: swapData.tokenValue,
                        timestamp: block.timestamp, // Use block timestamp
                      };
                      console.log( "Token Sell Swap Found");
                      console.log(data);
                      saveDataToCSV(token, data);
                      if (processedTopic.size >= 30) {
                        const oldestTxHash = processedTopic.values().next().value;
                        processedTopic.delete(oldestTxHash);
                        console.log("CLEARED Tx HashS");
                      }
                      processedTopic.add(txHash);
                      return;
                    } else if (matches.length > 0) {
                      console.log( "Buy Swap Found");
  
                      let swapData = await tokenETHValueFromSwapLog(
                        topicLog,
                        "buy"
                      );
                      // Get Token Price
                      let price = await fetchPoolData(token, "eth")
                        .then((data) => {
                          if (data) {
                            return data.data[0].attributes.base_token_price_usd;
                          } else {
                            console.log("Failed to fetch pool data.");
                          }
                        })
                        .catch((error) => {
                          console.error("An error occurred:", error);
                        });
  
                      //Finalized Data
                      let data = {
                        price: price,
                        volume: swapData.tokenValue,
                        timestamp: block.timestamp, // Use block timestamp
                      };
                      console.log(data);
                      saveDataToCSV(token, data);
                      if (processedTopic.size >= 30) {
                        const oldestTxHash = processedTopic.values().next().value;
                        processedTopic.delete(oldestTxHash);
                        console.log("CLEARED Tx HashS");
                      }
                      processedTopic.add(txHash);
                      return;
                    }
                  }
                }
                clearInterval(confirmationChecker);
              } catch (error) {
                console.log("here", error);
              }
              
            }
            
         
          }}
        }


        // Stop the confirmation checker
        clearInterval(confirmationChecker);
        processingTransactions.delete(txHash); // Remove the transaction from processing
      } else {
        // Stop the confirmation checker
        clearInterval(confirmationChecker);
        processingTransactions.delete(txHash); // Remove the transaction from processing
      }
    } catch (error) {
      console.log("Error confirming transaction: ", error, txHash);
      clearInterval(confirmationChecker);
      processingTransactions.delete(txHash); // Remove the transaction from processing
    }
  }, confirmationInterval);
}

function decodeAddress(hexRepresentations) {
  try {
    const decodedAddresses = [];
    for (var i = 1; i < hexRepresentations.length; i++) {
      const decodedAddress = web3.eth.abi.decodeParameter(
        "address",
        hexRepresentations[i]
      );
      decodedAddresses.push(decodedAddress);
    }
    return decodedAddresses;
  } catch (error) {
    console.error("Error decoding address:", error);
  }
 
}


async function fetchPoolData(tokenAddress, network) {
  const apiUrl = `https://api.geckoterminal.com/api/v2/search/pools?query=${tokenAddress}&network=${network}`;

  try {
    const response = await axios.get(apiUrl);

    // Check if the request was successful
    if (response.status === 200) {
      return response.data;
    } else {
      console.error("Request failed with status:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

async function tokenETHValueFromSwapLog(log, tradeType) {
  try {
    if (
      log.topics[0] ===
      "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
    ) {
      const decodedVersion = web3.eth.abi.decodeParameters(
        [
          { type: "int256", name: "amount0" },
          { type: "int256", name: "amount1" },
          { type: "uint160", name: "sqrtPriceX96" },
          { type: "uint128", name: "liquidity" },
          { type: "int24", name: "tick" },
        ],
        log.data
      );
      if (decodedVersion.amount0 < 0) {
        decodedVersion.amount0 = decodedVersion.amount0 * -1;
        decodedVersion.amount1 = decodedVersion.amount1 / 10 ** 18;
      } else {
        decodedVersion.amount0 = decodedVersion.amount0;
        decodedVersion.amount1 = (decodedVersion.amount1 * -1) / 10 ** 18;
      }

      // console.log(decodedVersion);

      if (tradeType === "sell")
        return {
          ethValue: decodedVersion.amount0,
          tokenValue: decodedVersion.amount1,
        };
      else
        return {
          ethValue: decodedVersion.amount1,
          tokenValue: decodedVersion.amount0,
        };
    } else {
      const decodedVersion = web3.eth.abi.decodeParameters(
        [
          { type: "uint256", name: "amount0In" },
          { type: "uint256", name: "amount1In" },
          { type: "uint256", name: "amount0Out" },
          { type: "uint256", name: "amount1Out" },
        ],
        log.data
      );
      // console.log(decodedVersion);

      if (tradeType === "sell") {
        decodedVersion.amount1Out = decodedVersion.amount1Out / 1e18;
        decodedVersion.amount0In = decodedVersion.amount0In;
        return {
          ethValue: decodedVersion.amount1Out,
          tokenValue: decodedVersion.amount0In,
        };
      } else {
        decodedVersion.amount1In = decodedVersion.amount1In / 10 ** 18;
        decodedVersion.amount0Out = decodedVersion.amount0Out;
        return {
          ethValue: decodedVersion.amount1In,
          tokenValue: decodedVersion.amount0Out,
        };
      }
    }
  } catch (error) {
    console.error("Error decoding ABI data:", error);
    // Handle the error appropriately, e.g., return an error object or rethrow the error.
  }
}


function saveDataToCSV(pairAddress, data) {
  // Create or append to the CSV file
  const csvFilePath = `swap_data_${pairAddress}.csv`;

  // Convert timestamp to UTC format
  const timestampUTC = data.timestamp;
  // const timestampUTC = new Date(data.timestamp * 1000).toUTCString();

  // Prepare the CSV row
  const csvRow = `${timestampUTC},${data.price},${data.volume}\n`;

  // Write the data to the file (prepend to the top)
  fs.appendFile(csvFilePath, csvRow, (err) => {
    if (err) {
      console.error(`Error saving data to CSV for ${pairAddress}: ${err}`);
    } else {
      console.log(`Data saved to CSV for ${pairAddress}`);
    }
  });
}

main();
