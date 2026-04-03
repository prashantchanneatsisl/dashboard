import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";

const getVesselStatus = (vessel) => {
  const speed = vessel.speed || 0;
  const navStatus = vessel.navStatus || vessel.status;
  
  if (navStatus === 'war' || navStatus === 'restricted' || navStatus === 'moored') {
    return 'warning';
  }
  if (speed < 0.5 || speed === 0 || navStatus === 'anchored') {
    return 'anchored';
  }
  return 'moving';
};

export default function GridOverlay({ map, vessels }) {
  const gridLayerRef = useRef(null);
  const trackLayerRef = useRef(null);

  const vesselArray = useMemo(() => {
    return Array.isArray(vessels) ? vessels : [];
  }, [vessels]);

  const drawTracks = () => {
    if (!map) return;

    if (trackLayerRef.current) {
      map.removeLayer(trackLayerRef.current);
    }

    const trackLayer = L.layerGroup();
    trackLayerRef.current = trackLayer;

    vesselArray.forEach(v => {
      const vesselStatus = getVesselStatus(v);
      if (v.history && vesselStatus === 'moving') {
        const polyline = L.polyline(v.history, {
          color: "#2196F3",
          weight: 3,
          opacity: 1
        });
        trackLayer.addLayer(polyline);
      }
    });

    if (trackLayer.getLayers().length > 0) {
      trackLayer.addTo(map);
    }
  };

  const drawGrid = () => {
    if (!map) return;

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

  useEffect(() => {
    if (!map) return;

    drawTracks();
    drawGrid();

    const handleMoveEnd = () => {
      drawTracks();
      drawGrid();
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map, vessels]);

  return null;
}
