import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import $ from "jquery";
import "imagemapster";
import "./map.css";
import image from "./assets/map-raaga.png";
import logoRight from "./assets/project-logo.png";
import contactBtn from "./assets/contact.png";
import LocationLabels from "./LocationLabels";
import MapAreas from "./MapAreas";
import parkImage from "./assets/6.jpg";
import parkImage2 from "./assets/parkiimage.jpg";
import compass from "./assets/compass.png";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import Logo from './assets/logo.png';
import PlotPanel from './PlotPanel';  // adjust path if needed


// Icons for panel


const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const ZOOM_KEY = "mapZoom";
const POSITION_KEY = "mapPosition";

const Map = () => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [availableUnits, setAvailableUnits] = useState("Loading...");
  const [newsItems, setNewsItems] = useState([]);
  const [error, setError] = useState(null);

  // NEW: State for right-side popup panel
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [selectedPlotData, setSelectedPlotData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // Handle image loading
  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => setIsImageLoaded(true);
    img.onerror = () => {
      console.error("Image failed to load");
      setIsImageLoaded(true);
      setError("Failed to load map image");
    };
  }, []);

  // Fetch news
  const fetchNewsData = useCallback(async () => {
    try {
      const newsCollection = collection(db, "news");
      const newsSnapshot = await getDocs(newsCollection);
      const newsData = newsSnapshot.docs.map((doc) => ({
        newsId: doc.id,
        ...doc.data(),
      }));

      const projectNews = newsData
        .filter((news) => news.plotnews === "Map")
        .map((news) => news.content?.trim() || "")
        .filter((content) => content !== "");

      setNewsItems(projectNews.length > 0 ? projectNews : ["No news available"]);
    } catch (err) {
      console.error("Error fetching Raaga news:", err.message);
      setNewsItems(["Error fetching news"]);
      setError("Failed to load news data");
    }
  }, []);

  // Fetch available units
  const fetchPlotsData = useCallback(async () => {
    try {
      const plotsCollection = collection(db, "mapplots");
      const plotsSnapshot = await getDocs(plotsCollection);
      const plots = plotsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const availableCount = plots.filter(
        (plot) => plot.Status && plot.Status.toLowerCase() === "available"
      ).length;

      setAvailableUnits(availableCount);
    } catch (err) {
      console.error("Error fetching plots:", err);
      setAvailableUnits("Error");
      setError("Failed to load plot data");
    }
  }, []);

  // NEW: Fetch individual plot data when clicked
  const fetchPlotDetails = useCallback(async (plotId) => {
  setPanelLoading(true);
  try {
    const plotRef = doc(db, "mapplots", plotId);
    const plotSnap = await getDoc(plotRef);

    if (plotSnap.exists()) {
      const data = plotSnap.data();

      const totalForestTrees = Object.values(
        data.NumberOfForestTrees || {}
      ).reduce((a, b) => a + b, 0);

      const totalFruitTrees =
        Object.values(data.NumberOfFruitTrees || {}).reduce((a, b) => a + b, 0) +
        (data.coconutTree || 0);

      setSelectedPlotData({
        id: plotId,
        blockName: data.blockName || "Vinyas",
        plotName: data.plotNumber || plotId.split("-").pop(),
        facing: data.facing || "East",
        surveyNumber: data.SurveyNumber || "N/A",
        areaSqFt: data.AreaSqFt || "N/A",
        areaSqMt: data.AreaSqMt || "N/A",
        lengthFt: data.lengthFt || "N/A",
        widthFt: data.widthFt || "N/A",
        numberOfForestTrees: totalForestTrees,
        numberOfFruitTrees: totalFruitTrees,
        coconutTree: data.coconutTree || 0,
        fruitTrees: data.NumberOfFruitTrees || {},
        forestTrees: data.NumberOfForestTrees || {},
        status: data.Status || "Available",
        plotImage:
          data.plotImage ||
          "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/12/59/f7/64/view-of-the-property.jpg?w=900&h=500&s=1",
      });
    } else {
      setSelectedPlotData(null);
    }
  } catch (err) {
    console.error("Error fetching plot:", err);
    setSelectedPlotData(null);
  } finally {
    setPanelLoading(false);
  }
}, []);


  // Open panel when plot clicked
 const openPlotPanel = useCallback(
  (plotId) => {
    setSelectedPlotId(plotId);
    fetchPlotDetails(plotId);
  },
  [fetchPlotDetails]
);


  // Close panel
  const closePlotPanel = () => {
    setSelectedPlotId(null);
    setSelectedPlotData(null);
  };

  const getInitialZoom = () => {
    const savedZoom = sessionStorage.getItem(ZOOM_KEY);
    if (savedZoom) return parseFloat(savedZoom);
    return windowWidth <= 768 ? 3 : 1.8;
  };

  const getInitialPosition = () => {
    const savedPosition = sessionStorage.getItem(POSITION_KEY);
    if (savedPosition) return JSON.parse(savedPosition);
    return { x: 0, y: 0 };
  };

  const [showInfoTabC5, setShowInfoTabC5] = useState(false);
  const [showInfoTabC7, setShowInfoTabC7] = useState(false);
  const [zoom, setZoom] = useState(getInitialZoom());
  const [position, setPosition] = useState(getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [wasDragged, setWasDragged] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [touchDistance, setTouchDistance] = useState(null);
  const [lastTouch, setLastTouch] = useState(null);

  const coords = useMemo(
    () => ({
      c3: { x: 3786, y: 1141 },
      c5: { x: 2585, y: 2556 },
      c6: { x: 2022, y: 1494 },
      c7: { x: 2967, y: 1856 },
      c8: { x: 1825, y: 1024 },
      c10: { x: 549, y: 1052 },
      c18: { x: 2586, y: 1280 },
      project6BaseCoords: { x: 1451, y: 2210 },
      project7BaseCoords: { x: 1104, y: 1638 },
    }),
    []
  );

  const minZoom = windowWidth <= 768 ? 3 : 1.8;
  const maxZoom = windowWidth <= 768 ? 7 : 3.9;
  const zoomStep = 0.1;

  const getLabelStyle = () => {
    // ... (keep your existing getLabelStyle)
    if (windowWidth <= 768) {
      return {
        position: "absolute",
        fontSize: "2px",
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "900",
        padding: "1px 2px",
        textAlign: "center",
        zIndex: 1000,
      };
    } else if (windowWidth <= 1024) {
      return {
        position: "absolute",
        fontSize: "10px",
        fontFamily: "'Montserrat', sans-serif",
        padding: "3px 6px",
        fontWeight: "900",
        textAlign: "center",
        zIndex: 1000,
      };
    } else {
      return {
        position: "absolute",
        fontSize: "5px",
        fontFamily: "'Montserrat', sans-serif",
        padding: "2px 5px",
        fontWeight: "900",
        textAlign: "center",
        zIndex: 1000,
      };
    }
  };

  // ... (keep all your existing zoom/pan logic unchanged: calculateBoundaries, adjustPositionToBounds, refreshMapster, etc.)
  const calculateBoundaries = useCallback(
      (targetZoom) => {
        const container = containerRef.current;
        const imgElement = mapRef.current;
        if (!container || !imgElement) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imgWidth = imgElement.clientWidth * targetZoom;
        const imgHeight = imgElement.clientHeight * targetZoom;
  
        const maxX = (imgWidth - containerWidth) / 2;
        const maxY = (imgHeight - containerHeight) / 2;
  
        return {
          minX: imgWidth <= containerWidth ? 0 : -maxX,
          maxX: imgWidth <= containerWidth ? 0 : maxX,
          minY: imgHeight <= containerHeight ? 0 : -maxY,
          maxY: imgHeight <= containerHeight ? 0 : maxY,
        };
      },
      []
    );
  
    const adjustPositionToBounds = useCallback(
      (currentZoom, currentPosition) => {
        const { minX, maxX, minY, maxY } = calculateBoundaries(currentZoom);
        const newPosition = {
          x: parseFloat(Math.min(maxX, Math.max(minX, currentPosition.x)).toFixed(2)),
          y: parseFloat(Math.min(maxY, Math.max(minY, currentPosition.y)).toFixed(2)),
        };
        sessionStorage.setItem(POSITION_KEY, JSON.stringify(newPosition));
        return newPosition;
      },
      [calculateBoundaries]
    );
  

  const refreshMapster = useCallback(() => {
    const imgElement = mapRef.current;
    if (imgElement && $(imgElement).mapster) {
      $(imgElement).mapster("unbind");
      $(imgElement).mapster({
        fillColor: "4dff00",
        fillOpacity: "60%",
        stroke: false,
        strokeColor: "ffffff",
        singleSelect: true,
        mapKey: "data-key",
        onClick: (data) => {
  if (!wasDragged && dragDistance < 5) {
    openPlotPanel(data.key); 
    $(imgElement).mapster("set", true, data.key);
  }
},
        showToolTip: true,
      });
      if (isIOS()) {
        $(imgElement).mapster("resize", imgElement.clientWidth, imgElement.clientHeight, 0);
      }
    }
  }, [wasDragged, dragDistance, openPlotPanel]);

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    if (!isImageLoaded) return;

    let isMounted = true;
    const imgElement = mapRef.current;

    const initializeMapster = () => {
      if (imgElement && isMounted) {
        setImageDimensions({ width: imgElement.naturalWidth, height: imgElement.naturalHeight });
        $(imgElement).mapster({
  fillColor: "4dff00",
  fillOpacity: "60%",
  stroke: false,
  singleSelect: true,
  
  mapKey: "data-key",
  onClick: (data) => {
    if (!wasDragged && dragDistance < 5) {
      openPlotPanel(data.key); // ← NEW: Open panel instead of navigate
      $(imgElement).mapster("set", true, data.key);
    }
  },
  showToolTip: true,
});
        if (isIOS()) {
          $(imgElement).mapster("resize", imgElement.clientWidth, imgElement.clientHeight, 0);
        }
      }
    };

    if (imgElement && imgElement.complete) {
      initializeMapster();
    } else if (imgElement) {
      imgElement.onload = () => initializeMapster();
    }

    const container = containerRef.current;
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? -zoomStep : zoomStep;
      setZoom((prevZoom) => {
        const newZoom = Math.min(maxZoom, Math.max(minZoom, prevZoom + zoomFactor));
        sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
        setPosition((prevPosition) => {
          const adjustedPosition = adjustPositionToBounds(newZoom, prevPosition);
          return adjustedPosition;
        });
        if (isIOS()) {
          setTimeout(refreshMapster, 100);
        }
        return newZoom;
      });
    };

    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth <= 1024) {
        const newZoom = newWidth <= 768 ? 3 : 3;
        setZoom(newZoom);
        sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
        setPosition({ x: 0, y: 0 });
        sessionStorage.setItem(POSITION_KEY, JSON.stringify({ x: 0, y: 0 }));
      } else {
        const newZoom = 2;
        setZoom(newZoom);
        sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
        setPosition({ x: 0, y: 0 });
        sessionStorage.setItem(POSITION_KEY, JSON.stringify({ x: 0, y: 0 }));
      }
      refreshMapster();
    };

    const debouncedHandleResize = debounce(handleResize, 200);

    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }
    window.addEventListener("resize", debouncedHandleResize);

    // Fetch both news and plots on mount
    fetchNewsData();
    fetchPlotsData();

    return () => {
      isMounted = false;
      if (imgElement) {
        $(imgElement).mapster("unbind");
      }
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, [
    navigate,
    wasDragged,
    dragDistance,
    refreshMapster,
    minZoom,
    isImageLoaded,
    adjustPositionToBounds,
    maxZoom,
    fetchNewsData,
    fetchPlotsData,
    openPlotPanel
  ]);

  const handleMouseDown = (e) => {
    if (selectedPlotId) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    setDragDistance(0);
    setWasDragged(false);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const { minX, maxX, minY, maxY } = calculateBoundaries(zoom);
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      newX = parseFloat(Math.min(maxX, Math.max(minX, newX)).toFixed(2));
      newY = parseFloat(Math.min(maxY, Math.max(minY, newY)).toFixed(2));

      setPosition((prev) => {
        const newPosition = { x: newX, y: newY };
        sessionStorage.setItem(POSITION_KEY, JSON.stringify(newPosition));
        return newPosition;
      });
      const distance = Math.hypot(
        e.clientX - (dragStart.x + position.x),
        e.clientY - (dragStart.y + position.y)
      );
      setDragDistance(distance);
      if (distance >= 5) {
        setWasDragged(true);
      }
    },
    [isDragging, dragStart, position, zoom, calculateBoundaries]
  );

  const handleMouseUp = (e) => {
    setIsDragging(false);
    if (dragDistance >= 5) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isIOS()) {
      setTimeout(refreshMapster, 100);
    }
  };

  const handleTouchStart = (e) => {
    if (selectedPlotId) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      setLastTouch({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      setTouchDistance(distance);
      setIsDragging(false);
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      const { minX, maxX, minY, maxY } = calculateBoundaries(zoom);

      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        let newX = touch.clientX - dragStart.x;
        let newY = touch.clientY - dragStart.y;

        newX = parseFloat(Math.min(maxX, Math.max(minX, newX)).toFixed(2));
        newY = parseFloat(Math.min(maxY, Math.max(minY, newY)).toFixed(2));

        setPosition((prev) => {
          const newPosition = { x: newX, y: newY };
          sessionStorage.setItem(POSITION_KEY, JSON.stringify(newPosition));
          return newPosition;
        });
        e.preventDefault();
      } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const newDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        if (touchDistance) {
          const zoomFactor = newDistance / touchDistance;
          setZoom((prevZoom) => {
            const newZoom = Math.min(maxZoom, Math.max(minZoom, prevZoom * zoomFactor));
            sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
            setPosition((prevPosition) => {
              const adjustedPosition = adjustPositionToBounds(newZoom, prevPosition);
              return adjustedPosition;
            });
            if (isIOS()) {
              setTimeout(refreshMapster, 100);
            }
            return newZoom;
          });
          setTouchDistance(newDistance);
        }
        e.preventDefault();
      }
    },
    [isDragging, dragStart, touchDistance, zoom, minZoom, maxZoom, refreshMapster, adjustPositionToBounds, calculateBoundaries]
  );

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) setTouchDistance(null);
    if (e.touches.length === 0 && isDragging && lastTouch) {
      const touch = e.changedTouches[0];
      const movedDistance = Math.hypot(touch.clientX - lastTouch.x, touch.clientY - lastTouch.y);

      if (movedDistance < 5) {
        const imgElement = mapRef.current;
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          pageX: touch.pageX,
          pageY: touch.pageY,
        });
        imgElement.dispatchEvent(clickEvent);
      }

      setIsDragging(false);
      setLastTouch(null);
      if (isIOS()) {
        setTimeout(refreshMapster, 100);
      }
    }
  };

  const getLogoWidth = () => {
    if (windowWidth <= 480) return "110px";
    if (windowWidth <= 768) return "130px";
    if (windowWidth <= 1024) return "150px";
    return "180px";
  };

  const zoomIn = () => {
    setZoom((prev) => {
      const newZoom = Math.min(maxZoom, prev + zoomStep);
      sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
      setPosition((prevPosition) => {
        const adjustedPosition = adjustPositionToBounds(newZoom, prevPosition);
        return adjustedPosition;
      });
      if (isIOS()) {
        setTimeout(refreshMapster, 100);
      }
      return newZoom;
    });
  };

  const zoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(minZoom, prev - zoomStep);
      sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
      setPosition((prevPosition) => {
        const { minX, maxX, minY, maxY } = calculateBoundaries(newZoom);
        if (minX === 0 && maxX === 0 && minY === 0 && maxY === 0) {
          return { x: 0, y: 0 };
        }
        const adjustedPosition = adjustPositionToBounds(newZoom, prevPosition);
        return adjustedPosition;
      });
      if (isIOS()) {
        setTimeout(refreshMapster, 100);
      }
      return newZoom;
    });
  };

  const getResponsivePosition = (baseX, baseY, offsetX = 0, offsetY = 0) => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return { left: `${baseX + offsetX}px`, top: `${baseY + offsetY}px` };
    }
    const imgElement = mapRef.current;
    const scaleX = imgElement ? imgElement.clientWidth / imageDimensions.width : 1;
    const scaleY = imgElement ? imgElement.clientHeight / imageDimensions.height : 1;
    return {
      left: `${(baseX + offsetX) * scaleX}px`,
      top: `${(baseY + offsetY) * scaleY}px`,
    };
  };

  const handleC5Click = () => {
    setShowInfoTabC5(true);
  };

  const handleC7Click = () => {
    setShowInfoTabC7(true);
  };

  const closeInfoTabC5 = () => {
    setShowInfoTabC5(false);
  };

  const closeInfoTabC7 = () => {
    setShowInfoTabC7(false);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const labelStyle = getLabelStyle();
  const infoTabWidth = windowWidth <= 768 ? "40px" : "60px";

  const newsTickerText = newsItems.length > 0 ? newsItems.join("  •  ") : "No news available";
  const duplicatedNewsText = `${newsTickerText}  •  ${newsTickerText}`;

  if (!isImageLoaded) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100%",
            backgroundColor: "#fff",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "18px",
            fontWeight: "500",
            color: "black",
          }}
        >
          <img src={Logo} alt="Logo" className="loading-logo" />
          <div className="loader"></div>
        </div>
      );
    }

  return (
  <div
    ref={containerRef}
    className="map-container"
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    onContextMenu={handleContextMenu}
    style={{
      overflow: "hidden",
      position: "relative",
      cursor: isDragging ? "grabbing" : "grab",
      WebkitTapHighlightColor: "transparent",
      width: "100%",
      height: "100vh",
      pointerEvents: "auto"
    }}
  >
    {error && (
      <div
        style={{
          position: "fixed",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#ffe6e6",
          color: "red",
          padding: "10px",
          borderRadius: "4px",
          zIndex: 2000,
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "14px",
        }}
      >
        {error}
      </div>
    )}

    {/* Zoomable & Pannable Map Container */}
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        WebkitTransform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transformOrigin: "center center",
        transition: !isDragging && !touchDistance ? "transform 0.2s ease-out" : "none",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <img
        ref={mapRef}
        src={image}
        useMap="#projectMap"
        alt="Project Map"
        style={{
          maxWidth: "100%",
          maxHeight: "100vh",
          width: "auto",
          height: "auto",
          userSelect: "none",
          pointerEvents: "auto",
          display: "block",
          imageRendering: "crisp-edges",
        }}
      />
      <MapAreas />
      <LocationLabels
        labelStyle={labelStyle}
        getResponsivePosition={getResponsivePosition}
        coords={coords}
        onC5Click={handleC5Click}
        onC7Click={handleC7Click}
      />

      {/* C5 & C7 Info Tabs */}
      {showInfoTabC5 && (
        <div
          style={{
            position: "absolute",
            ...getResponsivePosition(coords.c5.x, coords.c5.y, 0, -400),
            backgroundColor: "#024837",
            padding: windowWidth <= 768 ? "3px" : "5px",
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            zIndex: 2000,
            width: infoTabWidth,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: windowWidth <= 768 ? "4px" : "6px", color: "white" }}>
            Recreation Zone
          </h2>
          <img src={parkImage} alt="Park" style={{ width: "100%", height: "auto", borderRadius: "5px" }} />
          <p style={{ fontSize: windowWidth <= 768 ? "3.5px" : "5.5px", color: "white" }}>
            Nature and leisure unite in our serene farmland recreation zone.
          </p>
          <button onClick={closeInfoTabC5} style={{ padding: "3px 6px", background: "white", border: "none", borderRadius: "5px", fontSize: windowWidth <= 768 ? "3px" : "5px" }}>
            Close
          </button>
        </div>
      )}

      {showInfoTabC7 && (
        <div
          style={{
            position: "absolute",
            ...getResponsivePosition(coords.c7.x, coords.c7.y, 0, -400),
            backgroundColor: "#024837",
            padding: windowWidth <= 768 ? "3px" : "5px",
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            zIndex: 2000,
            width: infoTabWidth,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: windowWidth <= 768 ? "4px" : "6px", color: "white" }}>
            Leisure Zone
          </h2>
          <img src={parkImage2} alt="Zone C7" style={{ width: "100%", height: "auto", borderRadius: "5px" }} />
          <p style={{ fontSize: windowWidth <= 768 ? "3.5px" : "5.5px", color: "white" }}>
            A vibrant space dedicated to relaxation, recreation, and refined community living
          </p>
          <button onClick={closeInfoTabC7} style={{ padding: "3px 6px", background: "white", border: "none", borderRadius: "5px", fontSize: windowWidth <= 768 ? "3px" : "5px" }}>
            Close
          </button>
        </div>
      )}
    </div>

    {/* Zoom Controls */}
    <div className="zoom-controls">
      <button onClick={zoomIn}>+</button>
      <button onClick={zoomOut}>-</button>
    </div>

    {/* Right Logo */}
    <img
      src={logoRight}
      alt="Right Logo"
      style={{
        position: "fixed",
        top: "40px",
        left: "35px",
        width: getLogoWidth(),
        height: "auto",
        zIndex: 1500,
        borderRadius: windowWidth <= 768 ? "20px" : "28px",
        pointerEvents: "none",
        boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.9)",
      }}
    />

    {/* Available Units + News Ticker */}
    <div
      style={{
        position: "fixed",
        top: `calc(20px + ${getLogoWidth()} + 10px)`,
        left: "40px",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: windowWidth <= 768 ? "12px" : "14px",
        color: "black",
        padding: "10px 10px",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
        borderRadius: "16px",
        zIndex: 1500,
        textAlign: "center",
        width: "150px",
        height: "40px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span>
        <strong>Available Units:</strong> {availableUnits}
      </span>
      <div style={{ width: "100%", overflow: "hidden", whiteSpace: "nowrap", marginTop: "3px", height: "20px" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: windowWidth <= 768 ? "10px" : "12px",
            fontWeight: "600",
            animation: newsItems.length > 0 && newsItems[0] !== "Error fetching news" ? "scroll 30s linear infinite" : "none",
          }}
        >
          {duplicatedNewsText}
        </span>
      </div>
    </div>

    {/* Contact Button */}
    <img
      src={contactBtn}
      alt="Contact"
      style={{
        position: "fixed",
        bottom: windowWidth <= 768 ? "60px" : "60px",
        right: "40px",
        width: windowWidth <= 768 ? "100px" : "150px",
        height: "auto",
        zIndex: 1500,
        pointerEvents: "auto",
        borderRadius: windowWidth <= 768 ? "20px" : "28px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.6)",
        cursor: "pointer",
      }}
      onClick={() => (window.location.href = "https://www.hasirufarms.com/contact")}
    />

    {/* Compass */}
    <img
      src={compass}
      alt="compass"
      style={{
        position: "fixed",
        bottom: windowWidth <= 768 ? "60px" : "60px",
        left: "40px",
        width: windowWidth <= 768 ? "60px" : "100px",
        height: "auto",
        zIndex: 1500,
        pointerEvents: "auto",
        borderRadius: windowWidth <= 768 ? "20px" : "28px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.6)",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        padding: "10px",
      }}
    />

    {/* Footer Credit */}
    <div
      style={{
        position: "fixed",
        bottom: windowWidth <= 768 ? "120px" : "50px",
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: windowWidth <= 768 ? "10px" : "10px",
        color: "white",
        padding: "5px 10px",
        borderRadius: "5px",
        width: "200px",
        textAlign: "center",
        alignItems:"center",
        zIndex: 1500,
        pointerEvents: "none",
      }}
    >
     
      <strong>Plot Map V26.1</strong> Powered by <br /> Luminexa
    </div>

    {/* RIGHT-SIDE PLOT DETAILS PANEL POPUP */}
    {selectedPlotId && (
      <PlotPanel
        selectedPlotId={selectedPlotId}
        selectedPlotData={selectedPlotData}
        panelLoading={panelLoading}
        closePlotPanel={closePlotPanel}
        windowWidth={windowWidth}
      />
    )}

    {/* Animations */}
    <style jsx>{`
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `}</style>
  </div>
);
};

export default Map;