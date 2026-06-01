import axios from "axios";

const npaasClient = axios.create({
  baseURL: process.env.NPAAS_URL,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.NPAAS_APP_TOKEN}`,
  },
  timeout: 8000,
});

export default npaasClient;
