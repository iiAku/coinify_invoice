const config = require("./config.json");
const crypto = require("crypto");
const microtime = require("microtime");
const p = require("phin");
const apiKey = config.apiKey;
const apiSecret = config.apiSecret;

const getSignature = (message, secret) =>
  crypto.createHmac("SHA256", secret).update(message).digest("hex");

const getAuthHeader = () => {
  const mtime = microtime.nowStruct();
  const nonce = mtime.join("");
  const message = `${nonce}${apiKey}`;
  const signature = getSignature(message, apiSecret);
  return {
    Authorization: `Coinify apikey=${apiKey}, nonce=${nonce}, signature=${signature}`,
  };
};

const createBuyOrder = (amount, description, custom) => {
  return {
    amount: amount,
    currency: config.currency,
    plugin_name: config.plugin_name,
    plugin_version: config.plugin_version,
    description: description,
    custom: custom,
    callback_url: config.callback_url,
    callback_email: config.callback_email,
    return_url: config.return_url,
    cancel_url: config.cancel_url,
    input_currency: config.input_currency,
  };
};

const getInvoice = async (amount, description, custom) => {
  const order = createBuyOrder(amount, description, custom);
  return await p({
    url: "https://api.coinify.com/v3/invoices",
    method: "POST",
    data: order,
    headers: getAuthHeader(),
    parse: "json",
  });
};

const send = (res, statusCode, data) => {
  res.type("application/json").code(statusCode);
  return data;
};

const log = (str) => console.log("[" + new Date().toISOString() + "] " + str);

module.exports = { log, send, getInvoice };
