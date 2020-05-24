const Keyv = require("keyv");
const fastify = require("fastify")({ logger: true });
const config = require("./config.json");
const { log, send, getInvoice } = require("./helpers");

const ONE_SEC = 1000;
const keyv = new Keyv({ serialize: JSON.stringify, deserialize: JSON.parse });

fastify.post("/", async (req, res) => {
  const body = req.body;
  const { amount, description, custom } = body;
  if (!amount || !description || !custom) {
    return send(res, 400, { error: "BAD_REQUEST" });
  }
  try {
    const key = amount + description + Object.values(custom).join("");
    let invoice = await keyv.get(key);
    if (!invoice) {
      for (let i = 0; i < 3; i++) {
        invoice = (await getInvoice(amount, description, custom)).body;
        if (!invoice.success) {
          setTimeout(() => {
            log("Wait 3s and retry...");
          }, 3000);
        } else {
          break;
        }
      }
      if (invoice.success) {
        await keyv.set(key, invoice, config.TTL * ONE_SEC);
      } else {
        log(
          `[fail-to-serve] invoice for ${amount} - ${description} - ${Object.values(
            custom
          ).join("|")}`
        );
        throw new Error("Failed to generate properly");
      }
    }
    log(
      `[served] invoice for ${amount} - ${description} - ${Object.values(
        custom
      ).join("|")}`
    );
    return send(res, 200, invoice);
  } catch (error) {
    console.log(error);
    return send(res, 500, { error: "SOMETHING_WENT_WRONG" });
  }
});

const start = async () => {
  try {
    await fastify.listen(config.port);
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
