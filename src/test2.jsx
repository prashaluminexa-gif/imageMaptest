// src/components/PlotPanel.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRulerCombined,
  faArrowsAltH,
  faArrowsAltV,
  faCompass,
  faHashtag,
  faFileAlt,
} from '@fortawesome/free-solid-svg-icons';

import forestTreeIcon from "./assets/forest-tree-icon.svg";
import fruitTreeIcon from "./assets/fruit-tree-icon.svg";
import PaymentHandler from "./PaymentHandler";

const PlotPanel = ({
  selectedPlotId,
  selectedPlotData,
  panelLoading,
  closePlotPanel,
  windowWidth
}) => {
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

  const getPlotNumber = () => {
    if (!selectedPlotData?.plotName) return null;
    return parseInt(selectedPlotData.plotName.replace(/\D/g, ""), 10);
  };

  const plotNumber = getPlotNumber();
  const isRestricted = plotNumber >= 49 && plotNumber <= 71;

  // Array of beautiful farmland images (replace with selectedPlotData.images if available later)
  const plotImages = [
    "https://www.shutterstock.com/image-photo/aerial-view-beautiful-tea-crop-600nw-2663300917.jpg",
    "https://www.shutterstock.com/image-photo/aerial-view-vibrant-agricultural-fields-600nw-2694386157.jpg",
    "https://www.shutterstock.com/image-photo/land-landscape-green-field-aerial-600nw-2504778555.jpg",
    "https://hasirufarms.com/wp-content/uploads/2025/10/Brindavan-copy-3.webp",
    "https://thumbs.dreamstime.com/b/aerial-drone-view-above-country-land-field-spring-season-agricultural-green-vivid-landscape-scenery-aerial-drone-view-424703743.jpg",
    "https://framerusercontent.com/images/2e9f1g4OdXgYmGbBMGWNmjagdxg.webp?width=1024&height=576",
    "https://treehousemap.com/wp-content/uploads/2020/06/Treehouse-Resort-Jaipur-1.jpg",
    "https://media-cdn.tripadvisor.com/media/photo-s/1c/c2/dd/e9/farm-of-happiness-agro.jpg",
    "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/12/59/f7/64/view-of-the-property.jpg?w=900&h=500&s=1",
    "https://imagecdn.99acres.com/media1/33349/15/666995459M-1766702203287.jpg"
  ];

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
          backgroundColor: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.3)",
          zIndex: 2000,
          overflowY: "auto",
          fontFamily: "'Montserrat', sans-serif",
          pointerEvents: "auto",
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
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            zIndex: 10,
          }}
        >
          ×
        </button>

        {/* Panel Content */}
        <div style={{ position: "relative" }}>
          {panelLoading ? (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
              <div style={{
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #024837",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px"
              }} />
              <p style={{ fontSize: "16px", color: "#333" }}>Loading plot details...</p>
            </div>
          ) : selectedPlotData ? (
            <>
              {/* Image Carousel Section */}
              <div style={{ position: "relative", height: windowWidth <= 768 ? "340px" : "400px", overflow: "hidden" }}>
                <div style={{
                  display: "flex",
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}>
                  {plotImages.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Plot view ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        flexShrink: 0,
                        scrollSnapAlign: "start",
                        borderRadius: "20px", // Rounded corners
                        margin: "0 15px", // Gap on sides (doesn't fill complete container)
                        ...(index === 0 && { marginLeft: "30px" }), // Extra left gap for first
                        ...(index === plotImages.length - 1 && { marginRight: "30px" }), // Extra right gap for last
                      }}
                    />
                  ))}
                </div>

                {/* Blog-style Overlay Card */}
                <div style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "30px",
                  right: "30px",
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "20px",
                  padding: "20px",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
                }}>
                  <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#024837", margin: "0 0 6px 0" }}>
                    Vinyas
                  </h1>
                  <p style={{ fontSize: "14px", color: "#555555", margin: "0 0 12px 0" }}>
                    A 10 acre managed Farmland
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: "24px", margin: "0", fontWeight: "700", color: "#024837" }}>
                        {selectedPlotData.plotName}
                      </h2>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#333", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faCompass} />
                        Phase - 1 • {selectedPlotData.facing} Facing
                      </p>
                    </div>

                    <span style={{
                      ...getStatusStyle(selectedPlotData.status),
                      padding: "8px 18px",
                      borderRadius: "30px",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: selectedPlotData.status?.toLowerCase() === "sold" ? "#c62828" : "#024837"
                    }}>
                      {selectedPlotData.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Content Below */}
              <div style={{ padding: "30px" }}>
                {/* Plot Details Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px", marginBottom: "30px" }}>
                  {/* ... (same as before) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FontAwesomeIcon icon={faHashtag} style={{ color: "#024837", fontSize: "18px" }} />
                    <div>
                      <strong>Plot Number</strong>
                      <p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.plotName}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FontAwesomeIcon icon={faFileAlt} style={{ color: "#024837", fontSize: "18px" }} />
                    <div>
                      <strong>Survey Number</strong>
                      <p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.surveyNumber}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FontAwesomeIcon icon={faRulerCombined} style={{ color: "#024837", fontSize: "18px" }} />
                    <div>
                      <strong>Area (Sqft)</strong>
                      <p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.areaSqFt}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FontAwesomeIcon icon={faArrowsAltH} style={{ color: "#024837", fontSize: "18px" }} />
                    <div>
                      <strong>Width</strong>
                      <p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.widthFt} ft</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FontAwesomeIcon icon={faArrowsAltV} style={{ color: "#024837", fontSize: "18px" }} />
                    <div>
                      <strong>Length</strong>
                      <p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.lengthFt} ft</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FontAwesomeIcon icon={faRulerCombined} style={{ color: "#024837", fontSize: "18px" }} />
                    <div>
                      <strong>Area (Sqmt)</strong>
                      <p style={{ margin: "5px 0", color: "#024837", fontWeight: "600" }}>{selectedPlotData.areaSqMt}</p>
                    </div>
                  </div>
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

                {/* Payment & Messages (unchanged) */}
                {!isRestricted && selectedPlotData.status?.toLowerCase() === "available" && (
                  <PaymentHandler
                    plotData={selectedPlotData}
                    plotStatus={selectedPlotData.status}
                    projectId={selectedPlotId}
                    setPlotStatus={() => {}}
                    closeParentPopup={closePlotPanel}
                  />
                )}

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

                <p style={{ textAlign: "center", fontSize: "12px", color: "#888888", marginTop: "40px", marginBottom: "100px" }}>
                  Secure your farmland plot today
                </p>
              </div>
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
