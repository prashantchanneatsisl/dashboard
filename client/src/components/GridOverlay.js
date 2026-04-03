import { useEffect, useRef } from "react";
import L from "leaflet";

export default function GridOverlay({ map }) {
  const gridLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const gridLayer = L.layerGroup();
    gridLayerRef.current = gridLayer;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    const latLines = [];
    const lonLines = [];

    const latStep = zoom < 3 ? 30 : zoom < 6 ? 15 : zoom < 10 ? 5 : 2;
    const lonStep = zoom < 3 ? 30 : zoom < 6 ? 15 : zoom < 10 ? 5 : 2;

    const minLat = Math.floor((bounds.getSouthWest().lat) / latStep) * latStep;
    const maxLat = Math.ceil((bounds.getNorthEast().lat) / latStep) * latStep;
    const minLon = Math.floor((bounds.getSouthWest().lng) / lonStep) * lonStep;
    const maxLon = Math.ceil((bounds.getNorthEast().lng) / lonStep) * lonStep;

    for (let lat = minLat; lat <= maxLat; lat += latStep) {
      latLines.push([
        [lat, minLon],
        [lat, maxLon],
      ]);
    }

    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      lonLines.push([
        [minLat, lon],
        [maxLat, lon],
      ]);
    }

    latLines.forEach((coords) => {
      const polyline = L.polyline(coords, {
        color: "rgba(0, 200, 255, 0.25)",
        weight: 1,
        dashArray: "5, 10",
        lineCap: "round",
      });
      gridLayer.addLayer(polyline);
    });

    lonLines.forEach((coords) => {
      const polyline = L.polyline(coords, {
        color: "rgba(0, 200, 255, 0.25)",
        weight: 1,
        dashArray: "5, 10",
        lineCap: "round",
      });
      gridLayer.addLayer(polyline);
    });

    for (let lat = minLat; lat <= maxLat; lat += latStep) {
      for (let lon = minLon; lon <= maxLon; lon += lonStep) {
        const label = L.divIcon({
          className: "grid-label",
          html: `<div style="
            background: rgba(0, 30, 60, 0.85);
            color: #4fc3f7;
            padding: 2px 6px;
            font-size: 10px;
            font-family: 'Courier New', monospace;
            border-radius: 3px;
            border: 1px solid rgba(0, 200, 255, 0.4);
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${lat}°${lat >= 0 ? "N" : "S"}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        });
        L.marker([lat, lon], { icon: label }).addTo(gridLayer);
      }
    }

    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      if (lon !== minLon) {
        const label = L.divIcon({
          className: "grid-label",
          html: `<div style="
            background: rgba(0, 30, 60, 0.85);
            color: #4fc3f7;
            padding: 2px 6px;
            font-size: 10px;
            font-family: 'Courier New', monospace;
            border-radius: 3px;
            border: 1px solid rgba(0, 200, 255, 0.4);
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${Math.abs(lon)}°${lon >= 0 ? "E" : "W"}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        });
        L.marker([minLat, lon], { icon: label }).addTo(gridLayer);
      }
    }

    gridLayer.addTo(map);

    return () => {
      if (gridLayerRef.current) {
        map.removeLayer(gridLayerRef.current);
        gridLayerRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      if (gridLayerRef.current) {
        map.removeLayer(gridLayerRef.current);
      }

      const gridLayer = L.layerGroup();
      gridLayerRef.current = gridLayer;

      const bounds = map.getBounds();
      const zoom = map.getZoom();

      const latStep = zoom < 3 ? 30 : zoom < 6 ? 15 : zoom < 10 ? 5 : 2;
      const lonStep = zoom < 3 ? 30 : zoom < 6 ? 15 : zoom < 10 ? 5 : 2;

      const minLat = Math.floor(bounds.getSouthWest().lat / latStep) * latStep;
      const maxLat = Math.ceil(bounds.getNorthEast().lat / latStep) * latStep;
      const minLon = Math.floor(bounds.getSouthWest().lng / lonStep) * lonStep;
      const maxLon = Math.ceil(bounds.getNorthEast().lng / lonStep) * lonStep;

      const latLines = [];
      const lonLines = [];

      for (let lat = minLat; lat <= maxLat; lat += latStep) {
        latLines.push([
          [lat, minLon],
          [lat, maxLon],
        ]);
      }

      for (let lon = minLon; lon <= maxLon; lon += lonStep) {
        lonLines.push([
          [minLat, lon],
          [maxLat, lon],
        ]);
      }

      latLines.forEach((coords) => {
        const polyline = L.polyline(coords, {
          color: "rgba(0, 200, 255, 0.25)",
          weight: 1,
          dashArray: "5, 10",
          lineCap: "round",
        });
        gridLayer.addLayer(polyline);
      });

      lonLines.forEach((coords) => {
        const polyline = L.polyline(coords, {
          color: "rgba(0, 200, 255, 0.25)",
          weight: 1,
          dashArray: "5, 10",
          lineCap: "round",
        });
        gridLayer.addLayer(polyline);
      });

      for (let lat = minLat; lat <= maxLat; lat += latStep) {
        for (let lon = minLon; lon <= maxLon; lon += lonStep) {
          const label = L.divIcon({
            className: "grid-label",
            html: `<div style="
              background: rgba(0, 30, 60, 0.85);
              color: #4fc3f7;
              padding: 2px 6px;
              font-size: 10px;
              font-family: 'Courier New', monospace;
              border-radius: 3px;
              border: 1px solid rgba(0, 200, 255, 0.4);
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${lat}°${lat >= 0 ? "N" : "S"}</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          });
          L.marker([lat, lon], { icon: label }).addTo(gridLayer);
        }
      }

      for (let lon = minLon; lon <= maxLon; lon += lonStep) {
        if (lon !== minLon) {
          const label = L.divIcon({
            className: "grid-label",
            html: `<div style="
              background: rgba(0, 30, 60, 0.85);
              color: #4fc3f7;
              padding: 2px 6px;
              font-size: 10px;
              font-family: 'Courier New', monospace;
              border-radius: 3px;
              border: 1px solid rgba(0, 200, 255, 0.4);
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${Math.abs(lon)}°${lon >= 0 ? "E" : "W"}</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          });
          L.marker([minLat, lon], { icon: label }).addTo(gridLayer);
        }
      }

      gridLayer.addTo(map);
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map]);

  return null;
}
