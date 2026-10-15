import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().nonnegative().default(0),
);

export const footprintSchema = z.object({
  "monthly-electricity": optionalNumber,
  "monthly-gas": optionalNumber,
  "heating-source": z
    .enum(["Electric", "Natural Gas", "Propane", "Oil"])
    .default("Electric")
    .transform((val) => val.toLowerCase()),
  "renewable-energy": z
    .enum(["Yes", "No", "Some (solar or green plan)"])
    .default("No"),
  "annual-air-travel": optionalNumber,
  "weekly-miles-driven": optionalNumber,
  "vehicle-fuel-efficiency": optionalNumber,
  "primary-vehicle-fuel-type": z
    .enum(["Gasoline", "Diesel", "Hybrid", "Electric"])
    .default("Gasoline")
    .transform((val) => val.toLowerCase()),
  "monthly-public-transit-usage": optionalNumber,
  "diet-type": z
    .enum(["Meat eater", "Low meat", "Pescatarian", "Vegetarian", "Vegan"])
    .default("Meat eater")
    .transform((val) => val.toLowerCase()),
  "beef-frequency": z
    .enum(["Never", "Rarely", "Sometimes", "A few times a week", "Daily"])
    .default("Sometimes")
    .transform((val) => val.toLowerCase()),
  "food-waste-frequency": z
    .enum(["Never", "Rarely", "Sometimes", "Often", "Daily"])
    .default("Sometimes")
    .transform((val) => val.toLowerCase()),
  "household-recycling-habits": z
    .enum(["Never", "Some items", "Most items", "All items"])
    .default("Never")
    .transform((val) => val.toLowerCase()),
  "food-waste-habits": z
    .enum(["Never", "Rarely", "Sometimes", "Often", "Always"])
    .default("Never")
    .transform((val) => val.toLowerCase()),
  "household-size": z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().positive().default(1),
  ),
});
