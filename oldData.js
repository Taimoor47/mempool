const ethers = require("ethers");
const axios = require("axios");
const dotenv = require("dotenv");
const Web3 = require("web3");

const fs = require("fs");
dotenv.config();

const wssUrl = "wss://mainnet.infura.io/ws/v3/d108cbf7c0324759b58462e343d6cbe3";
const httpUrl =
  "https://mainnet.infura.io/ws/v3/d108cbf7c0324759b58462e343d6cbe3";

// Etherscan API URL and API key
const etherscanApiUrl = "https://api.etherscan.io/api";
const etherscanApiKey = "DM6N3WGRXH1TX2GG4NDK7Y6XZDCZN1X6EA";

let web3 = new Web3(httpUrl);

const providerWSS = new ethers.providers.WebSocketProvider(wssUrl);

// ERC20 ABI
const abiERC20 = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// Uniswap V3 Swap Contract
const routerAddresses = [
  "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Testnet
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
  "0xd5a7fc729ffbb0b2d06d7574f0bf532f97e1b5a6",
  // "0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6",
  // "0x514910771af9ca656af840dff83e8264ecf986ca",
  // "0x94Be6962be41377d5BedA8dFe1b100F3BF0eaCf3",
  // "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
];

const processedTxHashes = new Set();
const processedTopic = new Set();
const processingTransactions = new Set();
// Fetch transactions from Etherscan API
async function fetchTransactionsFromEtherscan(address) {
  try {
    const response = await axios.get(etherscanApiUrl, {
      params: {
        module: "account",
        action: "txlistinternal",
        address: address,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "10",
        sort: "asc",
        apikey: etherscanApiKey,
      },
    });

    if (response.data && response.data.status === "1") {
      return response.data.result;
    } else {
      console.error("Failed to fetch transactions from Etherscan API.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching transactions from Etherscan API:", error);
    return [];
  }
}

// MAIN Function
const main = async () => {
  // Add the Ethereum address you want to monitor
  const ethereumAddress = "0x5186003712238269b4aa0bd94e8484746556c763";

  // Fetch transactions from Etherscan API
  const transactions = await fetchTransactionsFromEtherscan(ethereumAddress);
    console.log(transactions)
  // Process each transaction
  for (const tx of transactions) {
    const txHash = tx.hash;
    console.log("Processing transaction", txHash);
    await processTransaction(tx);
  }

  // Set up the pending transaction listener
//   providerWSS.on("pending", async (txHash) => {
//     try {
//       if (!processedTxHashes.has(txHash)) {
//         processedTxHashes.add(txHash);
//         if (processedTxHashes.size >= 50) {
//           const oldestTxHash = processedTxHashes.values().next().value;
//           processedTxHashes.delete(oldestTxHash);
//         }
//         await processTransaction(txHash);
//       }
//     } catch (err) {
//       console.log(err);
//     }
//   });
};

// Function to process a single transaction
async function processTransaction(tx) {
    try {
        const txHash = tx.hash;
    //   const tx = await providerWSS.getTransaction(txHash);
    //   console.log(tx)
      if (tx) {
        for (const address of routerAddresses) {
            // console.log(tx.to.toLowerCase(),address.toLowerCase())
          if (tx.to.toLowerCase() === address.toLowerCase()) {
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
        const receipt = await providerWSS.getTransactionReceipt(txHash);
        // console.log("Transaction Receipt:", receipt);
        if (receipt.status) {
          // To chcek address in every log
          for (const log of receipt.logs) {
            if (
              log.topics[0] ===
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            ) {
              if (processedTopic.has(txHash)) {
                console.log("TERMINATED MAIN LOOP");
                break;
              }
              // to check token addres machting with log address
            //   for (const token of tokenAddresses) {
                // if (log.address.toLowerCase() === token.toLowerCase()) {
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
  
                        const block = await providerWSS.getBlock(
                          receipt.blockNumber
                        );
                        const lg = decodeAddress(topicLog.topics);
                        const matches = lg.filter((address) =>
                          routerAddresses.includes(address)
                        );
                        if (matches.length === lg.length) {
                          let swapData =
                            topicLog.topics[0] ===
                            "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
                              ? await decodeV3SwapDataHex(topicLog.data)
                              : await decodeV2SwapDataHex(topicLog.data);
  
                          let price = await fetchPoolData(token, "eth")
                            .then((data) => {
                              if (data) {
                                return data.data[0].attributes
                                  .base_token_price_usd;
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
                          console.log("Token Sell Swap Found");
                          console.log(data);
                          saveDataToCSV(token, data);
                          if (processedTopic.size >= 30) {
                            const oldestTxHash = processedTopic
                              .values()
                              .next().value;
                            processedTopic.delete(oldestTxHash);
                            console.log("CLEARED Tx HashS");
                          }
                          processedTopic.add(txHash);
                          break;
                        } else if (matches.length > 0) {
                          console.log("Buy Swap Found");
  
                          let swapData =
                            topicLog.topics[0] ===
                            "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
                              ? await decodeV3SwapDataHex(topicLog.data)
                              : await decodeV2SwapDataHex(topicLog.data);
                          // Get Token Price
                          let price = await fetchPoolData(token, "eth")
                            .then((data) => {
                              if (data) {
                                return data.data[0].attributes
                                  .base_token_price_usd;
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
                            const oldestTxHash = processedTopic
                              .values()
                              .next().value;
                            processedTopic.delete(oldestTxHash);
                            console.log("CLEARED Tx HashS");
                          }
                          processedTopic.add(txHash);
                          break;
                        }
                      }
                    }
                    clearInterval(confirmationChecker);
                  } catch (error) {
                    console.log("here", error);
                  }
                // }
            //   }
            }
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
  
  async function decodeV3SwapDataHex(hex) {
    const decodedVersion = web3.eth.abi.decodeParameters(
      [
        { type: "int256", name: "amount0" },
        { type: "int256", name: "amount1" },
        { type: "uint160", name: "sqrtPriceX96" },
        { type: "uint128", name: "liquidity" },
        { type: "int24", name: "tick" },
      ],
      hex
    );
  
    // console.log("Checker V3 swap hex: ", decodedVersion);
  
    // return decodedVersion;
  
    if (decodedVersion.amount0 > 0) {
      return {
        amount0: decodedVersion.amount0,
        amount1: decodedVersion.amount1.replace("-", ""),
        negativeValue: decodedVersion.amount1.replace("-", ""),
      };
    } else {
      return {
        amount0: decodedVersion.amount0.replace("-", ""),
        amount1: decodedVersion.amount1,
        negativeValue: decodedVersion.amount0.replace("-", ""),
      };
    }
  }
  
  async function decodeV2SwapDataHex(log) {
    const decodedVersion = web3.eth.abi.decodeParameters(
      [
        { type: "uint256", name: "amount0In" },
        { type: "uint256", name: "amount1In" },
        { type: "uint256", name: "amount0Out" },
        { type: "uint256", name: "amount1Out" },
      ],
      log.data
    );
    // console.log(decodedVersion, decimals);
  
    // return decodedVersion;
  
    if (decodedVersion.amount0Out > 0) {
      return {
        amount0: decodedVersion.amount1In,
        amount1: decodedVersion.amount0Out,
        swapLog: log,
      };
    } else {
      return {
        amount0: decodedVersion.amount0In,
        amount1: decodedVersion.amount1Out,
        swapLog: log,
      };
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
