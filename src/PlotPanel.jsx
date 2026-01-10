// src/components/PlotPanel.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRulerCombined,
  faArrowsAltH,
  faArrowsAltV,
  faCompass,
  faHashtag,
  faFileAlt,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

import forestTreeIcon from "./assets/forest-tree-icon.svg";
import fruitTreeIcon from "./assets/fruit-tree-icon.svg";
import PaymentHandler from "./PaymentHandler";

const PlotPanel = ({
  selectedPlotId,
  selectedPlotData,
  panelLoading,
  closePlotPanel,
  windowWidth,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const carouselRef = useRef(null);

  const isMobile = windowWidth <= 768;

  // Lock body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const getStatusStyle = (status) => {
    const lowerStatus = status?.toLowerCase() || "";
    if (lowerStatus === "available") return { backgroundColor: "#e8f5e9", color: "#024837" };
    if (lowerStatus === "sold") return { backgroundColor: "#ffebee", color: "#c62828" };
    return { backgroundColor: "#fff3e0", color: "#e65100" };
  };

  const getPlotNumber = () => {
    if (!selectedPlotData?.plotName) return null;
    return parseInt(selectedPlotData.plotName.replace(/\D/g, ""), 10);
  };

  const plotNumber = getPlotNumber();
  const isRestricted = plotNumber >= 49 && plotNumber <= 71;

  const plotPrice = selectedPlotData?.price || 4500000; // Fallback price

  // Prioritize actual plot image, then fallback to curated generics
  const plotImages = selectedPlotData?.plotImage
    ? [
        selectedPlotData.plotImage,
        "https://hasirufarms.com/wp-content/uploads/2025/10/Brindavan-copy-3.webp",
        "https://framerusercontent.com/images/2e9f1g4OdXgYmGbBMGWNmjagdxg.webp?width=1024&height=576",
        "https://media-cdn.tripadvisor.com/media/photo-s/1c/c2/dd/e9/farm-of-happiness-agro.jpg",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/12/59/f7/64/view-of-the-property.jpg?w=900&h=500&s=1"
      ]
    : [
        "https://hasirufarms.com/wp-content/uploads/2025/10/Brindavan-copy-3.webp",
        "https://framerusercontent.com/images/2e9f1g4OdXgYmGbBMGWNmjagdxg.webp?width=1024&height=576",
        "https://media-cdn.tripadvisor.com/media/photo-s/1c/c2/dd/e9/farm-of-happiness-agro.jpg",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/12/59/f7/64/view-of-the-property.jpg?w=900&h=500&s=1",
      ];

  // Sync carousel index with actual scroll position
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || plotImages.length <= 1) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const width = carousel.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      setCurrentIndex(newIndex);
    };

    carousel.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial

    return () => carousel.removeEventListener("scroll", handleScroll);
  }, [plotImages.length]);

  // Auto-advance carousel
  useEffect(() => {
    if (plotImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % plotImages.length;
        if (carouselRef.current) {
          carouselRef.current.scrollTo({
            left: next * carouselRef.current.clientWidth,
            behavior: "smooth",
          });
        }
        return next;
      });
    }, 8500);

    return () => clearInterval(interval);
  }, [plotImages.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const next = (prev - 1 + plotImages.length) % plotImages.length;
      carouselRef.current?.scrollTo({
        left: next * carouselRef.current.clientWidth,
        behavior: "smooth",
      });
      return next;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const next = (prev + 1) % plotImages.length;
      carouselRef.current?.scrollTo({
        left: next * carouselRef.current.clientWidth,
        behavior: "smooth",
      });
      return next;
    });
  };

  // Extract tree details (exclude coconut entirely)
  const forestTrees = selectedPlotData?.forestTrees || {};
  const fruitTrees = selectedPlotData?.fruitTrees || {};

  const forestTreeEntries = Object.entries(forestTrees).filter(([_, count]) => count > 0);
  const fruitTreeEntries = Object.entries(fruitTrees).filter(([_, count]) => count > 0);

  const hasForestTrees = forestTreeEntries.length > 0;
  const hasFruitTrees = fruitTreeEntries.length > 0;
  const hasAnyTrees = hasForestTrees || hasFruitTrees;

  return (
    <>
      {/* Dark Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          zIndex: 1999,
        }}
        onClick={closePlotPanel}
      />

      {/* Sliding Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: isMobile ? "100%" : "460px",
          height: "100vh",
          backgroundColor: "#ffffff",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.35)",
          zIndex: 2000,
          overflowY: "auto",
          fontFamily: "'Montserrat', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Top Right on Mobile */}
        

        {panelLoading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div
              style={{
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #024837",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ fontSize: "15px", color: "#333" }}>Loading plot details...</p>
          </div>
        ) : selectedPlotData ? (
          <>
            {/* Carousel */}
            <div
              style={{
                position: "relative",
                height: isMobile ? "260px" : "300px",
                overflow: "hidden",
                background: "#f0f4f3",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <button onClick={handlePrev} style={{
                position: "absolute", top: "50%", left: "12px", transform: "translateY(-50%)",
                backgroundColor: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%",
                width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", zIndex: 15, opacity: isMobile || isHovered ? 1 : 0, transition: "opacity 0.3s ease"
              }}>
                <FontAwesomeIcon icon={faChevronLeft} size="lg" />
              </button>

              <button onClick={handleNext} style={{
                position: "absolute", top: "50%", right: "12px", transform: "translateY(-50%)",
                backgroundColor: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%",
                width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", zIndex: 15, opacity: isMobile || isHovered ? 1 : 0, transition: "opacity 0.3s ease"
              }}>
                <FontAwesomeIcon icon={faChevronRight} size="lg" />
              </button>

              <div
                ref={carouselRef}
                style={{
                  display: "flex",
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                  height: "100%",
                }}
              >
                {plotImages.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`View ${index + 1}`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      flexShrink: 0,
                      scrollSnapAlign: "start",
                    }}
                  />
                ))}
              </div>

              {/* Overlay Text */}
              <div style={{ position: "absolute", top: "24px", left: "24px", zIndex: 10, pointerEvents: "none" }}>
                <h1 style={{ fontSize: isMobile ? "26px" : "32px", fontWeight: "900", color: "#fff", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
                  Vinyas
                </h1>
                <p style={{ fontSize: "14px", color: "#f0f0f0", margin: "6px 0 0", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
                  10 Acre Managed Farmland
                </p>
                <p style={{ fontSize: "14px", color: "#f0f0f0", margin: "6px 0 0", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
                  Enjoy peaceful weekends at your own private farmland. Fully managed with seasonal crops, regular 
                </p>
              </div>


              {/* Dots Indicator */}
              <div style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 10 }}>
                {plotImages.map((_, index) => (
                  <div key={index} style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    backgroundColor: index === currentIndex ? "#ffffff" : "rgba(255,255,255,0.6)",
                    transition: "all 0.3s ease"
                  }} />
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div style={{ padding: "20px 24px 32px" }}>
              {/* Plot Header */}
              <div style={{
                marginBottom: "20px", padding: "16px 20px", backgroundColor: "#f9fafb",
                borderRadius: "16px", border: "1px solid #e5e7eb", display: "flex",
                justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px"
              }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? "22px" : "27px", margin: "0 0 6px 0", fontWeight: "800", color: "#024837" }}>
                    {selectedPlotData.plotName}
                  </h2>
                  <p style={{ margin: 0, fontSize: "14px", color: "#444", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FontAwesomeIcon icon={faCompass} style={{ color: "#024837" }} />
                    Phase - 1 • {selectedPlotData.facing} Facing
                  </p>
                </div>
                <span style={{
                  ...getStatusStyle(selectedPlotData.status),
                  padding: "8px 16px", borderRadius: "30px", fontWeight: "700", fontSize: "14px",  letterSpacing: "0.5px"
                }}>
                  <i class="fa fa-leaf" aria-hidden="true"></i> {selectedPlotData.status}
                </span>
              </div>

              {/* Plot Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {[
                  { icon: faHashtag, label: "Plot Number", value: selectedPlotData.plotName },
                  { icon: faFileAlt, label: "Survey No.", value: selectedPlotData.surveyNumber },
                  { icon: faRulerCombined, label: "Area (Sqft)", value: selectedPlotData.areaSqFt },
                  { icon: faArrowsAltH, label: "Width", value: `${selectedPlotData.widthFt} ft` },
                  { icon: faArrowsAltV, label: "Length", value: `${selectedPlotData.lengthFt} ft` },
                  { icon: faRulerCombined, label: "Area (Sqmt)", value: selectedPlotData.areaSqMt },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                    backgroundColor: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb"
                  }}>
                    <FontAwesomeIcon icon={item.icon} style={{ color: "#024837", fontSize: "20px" }} />
                    <div>
                      <div style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>{item.label}</div>
                      <div style={{ fontSize: "15px", color: "#024837", fontWeight: "700", marginTop: "2px" }}>
                        {item.value || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trees Section - Detailed Breakdown */}
              {hasAnyTrees && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#024837" }}>
                    Trees Planted
                  </h3>

                  {hasForestTrees && (
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <img src={forestTreeIcon} alt="Forest Trees" style={{ width: "36px" }} />
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#024837" }}>
                          Forest Trees ({forestTreeEntries.length} species)
                        </h4>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                        {forestTreeEntries.map(([tree, count]) => (
                          <div key={tree} style={{
                            padding: "10px 12px", backgroundColor: "#f9fafb", borderRadius: "10px",
                            border: "1px solid #e5e7eb", textAlign: "center"
                          }}>
                            <div style={{ fontSize: "14px", color: "#444", textTransform: "capitalize" }}>{tree}</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#024837", marginTop: "4px" }}>
                              {count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasFruitTrees && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <img src={fruitTreeIcon} alt="Fruit Trees" style={{ width: "36px" }} />
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#024837" }}>
                          Fruit Trees ({fruitTreeEntries.length} species)
                        </h4>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                        {fruitTreeEntries.map(([tree, count]) => (
                          <div key={tree} style={{
                            padding: "10px 12px", backgroundColor: "#f9fafb", borderRadius: "10px",
                            border: "1px solid #e5e7eb", textAlign: "center"
                          }}>
                            <div style={{ fontSize: "14px", color: "#444", textTransform: "capitalize" }}>{tree}</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#024837", marginTop: "4px" }}>
                              {count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description Note */}
              <div style={{
                backgroundColor: "#e8f5e9",
                padding: "16px 18px",
                borderRadius: "12px",
                marginBottom: "24px",
                borderLeft: "4px solid #024837"
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#024837", lineHeight: "1.5", fontWeight: "500" }}>
                  Enjoy peaceful weekends at your own private farmland. Fully managed with seasonal crops, regular maintenance, and 24/7 security. A perfect nature retreat just 2 hours from the city.
                </p>
              </div>

              {/* Pricing Details */}
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#024837" }}>
                  Pricing Details
                </h3>
                <div style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: "16px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "14px 18px", fontSize: "14px", color: "#555", borderBottom: "1px solid #e5e7eb" }}>
                          Plot Cost
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: "16px", fontWeight: "700", color: "#024837", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
                          ₹{plotPrice.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "14px 18px", fontSize: "14px", color: "#555", borderBottom: "1px solid #e5e7eb" }}>
                          Registration & Legal Charges
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: "15px", color: "#444", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
                          Included
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "14px 18px", fontSize: "14px", color: "#555", borderBottom: "1px solid #e5e7eb" }}>
                          Maintenance (First 3 Years)
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: "15px", color: "#444", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
                          Free
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "14px 18px", fontSize: "15px", fontWeight: "600", color: "#024837" }}>
                          Total Amount
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: "18px", fontWeight: "800", color: "#024837", textAlign: "right" }}>
                          ₹{plotPrice.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: "12px", color: "#777", textAlign: "center", marginTop: "12px", fontStyle: "italic" }}>
                  *Prices are inclusive of all charges. Limited period offer.
                </p>
              </div>

              {/* Booking / Restricted */}
              {!isRestricted && selectedPlotData.status?.toLowerCase() === "available" ? (
                <PaymentHandler
                  plotData={selectedPlotData}
                  plotStatus={selectedPlotData.status}
                  projectId={selectedPlotId}
                  setPlotStatus={() => {}}
                  closeParentPopup={closePlotPanel}
                />
              ) : (
                <div style={{
                  textAlign: "center", padding: "20px", backgroundColor: "#f9f9f9",
                  borderRadius: "14px", margin: "8px 0 20px", border: "1px dashed #ddd"
                }}>
                  <p style={{ color: "#555", fontSize: "14px", margin: 0, lineHeight: "1.5" }}>
                    {isRestricted
                      ? "Special allocation plot – not available for individual booking."
                      : "This plot is currently not available."}
                  </p>
                </div>
              )}
              <div style={{ 
      marginTop: "24px", 
      textAlign: "center" 
    }}>
      <button
        onClick={closePlotPanel}
        style={{
          padding: "18px 60px",
          fontSize: "16px",
          fontWeight: "600",
          color: "#024837",
          backgroundColor: "transparent",
          border: "2px solid #024837",
          borderRadius: "16px",
          cursor: "pointer",
          transition: "all 0.25s ease",
          boxShadow: "0 2px 8px rgba(2,72,55,0.12)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#024837";
          e.currentTarget.style.color = "#ffffff";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#024837";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        ◀  Explore More Plots 
      </button>
    </div>

              <p style={{
                textAlign: "center", fontSize: "12px", color: "#999",
                marginTop: "20px", fontStyle: "italic", marginBottom: "100px"
              }}>
                Secure your piece of nature today
              </p>
            </div>
          </>
        ) : (
          <p style={{ textAlign: "center", padding: "80px 0", color: "#666" }}>
            No data available for this plot.
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default PlotPanel;