// src/components/PlotPanel.jsx

import React from 'react';
import forestTreeIcon from "./assets/forest-tree-icon.svg";
import fruitTreeIcon from "./assets/fruit-tree-icon.svg";
import PaymentHandler from "./PaymentHandler";  // Add this import (adjust path if needed)

const PlotPanel = ({
  selectedPlotId,
  selectedPlotData,
  panelLoading,
  closePlotPanel,
  windowWidth
}) => {
  // Helper for status badge colors
  const getStatusStyle = (status) => {
    const lowerStatus = status?.toLowerCase() || "";
    if (lowerStatus === "available") {
      return { backgroundColor: "#e8f5e9", color: "#024837" };
    }
    if (lowerStatus === "sold") {
      return { backgroundColor: "#ffebee", color: "#c62828" };
    }
    return { backgroundColor: "#fff3e0", color: "#e65100" };
  };

  // Extract plot number for restriction logic (like in your ProjectDetails)
  const getPlotNumber = () => {
    if (!selectedPlotData?.plotName) return null;
    return parseInt(selectedPlotData.plotName.replace(/\D/g, ""), 10);
  };

  const plotNumber = getPlotNumber();
  const isRestricted = plotNumber >= 49 && plotNumber <= 71;

  return (
    <>
      {/* Dark Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1999,
          animation: "fadeIn 0.4s ease-out",
          pointerEvents: "auto",
        }}
        onClick={closePlotPanel}
      />

      {/* Sliding Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: windowWidth <= 768 ? "100%" : "420px",
          height: "100vh",
          backgroundColor: "#ffffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.3)",
          zIndex: 2000,
          overflowY: "auto",
          animation: "slideIn 0.5s ease-out",
          fontFamily: "'Montserrat', sans-serif",
          pointerEvents: "auto", // ← ADD THIS
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closePlotPanel}
          style={{
            position: "absolute",
            top: "20px",
            left: windowWidth <= 768 ? "20px" : "-50px",
            width: "40px",
            height: "40px",
            backgroundColor: "#024837",
            border: "none",
            borderRadius: "50%",
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
          }}
        >
          ×
        </button>

        {/* Panel Content */}
        <div style={{ padding: "40px 30px" }}>
          {panelLoading ? (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
              <div
                style={{
                  border: "5px solid #f3f3f3",
                  borderTop: "5px solid #024837",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 20px"
                }}
              />
              <p style={{ fontSize: "16px", color: "#333" }}>
                Loading plot details...
              </p>
            </div>
          ) : selectedPlotData ? (
            <>
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#024837", margin: "0 0 8px 0" }}>
                Vinyas
              </h1>
              <p style={{ fontSize: "14px", color: "#555555", margin: "0 0 30px 0" }}>
                A 10 acre managed Farmland
              </p>

              {/* Plot Header Card */}
              <div style={{ backgroundColor: "#024837", color: "#ffffff", borderRadius: "20px", padding: "20px", marginBottom: "30px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
                  <img
                    src="https://img.staticmb.com/mbcontent/images/crop/uploads/2023/1/square_Vastu_for_Plot_Selection_0_1200.jpg"
                    alt="Plot View"
                    style={{ width: "100px", height: "80px", borderRadius: "12px", objectFit: "cover" }}
                  />
                  <div>
                    <h2 style={{ fontSize: "28px", margin: "0", fontWeight: "700" }}>
                    {selectedPlotData.plotName}
                    </h2>
                    <p style={{ margin: "5px 0 0", fontSize: "14px" }}>
                      Phase - 1 • {selectedPlotData.facing} Facing
                    </p>
                  </div>
                </div>

                <span style={{
                  display: "inline-block",
                  ...getStatusStyle(selectedPlotData.status),
                  padding: "8px 20px",
                  borderRadius: "30px",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  {selectedPlotData.status}
                </span>
              </div>

              {/* Plot Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "14px", marginBottom: "30px" }}>
                <div><strong>Plot Number</strong><p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.plotName}</p></div>
                <div><strong>Survey Number</strong><p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.surveyNumber}</p></div>
                <div><strong>Area in Sqft</strong><p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.areaSqFt}</p></div>
                <div><strong>Width</strong><p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.widthFt} ft</p></div>
                <div><strong>Length</strong><p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.lengthFt} ft</p></div>
                <div><strong>Area in Sqmt</strong><p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.areaSqMt}</p></div>
              </div>

              {/* Trees Section */}
              {(selectedPlotData.numberOfForestTrees > 0 || selectedPlotData.numberOfFruitTrees > 0) && (
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>Trees Planted</h3>
                  <div style={{ display: "flex", justifyContent: "space-around" }}>
                    <div style={{ textAlign: "center" }}>
                      <img src={forestTreeIcon} alt="Forest Trees" style={{ width: "40px", marginBottom: "8px" }} />
                      <p style={{ margin: 0 }}><strong>{selectedPlotData.numberOfForestTrees}</strong> Forest</p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <img src={fruitTreeIcon} alt="Fruit Trees" style={{ width: "40px", marginBottom: "8px" }} />
                      <p style={{ margin: 0 }}><strong>{selectedPlotData.numberOfFruitTrees}</strong> Fruit</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYMENT HANDLER - Only show if not restricted */}
              {!isRestricted && selectedPlotData.status?.toLowerCase() === "available" && (
                <PaymentHandler
                  plotData={selectedPlotData}
                  plotStatus={selectedPlotData.status}
                  projectId={selectedPlotId}  // this is the Firestore doc ID
                  setPlotStatus={(newStatus) => {
                    // Optional: update local status if needed
                    // You could add a callback from Map.jsx if you want live update
                  }}
                  closeParentPopup={closePlotPanel}
                />
              )}

              {/* Fallback message if restricted or not available */}
              {isRestricted || selectedPlotData.status?.toLowerCase() !== "available" ? (
                <div style={{ textAlign: "center", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "12px", marginTop: "20px" }}>
                  <p style={{ color: "#666", fontSize: "14px" }}>
                    {isRestricted 
                      ? "This plot is part of a special allocation and not available for individual booking." 
                      : "This plot is currently not available for booking."
                    }
                  </p>
                </div>
              ) : null}

              <p style={{ textAlign: "center", fontSize: "12px", color: "#888888", marginTop: "30px" }}>
                Secure your farmland plot today
              </p>
            </>
          ) : (
            <p style={{ textAlign: "center", padding: "100px 0", color: "#666" }}>
              No data available for this plot.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default PlotPanel;