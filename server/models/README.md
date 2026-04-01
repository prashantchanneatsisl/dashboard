# Vessel Source Models

This directory contains data models for the Maritime AIS Dashboard application.

## VesselSource Model

The `VesselSource` model represents timeline information for vessels from the Podium API.

### Data Structure

```javascript
{
  "tmlnInfoSet": [
    {
      "accountId": "62b78507-0452-469b-926b-2ca64b601dff",
      "entityId": "36870",
      "vesselName": "Lourdes",
      "vesselIMO": 9262819,
      "tmlnSeriesType": "ingested",
      "tmlnDatasource": "ais_spire",
      "tmlnStats": {
        "totalTimestamps": 43357,
        "minTimestamp": "2025-01-10T05:11:38.000+00:00",
        "maxTimestamp": "2026-04-01T06:28:38.000+00:00"
      }
    }
  ],
  "tmlnInfoGroups": []
}
```

### Properties

#### VesselSource

| Property | Type | Description |
|----------|------|-------------|
| `accountId` | string | Account identifier |
| `entityId` | string | Entity identifier |
| `vesselName` | string | Name of the vessel |
| `vesselIMO` | number | IMO number of the vessel |
| `tmlnSeriesType` | string | Type of timeline series (e.g., "ingested") |
| `tmlnDatasource` | string | Data source (e.g., "ais_spire", "otis") |
| `tmlnStats` | TmlnStats | Timeline statistics |

#### TmlnStats

| Property | Type | Description |
|----------|------|-------------|
| `totalTimestamps` | number | Total number of timestamps for this vessel |
| `minTimestamp` | string | Earliest timestamp (ISO 8601 format) |
| `maxTimestamp` | string | Latest timestamp (ISO 8601 format) |

### Usage

#### Basic Usage

```javascript
const { VesselSourceModel } = require('./models');

// Parse API response
const vesselSources = VesselSourceModel.parseResponse(apiResponse);

// Get unique vessels (deduplicated by IMO)
const uniqueVessels = VesselSourceModel.getUniqueVessels(vesselSources);

// Filter by data source
const aisVessels = VesselSourceModel.filterByDataSource(vesselSources, 'ais_spire');

// Filter vessels with recent data (within last 30 days)
const recentVessels = VesselSourceModel.filterRecent(vesselSources);
```

#### Instance Methods

```javascript
const vessel = new VesselSourceModel(data);

// Validate vessel data
vessel.isValid(); // Returns boolean

// Get vessel identifier
vessel.getId(); // Returns vesselIMO

// Get vessel name
vessel.getName(); // Returns vesselName

// Get data source
vessel.getDataSource(); // Returns tmlnDatasource

// Check if vessel has recent data
vessel.hasRecentData(); // Returns boolean

// Get timeline duration in days
vessel.getTimelineDurationDays(); // Returns number

// Convert to plain object
vessel.toJSON(); // Returns plain object
```

#### Static Methods

```javascript
// Create instance from raw data
const vessel = VesselSourceModel.fromData(data);

// Parse API response
const vessels = VesselSourceModel.parseResponse(response);

// Group vessels by IMO
const grouped = VesselSourceModel.groupByIMO(vessels);

// Get unique vessels
const unique = VesselSourceModel.getUniqueVessels(vessels);

// Filter by data source
const filtered = VesselSourceModel.filterByDataSource(vessels, 'ais_spire');

// Filter recent vessels
const recent = VesselSourceModel.filterRecent(vessels);
```

### Data Sources

The model supports the following data sources:

- `ais_spire` - AIS data from Spire
- `otis` - OTIS data

### Integration with Server

The `VesselSource` model is integrated into the server's `fetchAllVesselsFromPodium()` function to:

1. Parse the API response structure
2. Validate vessel data
3. Deduplicate vessels by IMO number
4. Convert to the format expected by the client

The model automatically handles:
- Data validation
- Deduplication (prefers AIS data over OTIS when available)
- Filtering capabilities
- Timeline statistics calculation

### Example Response

The model expects a response with the following structure:

```javascript
{
  "tmlnInfoSet": [
    {
      "accountId": "string",
      "entityId": "string",
      "vesselName": "string",
      "vesselIMO": number,
      "tmlnSeriesType": "string",
      "tmlnDatasource": "string",
      "tmlnStats": {
        "totalTimestamps": number,
        "minTimestamp": "ISO 8601 string",
        "maxTimestamp": "ISO 8601 string"
      }
    }
  ],
  "tmlnInfoGroups": []
}
```

### Notes

- The model uses IMO as the primary vessel identifier (instead of MMSI)
- Position data (lat, lon) is not available in the timeline info response
- The model automatically deduplicates vessels by IMO, preferring AIS data over OTIS
- All timestamps are in ISO 8601 format with timezone information
