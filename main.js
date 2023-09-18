const ethers = require("ethers");
const dotenv = require("dotenv");
const InputDataDecoder = require("ethereum-input-data-decoder");
const decoder = new InputDataDecoder(`./abi.json`);
dotenv.config();

const wssUrl = "wss://goerli.infura.io/ws/v3/ce67e33fc360455f8de9ce36120d2a7f";

// Http Provider
const httpProviderUrl = process.env.PROVIDER_HTTP;

// WSS Provider
const wssProviderUrl = process.env.PROVIDER_WSS;
const providerWSS = new ethers.providers.WebSocketProvider(wssUrl);

// Uniswap V3 Swap Contract
const addressUniswapV3 = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
const token = "0xDF1742fE5b0bFc12331D8EAec6b478DfDbD31464";

// ERC20 ABI
const abiERC20 = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// MAIN Function
const main = async () => {
  // On Pending
  providerWSS.on("pending", async (txHash) => {
    // Get transaction
    try {
      const tx = await providerWSS.getTransaction(txHash);

      if (tx && tx.to === addressUniswapV3) {
        // Get data slice in Hex
        console.log("Uniswap tx", txHash);
        // const dataSlice = ethers.utils.hexDataSlice(tx.data, 4);
        const functionSelector = tx.data.substr(0, 10);
        const result = decoder.decodeData(tx.data);
        console.log(result);

        if (result.method === "execute") {
          const decoded = ethers.utils.defaultAbiCoder.decode(
            ["address", "uint256", "uint256", "bytes", "bool"],
            result.inputs[1][1]
          );
          console.log(decoded, "this is decoded");
          if (decoded[3] !== "0x000000" || "0x0000") {
            const address = extractPathFromV3(decoded[3], true);

            console.log("Path Addressessdf:",address);
            if (address.includes(token)) {
              console.log(token, "Token Trx Found:", txHash);

              // Interpret data - Contracts
              const contract0 = new ethers.Contract(
                address[0],
                abiERC20,
                providerWSS
              );
              const contract1 = new ethers.Contract(
                address[1],
                abiERC20,
                providerWSS
              );

              // Interpret data - Symbols
              const symbol0 = await contract0.symbol();
              const symbol1 = await contract1.symbol();

              // Interpret data - Decimals
              const decimals0 = await contract0.decimals();
              const decimals1 = await contract1.decimals();
              console.log("symbol0: ", symbol0, decimals0);
              console.log("symbol1: ", symbol1, decimals1);
            }
          }
        } else if (result.inputs && result.inputs.length >= 2) {
          const inputs = result.inputs[2];
          console.log(inputs, "inputs", functionSelector);
          if (inputs.includes(token) || inputs === token) {
            console.log(token, "Token Trx Found:", txHash);

            // Interpret data - Contracts
            const contract0 = new ethers.Contract(
              inputs[0],
              abiERC20,
              providerWSS
            );
            const contract1 = new ethers.Contract(
              inputs[1],
              abiERC20,
              providerWSS
            );

            // Interpret data - Symbols
            const symbol0 = await contract0.symbol();
            const symbol1 = await contract1.symbol();

            // Interpret data - Decimals
            const decimals0 = await contract0.decimals();
            const decimals1 = await contract1.decimals();
            console.log("symbol0: ", symbol0, decimals0);
            console.log("symbol1: ", symbol1, decimals1);
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
};
function extractPathFromV3(fullPath, reverse = false) {
  const fullPathWithoutHexSymbol = fullPath.substring(2);
  let path = [];
  let currentAddress = "";
  for (let i = 0; i < fullPathWithoutHexSymbol.length; i++) {
    currentAddress += fullPathWithoutHexSymbol[i];
    if (currentAddress.length === 40) {
      path.push("0x" + currentAddress);
      i = i + 6;
      currentAddress = "";
    }
  }
  if (reverse) {
    return path.reverse();
  }
  return path;
}
main();
