import React from "react";

export default function VesselSidebar({ selectedVessel, onClose }) {
  if (!selectedVessel) {
    return (
      <div
        style={{
          width: "300px",
          background: "linear-gradient(180deg, #0a1628 0%, #132238 100%)",
          borderLeft: "2px solid #1e3a5f",
          padding: "20px",
          color: "#94a3b8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "20px",
            opacity: 0.3,
          }}
        >
          ⚓
        </div>
        <p style={{ textAlign: "center", fontSize: "14px" }}>
          Click on a vessel marker on the map to view details
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "300px",
        background: "linear-gradient(180deg, #0a1628 0%, #132238 100%)",
        borderLeft: "2px solid #1e3a5f",
        padding: "0",
        color: "#e2e8f0",
        overflow: "auto",
        maxHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)",
          padding: "20px",
          borderBottom: "1px solid #1e3a5f",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "rgba(255, 255, 255, 0.1)",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
        <div
          style={{
            fontSize: "32px",
            marginBottom: "10px",
          }}
        >
          🚢
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: "#f1f5f9",
          }}
        >
          {selectedVessel.vesselName || "Unknown Vessel"}
        </h2>
        <div
          style={{
            fontSize: "12px",
            color: "#64748b",
            marginTop: "5px",
          }}
        >
          IMO: {selectedVessel.imo || "N/A"}
        </div>
      </div>

      {/* Vessel Details */}
      <div style={{ padding: "20px" }}>
        {/* MMSI */}
        <div
          style={{
            marginBottom: "20px",
            background: "rgba(30, 58, 95, 0.3)",
            borderRadius: "8px",
            padding: "15px",
            border: "1px solid rgba(79, 195, 247, 0.2)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "5px",
            }}
          >
            MMSI
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#4fc3f7",
              fontFamily: "monospace",
            }}
          >
            {selectedVessel.mmsi || "N/A"}
          </div>
        </div>

        {/* Speed & Heading */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "rgba(30, 58, 95, 0.3)",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid rgba(79, 195, 247, 0.2)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              ⚓ Speed
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#f1f5f9",
              }}
            >
              {selectedVessel.speed || 0}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
              }}
            >
              knots
            </div>
          </div>
          <div
            style={{
              background: "rgba(30, 58, 95, 0.3)",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid rgba(79, 195, 247, 0.2)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              🧭 Heading
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#f1f5f9",
              }}
            >
              {selectedVessel.heading || 0}°
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
              }}
            >
              degrees
            </div>
          </div>
        </div>

        {/* Position */}
        <div
          style={{
            marginBottom: "20px",
            background: "rgba(30, 58, 95, 0.3)",
            borderRadius: "8px",
            padding: "15px",
            border: "1px solid rgba(79, 195, 247, 0.2)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "10px",
            }}
          >
            📍 Position
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Latitude</div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#e2e8f0",
                  fontFamily: "monospace",
                }}
              >
                {selectedVessel.lat?.toFixed(4) || "N/A"}°
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Longitude</div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#e2e8f0",
                  fontFamily: "monospace",
                }}
              >
                {selectedVessel.lon?.toFixed(4) || "N/A"}°
              </div>
            </div>
          </div>
        </div>

        {/* Destination */}
        <div
          style={{
            marginBottom: "20px",
            background: "rgba(30, 58, 95, 0.3)",
            borderRadius: "8px",
            padding: "15px",
            border: "1px solid rgba(79, 195, 247, 0.2)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "5px",
            }}
          >
            🗺️ Destination
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "500",
              color: "#f1f5f9",
            }}
          >
            {selectedVessel.destination || "Unknown"}
          </div>
        </div>

        {/* Timestamp */}
        <div
          style={{
            background: "rgba(30, 58, 95, 0.3)",
            borderRadius: "8px",
            padding: "15px",
            border: "1px solid rgba(79, 195, 247, 0.2)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "5px",
            }}
          >
            🕐 Last Updated
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#e2e8f0",
            }}
          >
            {selectedVessel.timestamp
              ? new Date(selectedVessel.timestamp).toLocaleString()
              : "N/A"}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "15px",
          borderTop: "1px solid #1e3a5f",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#475569",
          }}
        >
          AIS Data • Real-time Tracking
        </div>
      </div>
    </div>
  );
}
