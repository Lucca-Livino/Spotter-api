import axios from "axios";

// NPAAS_URL pode ser a URL base (ex: https://api.npaas.fslab.dev)
// ou a URL completa de envio. Extraímos apenas a origem para o cliente base.
const rawUrl = process.env.NPAAS_URL ?? "https://api.npaas.fslab.dev";
const baseURL = rawUrl.includes("/api/v1/notificacoes")
  ? rawUrl.split("/api/v1/notificacoes")[0]
  : rawUrl;

const npaasClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": `${process.env.NPAAS_APP_TOKEN}`,
  },
  timeout: 8000,
});

export default npaasClient;
