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
// Rough US consumption-based averages from UC Berkeley CoolClimate.
const NATIONAL_AVERAGE_PER_PERSON = 19000; // kg CO2e per person per year

app.post("/handle-calc", (req, res) => {
  try {
    const body = req.body;
    const parsed = footprintSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => {
        return { field: issue.path.join("."), message: issue.message };
      });

      return res.status(400).send(fields);
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

    /*
     'monthly-electricity' => 0,
        'monthly-gas' => 0,
        'heating-source' => '',
        'renewable-energy' => '',
        'weekly-miles-driven' => 0,
        'primary-vehicle-fuel-type' => '',
        'vehicle-fuel-efficiency' => 0,
        'monthly-public-transit-usage' => 0,
        'annual-air-travel' => 0,
        'diet-type' => '',
        'beef-frequency' => '',
        'food-waste-frequency' => '',
        'household-recycling-habits' => '',
        'food-waste-habits' => '',
        'household-size' => 0,

    */

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
    const milesPerGallon =
      data["vehicle-fuel-efficiency"] || FACTORS.defaultMpg;
    const fuelFactor =
      fuelType === "diesel"
        ? FACTORS.dieselPerGallon
        : FACTORS.gasolinePerGallon;
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
    const waste =
      (400 / householdSize) * recyclingAdjustment * compostAdjustment;

    const result = home + transport + food + waste;
    footprint = Math.round(result); // Store the last calculated footprint
    res.json({
      footprint,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
