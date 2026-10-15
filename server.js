import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { footprintSchema } from "./validation-schema.js";
const app = express();
const port = 8000;
app.use(express.json());
// CORS configuration
const corsOptions = {
  origin: ["http://localhost:3000", "http://carbon-footprint.local"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};
// Apply CORS middleware with the specified options
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.send("Hello World!");
});
// Global footprint variable to store the last calculated footprint
let footprint;
// US emission factors (kg CO2 unless noted)
const FACTORS = {
  electricityPerKwh: 0.373, // EPA eGRID2022 US average, 823.1 lb/MWh
  gasPerTherm: 5.31, // EPA GHG Equivalencies Calculator
  gasolinePerGallon: 8.887, // EPA GHG Equivalencies Calculator
  dieselPerGallon: 10.18, // EPA GHG Equivalencies Calculator
  defaultMpg: 22.8, // FHWA 2022 average fuel economy of cars and light trucks
  airPerMile: 0.129, // EPA Emission Factors Hub 2025, medium-haul flight
  transitPerMile: 0.066, // EPA Emission Factors Hub 2025, bus
};

app.post("/handle-calc", (req, res) => {
  const parsed = footprintSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    return res.status(400).send(message);
  }

  const data = parsed.data;
  const householdSize = data["household-size"];
  const heatingSource = data["heating-source"];
  const fuelType = data["primary-vehicle-fuel-type"];
  const renewableEnergy = data["renewable-energy"];
  const dietType = data["diet-type"];
  const beefFrequency = data["beef-frequency"];
  const foodWasteFrequency = data["food-waste-frequency"];
  const recyclingHabits = data["household-recycling-habits"];
  const foodWasteHabits = data["food-waste-habits"];

  // Assumptions: electricity is kWh/month, gas is therms/month.
  const renewableFactor =
    renewableEnergy === "Yes"
      ? 0.5
      : renewableEnergy === "Some (solar or green plan)"
        ? 0.75
        : 1;
  const electricity =
    data["monthly-electricity"] *
    12 *
    FACTORS.electricityPerKwh *
    renewableFactor;
  const gas =
    heatingSource === "electric"
      ? 0
      : data["monthly-gas"] * 12 * FACTORS.gasPerTherm;
  const home = (electricity + gas) / householdSize;

  // Assumptions: air travel is miles/year; transit is miles/month.
  const milesDriven = data["weekly-miles-driven"] * 52;
  const milesPerGallon = data["vehicle-fuel-efficiency"] || FACTORS.defaultMpg;
  const fuelFactor =
    fuelType === "diesel" ? FACTORS.dieselPerGallon : FACTORS.gasolinePerGallon;
  const car = (milesDriven / milesPerGallon) * fuelFactor;
  const flights = data["annual-air-travel"] * FACTORS.airPerMile;
  const transit =
    data["monthly-public-transit-usage"] * 12 * FACTORS.transitPerMile;
  const transport = car + flights + transit;

  const foodByDiet = {
    "meat eater": 3000,
    "low meat": 2400,
    pescatarian: 2000,
    vegetarian: 1700,
    vegan: 1500,
  };
  const beefAdjustment = {
    never: 0.85,
    rarely: 0.95,
    sometimes: 1.05,
    "a few times a week": 1.1,
    daily: 1.2,
  }[beefFrequency];
  const foodWasteAdjustment = {
    never: 1,
    rarely: 1.02,
    sometimes: 1.05,
    often: 1.1,
    daily: 1.15,
  }[foodWasteFrequency];
  const food = foodByDiet[dietType] * beefAdjustment * foodWasteAdjustment;

  const recyclingAdjustment = {
    never: 1,
    "some items": 0.95,
    "most items": 0.8,
    "all items": 0.7,
  }[recyclingHabits];
  const compostAdjustment = ["often", "always"].includes(foodWasteHabits)
    ? 0.85
    : 1;
  const waste = (400 / householdSize) * recyclingAdjustment * compostAdjustment;

  const result = home + transport + food + waste;
  footprint = Math.round(result); // Store the last calculated footprint
  res.json({ footprint: footprint });
});

app.get("/load-footprint", (req, res) => {
  // Set headers for SSE (Server-Sent Events)
  res.setHeader("Content-Type", "text/event-stream"); // Set headers for SSE (Server-Sent Events)
  res.setHeader("Cache-Control", "no-cache"); // Disable caching
  res.setHeader("Connection", "keep-alive"); // Keep the connection open
  // 1. Prevent the server from timing out the socket prematurely

  console.log("Client connected for SSE");
  const intervalId = setInterval(() => {
    res.write(`data: ${JSON.stringify({ footprint: footprint || 0 })}\n\n`);
  }, 3000);
  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
