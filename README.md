# Carbon Footprint Calculator

This Node.js server calculates a rough annual carbon footprint for the
WordPress carbon calculator. It is intended as a learning project and gives
users an estimate, not a precise environmental measurement.

## Setup

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm run dev
```

The server runs on:

```text
http://localhost:8000
```

## WordPress connection

The WordPress plugin sends calculator form data to:

```text
POST /handle-calc
```

The WordPress `BASE_URL_SERVER` value should point to the Node server, for
example:

```php
define('BASE_URL_SERVER', 'http://localhost:8000');
```

The Node server validates the submitted fields with Zod and returns:

```json
{
  "footprint": 9536
}
```

The value is an estimated annual footprint in kilograms of CO2e per person.

## Main files

- `server.js` - Express server, endpoint, and calculation
- `validation-schema.js` - Zod validation for WordPress form data

The WordPress plugin and carbon theme are separate from this repository. The
plugin handles the WordPress form and sends the request to this server. The
theme displays the returned result in the chart.

## Notes

- Numeric fields are accepted from WordPress as strings and converted by Zod.
- Negative values are rejected.
- The calculator uses simple assumptions and publicly available emission
  factors.
- Keep the Node server running while testing the WordPress site locally.
