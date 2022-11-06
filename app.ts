const { Server } = require("ws");
const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const axios = require("axios");
const client = axios.create({});
const sockserver = new Server({ port: 443 });
const fs = require("fs");

console.log("Server started");

sockserver.on("connection", async (ws) => {
  ws.on("close", () => console.log("Client has disconnected!"));

  // Prevent rate limiting if many people log on at the same time
  let rawdata = fs.readFileSync("last_price.json");
  let priceObj = JSON.parse(rawdata);
  await sendPrice(priceObj.last_price);
});

setInterval(async () => {
  await sendPrice(undefined);
}, 15000);

async function sendPrice(price) {
  if (sockserver.clients.size === 0) {
    return;
  }

  let currentPrice;
  if (price === undefined) {
    currentPrice = await getJunoPrice();

    // Save price to file
    let priceJSON = {
      last_price: currentPrice,
    };

    let data = JSON.stringify(priceJSON);
    fs.writeFileSync("last_price.json", data);
  } else {
    currentPrice = price;
  }

  sockserver.clients.forEach((client) => {
    const data = JSON.stringify({
      time: new Date().getTime(),
      price: currentPrice,
    });
    client.send(data);
  });
}

async function getJunoPrice() {
  try {
    // Try to get average to get price variation from incoming txs
    const [junoPriceOsmosis, junoPriceJunoSwap] = await Promise.all([
      getJunoPriceOsmosis(),
      getJunoPriceJunoSwap(),
    ]);

    return ((junoPriceJunoSwap + junoPriceOsmosis) / 2).toFixed(6);
  } catch (e) {
    const price = await getJunoPriceCoinGecko();
    return price;
  }
}

async function getJunoPriceCoinGecko() {
  const coinGeckoData = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=juno-network&vs_currencies=usd&precision=6"
  );

  return coinGeckoData.data["juno-network"]["usd"];
}

async function getJunoPriceOsmosis() {
  const junoOsmoData = await axios.get(
    "https://api-osmosis.imperator.co/pools/v2/497"
  );
  const junoOsmoPrice = Number(
    junoOsmoData.data[1].amount / junoOsmoData.data[0].amount
  );

  const osmoUsdcData = await axios.get(
    "https://api-osmosis.imperator.co/pools/v2/678"
  );
  const osmoUsdcPrice = Number(
    osmoUsdcData.data[1].amount / osmoUsdcData.data[0].amount
  );

  return junoOsmoPrice / osmoUsdcPrice;
}

async function getJunoPriceJunoSwap() {
  const rpcEndpoint = "https://rpc-juno.itastakers.com/";

  const client = await CosmWasmClient.connect(rpcEndpoint);

  const contractAddress =
    "juno1ctsmp54v79x7ea970zejlyws50cj9pkrmw49x46085fn80znjmpqz2n642";

  const info = await client.queryContractSmart(contractAddress, {
    info: {},
  });

  const currentContractPrice =
    Number(info.token2_reserve) / Number(info.token1_reserve);

  return currentContractPrice;
}
