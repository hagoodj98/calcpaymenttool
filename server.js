import express from "express";
import cors from "cors";
const app = express();
const port = 8000;
app.use(express.json());
// CORS configuration
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};
// Apply CORS middleware with the specified options
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/handle-calc", (req, res) => {
  const data = req.body;
  res.send(`Received data`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
