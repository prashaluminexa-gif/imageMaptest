import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import $ from "jquery";
import "imagemapster";
import "./map.css";

import image from "./assets/map-raaga.png";
import logoRight from "./assets/project-logo.png";
import contactBtn from "./assets/contact.png";
import parkImage from "./assets/6.jpg";
import parkImage2 from "./assets/parkiimage.jpg";
import compass from "./assets/compass.png";
import Logo from "./assets/logo.png";

import LocationLabels from "./LocationLabels";
import MapAreas, { plotCoordinates } from "./MapAreas";
import PlotPanel from "./PlotPanel";
import LeftControlBar from "./LeftControlBar";
import UserProfile from "./UserProfile";
import AskAI from "./AskAI";

import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// -------------------- Utility --------------------

const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const ZOOM_KEY = "mapZoom";
const POSITION_KEY = "mapPosition";

const coordsToSvgPoints = (coordsString) => {
  const nums = coordsString.split(",").map((n) => Number(n.trim()));
  const pairs = [];

  for (let i = 0; i < nums.length; i += 2) {
    if (nums[i] != null && nums[i + 1] != null) {
      pairs.push(`${nums[i]},${nums[i + 1]}`);
    }
  }

  return pairs.join(" ");
};

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const normalizeFacing = (facing) => String(facing || "").trim().toUpperCase();

const STATUS_COLORS = {
  available: "rgba(34, 197, 94, 0.82)",
  sold: "rgba(239, 68, 68, 0.82)",
  booked: "rgba(245, 158, 11, 0.82)",
  reserved: "rgba(249, 115, 22, 0.82)",
  blocked: "rgba(168, 85, 247, 0.82)",
  hold: "rgba(234, 179, 8, 0.82)",
  unknown: "rgba(107, 114, 128, 0.82)",
};

const FACING_COLORS = {
  N: "rgba(59, 130, 246, 0.30)",
  S: "rgba(249, 115, 22, 0.30)",
  E: "rgba(168, 85, 247, 0.30)",
  W: "rgba(20, 184, 166, 0.30)",
  "N&E": "rgba(99, 102, 241, 0.30)",
  "N&W": "rgba(14, 165, 233, 0.30)",
  "S&E": "rgba(236, 72, 153, 0.30)",
  "S&W": "rgba(234, 179, 8, 0.30)",
  "E&W": "rgba(129, 140, 248, 0.30)",
  TBD: "rgba(107, 114, 128, 0.22)",
};

// -------------------- Component --------------------

const Map = () => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // --- State: UI & Layout ---
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [uiLocked, setUiLocked] = useState(false);

  // --- State: Data ---
  const [availableUnits, setAvailableUnits] = useState("Loading...");
  const [newsItems, setNewsItems] = useState([]);
  const [plotMetaMap, setPlotMetaMap] = useState({});

  // --- State: Selection & Panel ---
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [selectedPlotData, setSelectedPlotData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [hoveredPlotId, setHoveredPlotId] = useState(null);

  // --- State: Filters ---
  const [colorMode, setColorMode] = useState("none"); // none | status | facing
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [facingFilter, setFacingFilter] = useState("ALL");

  // --- State: Map Interaction (Zoom/Pan) ---
  const [showInfoTabC5, setShowInfoTabC5] = useState(false);
  const [showInfoTabC7, setShowInfoTabC7] = useState(false);

  const [zoom, setZoom] = useState(() => {
    const savedZoom = sessionStorage.getItem(ZOOM_KEY);
    if (savedZoom) return parseFloat(savedZoom);
    return window.innerWidth <= 768 ? 3 : 1.8;
  });

  const [position, setPosition] = useState(() => {
    const savedPosition = sessionStorage.getItem(POSITION_KEY);
    if (savedPosition) return JSON.parse(savedPosition);
    return { x: 0, y: 0 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [wasDragged, setWasDragged] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [touchDistance, setTouchDistance] = useState(null);
  const [lastTouch, setLastTouch] = useState(null);

  // --- Constants: Coordinates ---
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

  const selectedPlot = useMemo(() => {
    return plotCoordinates.find((plot) => plot.id === selectedPlotId) || null;
  }, [selectedPlotId]);

  const hoveredPlot = useMemo(() => {
    return plotCoordinates.find((plot) => plot.id === hoveredPlotId) || null;
  }, [hoveredPlotId]);

  const minZoom = windowWidth <= 768 ? 3 : 1.8;
  const maxZoom = windowWidth <= 768 ? 7 : 3.9;
  const zoomStep = 0.1;

  const statusOptions = useMemo(() => {
    const values = Object.values(plotMetaMap)
      .map((p) => p.status)
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(values))];
  }, [plotMetaMap]);

  const facingOptions = useMemo(() => {
    const values = Object.values(plotMetaMap)
      .map((p) => p.facing)
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(values))];
  }, [plotMetaMap]);

  // -------------------- Data Fetching --------------------

  const fetchNewsData = useCallback(async () => {
    try {
      const newsCollection = collection(db, "news");
      const newsSnapshot = await getDocs(newsCollection);

      const newsData = newsSnapshot.docs.map((docItem) => ({
        newsId: docItem.id,
        ...docItem.data(),
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

  const fetchPlotsData = useCallback(async () => {
    try {
      const plotsCollection = collection(db, "mapplots");
      const plotsSnapshot = await getDocs(plotsCollection);

      const plots = plotsSnapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      const availableCount = plots.filter(
        (plot) => normalizeStatus(plot.Status) === "available"
      ).length;

      setAvailableUnits(availableCount);

      const metaMap = {};
      plots.forEach((plot) => {
        const key = plot.projectId || plot.id;
        if (!key) return;

        metaMap[key] = {
          id: key,
          plotNumber: plot.plotNumber || key,
          status: plot.Status || "Unknown",
          facing: plot.facing || "TBD",
          blockName: plot.blockName || "",
        };
      });

      setPlotMetaMap(metaMap);
    } catch (err) {
      console.error("Error fetching plots:", err);
      setAvailableUnits("Error");
      setError("Failed to load plot data");
    }
  }, []);

  const fetchPlotDetails = useCallback(async (plotId) => {
    setPanelLoading(true);

    try {
      const plotRef = doc(db, "mapplots", plotId);
      const plotSnap = await getDoc(plotRef);

      if (plotSnap.exists()) {
        const data = plotSnap.data();

        const totalForestTrees = Object.values(data.NumberOfForestTrees || {}).reduce(
          (a, b) => a + b,
          0
        );

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
          areaGuntas: data.AreaGuntas || "N/A",
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

  // -------------------- Plot Actions --------------------

  const openPlotPanel = useCallback(
    (plotId) => {
      setSelectedPlotId(plotId);
      fetchPlotDetails(plotId);
    },
    [fetchPlotDetails]
  );

  const closePlotPanel = () => {
    setSelectedPlotId(null);
    setSelectedPlotData(null);

    const imgElement = mapRef.current;
    if (imgElement && $(imgElement).mapster) {
      try {
        $(imgElement).mapster("set", false, true);
      } catch (err) {
        console.error("Error clearing mapster selection:", err);
      }
    }
  };

  // -------------------- AI Integration --------------------

  const handleAiResult = useCallback(
    (data) => {
      if (!data) return;

      if (data.filters?.status) {
        setColorMode("status");
        setStatusFilter(data.filters.status);
      }

      if (data.filters?.facing) {
        setColorMode("facing");
        setFacingFilter(data.filters.facing);
      }

      if (data.focusPlotId) {
        openPlotPanel(data.focusPlotId);
        return;
      }

      if (Array.isArray(data.matchingPlotIds) && data.matchingPlotIds.length > 0) {
        openPlotPanel(data.matchingPlotIds[0]);
      }
    },
    [openPlotPanel]
  );

  const aiContext = useMemo(() => {
    const plotList = plotCoordinates.map((plot) => {
      const meta = plotMetaMap[plot.id] || {};
      return {
        id: plot.id,
        plotNumber: meta.plotNumber || plot.id,
        status: meta.status || "Unknown",
        facing: meta.facing || "TBD",
        blockName: meta.blockName || "",
        coords: plot.coords,
      };
    });

    return {
      company: {
        name: "Luminexa Technologies",
        services: [
          "Image Mapping",
          "360 Virtual Tour",
          "Drone Capture",
          "Plot Management Dashboard",
          "WebAR Solutions",
        ],
      },
      project: {
        name: "SLV Gardens",
        availableUnits,
      },
      selectedPlot: selectedPlotData,
      plots: plotList,
    };
  }, [availableUnits, selectedPlotData, plotMetaMap]);

  // -------------------- Map Logic --------------------

  const calculateBoundaries = useCallback((targetZoom) => {
    const container = containerRef.current;
    const imgElement = mapRef.current;

    if (!container || !imgElement) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

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
  }, []);

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
    if (!imgElement || !$(imgElement).mapster) return;

    try {
      $(imgElement).mapster("unbind");
    } catch (err) {
      console.error("Mapster unbind error:", err);
    }

    $(imgElement).mapster({
      fillColor: "000000",
      fillOpacity: 0,
      stroke: false,
      strokeColor: "ffffff",
      singleSelect: true,
      mapKey: "data-key",
      onClick: (data) => {
        if (!wasDragged && dragDistance < 5) {
          openPlotPanel(data.key);
          $(imgElement).mapster("set", true, data.key);
        }
        return false;
      },
      showToolTip: true,
    });

    if (isIOS()) {
      try {
        $(imgElement).mapster("resize", imgElement.clientWidth, imgElement.clientHeight, 0);
      } catch (err) {
        console.error("Mapster resize error:", err);
      }
    }
  }, [wasDragged, dragDistance, openPlotPanel]);

  const getStatusColor = useCallback((status) => {
    return STATUS_COLORS[normalizeStatus(status)] || STATUS_COLORS.unknown;
  }, []);

  const getFacingColor = useCallback((facing) => {
    return FACING_COLORS[normalizeFacing(facing)] || FACING_COLORS.TBD;
  }, []);

  const getPlotFilterFill = useCallback(
    (plotId) => {
      const meta = plotMetaMap[plotId];
      if (!meta) return null;

      if (colorMode === "status") {
        const plotStatus = normalizeStatus(meta.status);
        const filterStatusValue = normalizeStatus(statusFilter);

        if (statusFilter !== "ALL" && plotStatus !== filterStatusValue) {
          return "rgba(255,255,255,0.04)";
        }

        return getStatusColor(meta.status);
      }

      if (colorMode === "facing") {
        const plotFacing = normalizeFacing(meta.facing);
        const filterFacingValue = normalizeFacing(facingFilter);

        if (facingFilter !== "ALL" && plotFacing !== filterFacingValue) {
          return "rgba(255,255,255,0.04)";
        }

        return getFacingColor(meta.facing);
      }

      return null;
    },
    [plotMetaMap, colorMode, statusFilter, facingFilter, getStatusColor, getFacingColor]
  );

  // -------------------- Effects --------------------

  useEffect(() => {
    const img = new Image();
    img.src = image;

    img.onload = () => {
      setIsImageLoaded(true);
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      console.error("Image failed to load");
      setIsImageLoaded(true);
      setError("Failed to load map image");
    };

    fetchNewsData();
    fetchPlotsData();
  }, [fetchNewsData, fetchPlotsData]);

  useEffect(() => {
    if (!isImageLoaded) return;

    let isMounted = true;
    const imgElement = mapRef.current;
    const container = containerRef.current;

    const initializeMapster = () => {
      if (!imgElement || !isMounted) return;

      setImageDimensions({
        width: imgElement.naturalWidth,
        height: imgElement.naturalHeight,
      });

      $(imgElement).mapster({
        fillColor: "000000",
        fillOpacity: 0,
        stroke: false,
        singleSelect: true,
        mapKey: "data-key",
        onClick: (data) => {
          if (!wasDragged && dragDistance < 5) {
            openPlotPanel(data.key);
            $(imgElement).mapster("set", true, data.key);
          }
          return false;
        },
        showToolTip: true,
      });

      if (isIOS()) {
        try {
          $(imgElement).mapster("resize", imgElement.clientWidth, imgElement.clientHeight, 0);
        } catch (err) {
          console.error("Mapster resize init error:", err);
        }
      }
    };

    if (imgElement && imgElement.complete) {
      initializeMapster();
    } else if (imgElement) {
      imgElement.onload = () => initializeMapster();
    }

    if (!container) return;

    const handleWheel = (e) => {
      if (uiLocked) return;
      if (selectedPlotId) return;

      e.preventDefault();

      const zoomFactor = e.deltaY > 0 ? -zoomStep : zoomStep;

      setZoom((prevZoom) => {
        const newZoom = Math.min(maxZoom, Math.max(minZoom, prevZoom + zoomFactor));
        sessionStorage.setItem(ZOOM_KEY, newZoom.toString());

        setPosition((prevPosition) => adjustPositionToBounds(newZoom, prevPosition));

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

      setTimeout(() => {
        refreshMapster();
      }, 100);
    };

    const debouncedHandleResize = debounce(handleResize, 200);

    container.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      isMounted = false;

      try {
        if (imgElement) {
          $(imgElement).mapster("unbind");
        }
      } catch (err) {
        console.error("Mapster cleanup error:", err);
      }

      container.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, [
    navigate,
    wasDragged,
    dragDistance,
    refreshMapster,
    minZoom,
    maxZoom,
    isImageLoaded,
    adjustPositionToBounds,
    selectedPlotId,
    uiLocked,
    fetchNewsData,
    fetchPlotsData,
    openPlotPanel,
    zoomStep,
  ]);

  // -------------------- Mouse / Touch --------------------

  const handleMouseDown = (e) => {
    if (uiLocked) return;

    const clickedInsideModal = e.target.closest?.('[data-modal="true"]');
    if (clickedInsideModal) return;

    const clickedInsideUi = e.target.closest?.('[data-ui="true"]');
    if (clickedInsideUi) return;

    if (selectedPlotId) return;

    const isMapClick =
      e.target === mapRef.current ||
      e.target.closest?.(".map-container") ||
      e.target.closest?.("img[usemap]");

    if (isMapClick) e.preventDefault();

    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    setDragDistance(0);
    setWasDragged(false);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (uiLocked) return;
      if (!isDragging) return;

      const { minX, maxX, minY, maxY } = calculateBoundaries(zoom);

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      newX = parseFloat(Math.min(maxX, Math.max(minX, newX)).toFixed(2));
      newY = parseFloat(Math.min(maxY, Math.max(minY, newY)).toFixed(2));

      setPosition(() => {
        const newPosition = { x: newX, y: newY };
        sessionStorage.setItem(POSITION_KEY, JSON.stringify(newPosition));
        return newPosition;
      });

      const distance = Math.hypot(
        e.clientX - (dragStart.x + position.x),
        e.clientY - (dragStart.y + position.y)
      );

      setDragDistance(distance);
      if (distance >= 5) setWasDragged(true);
    },
    [uiLocked, isDragging, calculateBoundaries, zoom, dragStart, position]
  );

  const handleMouseUp = (e) => {
    if (uiLocked) return;

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
    if (uiLocked) return;

    const touchedInsideUi = e.target.closest?.('[data-ui="true"]');
    if (touchedInsideUi) return;

    if (selectedPlotId) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      setLastTouch({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      setTouchDistance(distance);
      setIsDragging(false);
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (uiLocked) return;

      const { minX, maxX, minY, maxY } = calculateBoundaries(zoom);

      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];

        let newX = touch.clientX - dragStart.x;
        let newY = touch.clientY - dragStart.y;

        newX = parseFloat(Math.min(maxX, Math.max(minX, newX)).toFixed(2));
        newY = parseFloat(Math.min(maxY, Math.max(minY, newY)).toFixed(2));

        setPosition(() => {
          const newPosition = { x: newX, y: newY };
          sessionStorage.setItem(POSITION_KEY, JSON.stringify(newPosition));
          return newPosition;
        });

        e.preventDefault();
      } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const newDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        if (touchDistance) {
          const zoomFactor = newDistance / touchDistance;

          setZoom((prevZoom) => {
            const newZoom = Math.min(maxZoom, Math.max(minZoom, prevZoom * zoomFactor));
            sessionStorage.setItem(ZOOM_KEY, newZoom.toString());

            setPosition((prevPosition) => adjustPositionToBounds(newZoom, prevPosition));

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
    [
      uiLocked,
      calculateBoundaries,
      zoom,
      isDragging,
      dragStart,
      touchDistance,
      maxZoom,
      minZoom,
      adjustPositionToBounds,
      refreshMapster,
    ]
  );

  const handleTouchEnd = (e) => {
    if (uiLocked) return;
    if (e.touches.length < 2) setTouchDistance(null);

    if (e.touches.length === 0 && isDragging && lastTouch) {
      const touch = e.changedTouches[0];
      const movedDistance = Math.hypot(
        touch.clientX - lastTouch.x,
        touch.clientY - lastTouch.y
      );

      if (movedDistance < 5) {
        const imgElement = mapRef.current;
        if (imgElement) {
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
      }

      setIsDragging(false);
      setLastTouch(null);

      if (isIOS()) {
        setTimeout(refreshMapster, 100);
      }
    }
  };

  // -------------------- Helpers --------------------

  const getLogoWidth = () => {
    if (windowWidth <= 480) return "110px";
    if (windowWidth <= 768) return "130px";
    if (windowWidth <= 1024) return "150px";
    return "100px";
  };

  const zoomIn = () => {
    setZoom((prev) => {
      const newZoom = Math.min(maxZoom, prev + zoomStep);
      sessionStorage.setItem(ZOOM_KEY, newZoom.toString());
      setPosition((prevPosition) => adjustPositionToBounds(newZoom, prevPosition));

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

        return adjustPositionToBounds(newZoom, prevPosition);
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

  const getLabelStyle = () => {
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

  const getLegendItems = () => {
    if (colorMode === "status") {
      return [
        { label: "Available", color: STATUS_COLORS.available },
        { label: "Sold", color: STATUS_COLORS.sold },
        { label: "Booked", color: STATUS_COLORS.booked },
        { label: "Reserved", color: STATUS_COLORS.reserved },
        { label: "Blocked", color: STATUS_COLORS.blocked },
        { label: "Unknown", color: STATUS_COLORS.unknown },
      ];
    }

    if (colorMode === "facing") {
      return [
        { label: "N", color: FACING_COLORS.N },
        { label: "S", color: FACING_COLORS.S },
        { label: "E", color: FACING_COLORS.E },
        { label: "W", color: FACING_COLORS.W },
        { label: "N&E", color: FACING_COLORS["N&E"] },
        { label: "N&W", color: FACING_COLORS["N&W"] },
        { label: "S&E", color: FACING_COLORS["S&E"] },
        { label: "S&W", color: FACING_COLORS["S&W"] },
        { label: "E&W", color: FACING_COLORS["E&W"] },
        { label: "TBD", color: FACING_COLORS.TBD },
      ];
    }

    return [];
  };

  const poppingTabStyle = {
    position: "absolute",
    backgroundColor: "#024837",
    padding: windowWidth <= 768 ? "6px" : "10px",
    borderRadius: "12px",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
    zIndex: 2000,
    width: windowWidth <= 768 ? "120px" : "180px",
    textAlign: "center",
    transformOrigin: "bottom center",
    animation: "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
  };

  const labelStyle = getLabelStyle();
  const newsTickerText = newsItems.length > 0 ? newsItems.join("  •  ") : "No news available";
  const duplicatedNewsText = `${newsTickerText}  •  ${newsTickerText}`;
  const legendItems = getLegendItems();

  // -------------------- Loading --------------------

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

  // -------------------- Render --------------------

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
      onContextMenu={(e) => e.preventDefault()}
      style={{
        overflow: "hidden",
        position: "relative",
        cursor: isDragging ? "grabbing" : "grab",
        WebkitTapHighlightColor: "transparent",
        width: "100%",
        height: "100vh",
        pointerEvents: "auto",
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
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "inline-block",
            lineHeight: 0,
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
            onLoad={(e) => {
              const imgEl = e.currentTarget;
              setImageDimensions({
                width: imgEl.naturalWidth,
                height: imgEl.naturalHeight,
              });
            }}
          />

          {imageDimensions.width > 0 && imageDimensions.height > 0 && (
            <svg
              viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
              preserveAspectRatio="xMidYMid meet"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 20,
                overflow: "visible",
              }}
            >
              {plotCoordinates.map((plot) => {
                const fill = getPlotFilterFill(plot.id);
                if (!fill) return null;

                return (
                  <polygon
                    key={`filter-${plot.id}`}
                    points={coordsToSvgPoints(plot.coords)}
                    fill={fill}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="0.25"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {!selectedPlot && hoveredPlot && (
                <polygon
                  points={coordsToSvgPoints(hoveredPlot.coords)}
                  fill="rgba(77, 255, 0, 0.57)"
                  stroke="#ffffff"
                  strokeWidth="0.45"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {selectedPlot && (
                <polygon
                  points={coordsToSvgPoints(selectedPlot.coords)}
                  fill="rgba(77, 255, 0, 0.60)"
                  stroke="#ffffff"
                  strokeWidth="0.55"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          )}

          <MapAreas
            onPlotEnter={(plotId) => {
              if (!selectedPlotId) setHoveredPlotId(plotId);
            }}
            onPlotLeave={() => {
              setHoveredPlotId(null);
            }}
          />

          <LocationLabels
            labelStyle={labelStyle}
            getResponsivePosition={getResponsivePosition}
            coords={coords}
            onC5Click={() => setShowInfoTabC5(true)}
            onC7Click={() => setShowInfoTabC7(true)}
          />

          {showInfoTabC5 && (
            <div
              style={{
                ...poppingTabStyle,
                ...getResponsivePosition(coords.c5.x, coords.c5.y, 0, -400),
              }}
            >
              <h2
                style={{
                  fontSize: windowWidth <= 768 ? "10px" : "12px",
                  color: "white",
                  marginBottom: "5px",
                }}
              >
                Recreation Zone
              </h2>
              <img
                src={parkImage}
                alt="Park"
                style={{ width: "100%", height: "auto", borderRadius: "5px" }}
              />
              <p
                style={{
                  fontSize: windowWidth <= 768 ? "8px" : "10px",
                  color: "white",
                  margin: "5px 0",
                }}
              >
                Nature and leisure unite in our serene farmland recreation zone.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoTabC5(false);
                }}
                style={{
                  padding: "3px 8px",
                  background: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: windowWidth <= 768 ? "8px" : "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Close
              </button>
            </div>
          )}

          {showInfoTabC7 && (
            <div
              style={{
                ...poppingTabStyle,
                ...getResponsivePosition(coords.c7.x, coords.c7.y, 0, -400),
              }}
            >
              <h2
                style={{
                  fontSize: windowWidth <= 768 ? "10px" : "12px",
                  color: "white",
                  marginBottom: "5px",
                }}
              >
                Leisure Zone
              </h2>
              <img
                src={parkImage2}
                alt="Zone C7"
                style={{ width: "100%", height: "auto", borderRadius: "5px" }}
              />
              <p
                style={{
                  fontSize: windowWidth <= 768 ? "8px" : "10px",
                  color: "white",
                  margin: "5px 0",
                }}
              >
                A vibrant space dedicated to relaxation and refined community living.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoTabC7(false);
                }}
                style={{
                  padding: "3px 8px",
                  background: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: windowWidth <= 768 ? "8px" : "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="zoom-controls" data-ui="true">
        <button onClick={zoomIn}>+</button>
        <button onClick={zoomOut}>-</button>
      </div>

      <LeftControlBar windowWidth={windowWidth} />
      <UserProfile windowWidth={windowWidth} onModalOpenChange={setUiLocked} />

      <div
        data-ui="true"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "16px",
          left: "20px",
          right: windowWidth <= 768 ? "160px" : "190px",
          zIndex: 1800,
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
          pointerEvents: "auto",
        }}
      >
        <img
          src={logoRight}
          alt="Right Logo"
          style={{
            width: getLogoWidth(),
            height: "auto",
            borderRadius: windowWidth <= 768 ? "20px" : "28px",
            boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.9)",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            minWidth: windowWidth <= 768 ? "160px" : "190px",
            maxWidth: windowWidth <= 768 ? "180px" : "220px",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: windowWidth <= 768 ? "12px" : "14px",
            color: "black",
            padding: "10px 12px",
            backgroundColor: "rgba(255, 255, 255, 0.88)",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            borderRadius: "16px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <span style={{ fontSize: "12px" }}>
            <strong>Available Units:</strong> {availableUnits}
          </span>

          <div
            style={{
              width: "100%",
              overflow: "hidden",
              whiteSpace: "nowrap",
              marginTop: "4px",
              height: "18px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: "600",
                animation:
                  newsItems.length > 0 && newsItems[0] !== "Error fetching news"
                    ? "scroll 30s linear infinite"
                    : "none",
              }}
            >
              {duplicatedNewsText}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            borderRadius: "14px",
            padding: windowWidth <= 768 ? "8px" : "10px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            fontFamily: "'Montserrat', sans-serif",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            minWidth: windowWidth <= 768 ? "210px" : "290px",
            maxWidth: windowWidth <= 768 ? "260px" : "360px",
          }}
        >
          <span
            style={{
              fontSize: windowWidth <= 768 ? "10px" : "11px",
              fontWeight: 700,
              color: "#111827",
              whiteSpace: "nowrap",
            }}
          >
            Filter:
          </span>

          <select
            value={colorMode}
            onChange={(e) => {
              setColorMode(e.target.value);
              if (e.target.value !== "status") setStatusFilter("ALL");
              if (e.target.value !== "facing") setFacingFilter("ALL");
            }}
            style={{
              width: windowWidth <= 768 ? "92px" : "110px",
              padding: windowWidth <= 768 ? "6px 8px" : "7px 9px",
              borderRadius: "9px",
              border: "1px solid #d1d5db",
              fontSize: windowWidth <= 768 ? "10px" : "11px",
              outline: "none",
              background: "#fff",
              cursor: "pointer",
              pointerEvents: "auto",
              height: windowWidth <= 768 ? "32px" : "34px",
            }}
          >
            <option value="none">None</option>
            <option value="status">Status</option>
            <option value="facing">Facing</option>
          </select>

          {colorMode === "status" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: windowWidth <= 768 ? "92px" : "110px",
                padding: windowWidth <= 768 ? "6px 8px" : "7px 9px",
                borderRadius: "9px",
                border: "1px solid #d1d5db",
                fontSize: windowWidth <= 768 ? "10px" : "11px",
                outline: "none",
                background: "#fff",
                cursor: "pointer",
                pointerEvents: "auto",
                height: windowWidth <= 768 ? "32px" : "34px",
              }}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          )}

          {colorMode === "facing" && (
            <select
              value={facingFilter}
              onChange={(e) => setFacingFilter(e.target.value)}
              style={{
                width: windowWidth <= 768 ? "92px" : "110px",
                padding: windowWidth <= 768 ? "6px 8px" : "7px 9px",
                borderRadius: "9px",
                border: "1px solid #d1d5db",
                fontSize: windowWidth <= 768 ? "10px" : "11px",
                outline: "none",
                background: "#fff",
                cursor: "pointer",
                pointerEvents: "auto",
                height: windowWidth <= 768 ? "32px" : "34px",
              }}
            >
              {facingOptions.map((facing) => (
                <option key={facing} value={facing}>
                  {facing}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {colorMode !== "none" && (
        <div
          data-ui="true"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: windowWidth <= 768 ? "90px" : "80px",
            right: "10px",
            zIndex: 1800,
            width: windowWidth <= 768 ? "120px" : "150px",
            maxHeight: windowWidth <= 768 ? "45vh" : "60vh",
            overflowY: "auto",
            background: "rgba(255,255,255,0.92)",
            borderRadius: "16px",
            padding: windowWidth <= 768 ? "10px" : "12px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            fontFamily: "'Montserrat', sans-serif",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              fontSize: windowWidth <= 768 ? "11px" : "12px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "#1f2937",
              textAlign: "left",
            }}
          >
            Legend
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {legendItems.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: windowWidth <= 768 ? "10px" : "11px",
                  color: "#111827",
                  lineHeight: 1.2,
                }}
              >
                <span
                  style={{
                    width: windowWidth <= 768 ? "12px" : "14px",
                    height: windowWidth <= 768 ? "12px" : "14px",
                    borderRadius: "3px",
                    background: item.color,
                    border: "1px solid rgba(0,0,0,0.15)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AskAI onApplyAiResult={handleAiResult} contextData={aiContext} />

      <img
        src={contactBtn}
        alt="Contact"
        data-ui="true"
        style={{
          position: "fixed",
          bottom: windowWidth <= 768 ? "10px" : "20px",
          right: "20px",
          width: "100px",
          height: "auto",
          zIndex: 1500,
          pointerEvents: "auto",
          borderRadius: windowWidth <= 768 ? "20px" : "28px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.6)",
          cursor: "pointer",
        }}
        onClick={() => (window.location.href = "https://www.hasirufarms.com/contact")}
      />

      <img
        src={compass}
        alt="compass"
        data-ui="true"
        style={{
          position: "fixed",
          bottom: windowWidth <= 768 ? "10px" : "20px",
          left: "20px",
          width: windowWidth <= 768 ? "60px" : "80px",
          height: "auto",
          zIndex: 1500,
          pointerEvents: "auto",
          borderRadius: windowWidth <= 768 ? "20px" : "28px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.6)",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          padding: "10px",
        }}
      />

      <div
        data-ui="true"
        style={{
          position: "fixed",
          bottom: windowWidth <= 768 ? "10px" : "20px",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "10px",
          color: "white",
          padding: "8px 10px",
          borderRadius: "5px",
          width: "200px",
          textAlign: "center",
          zIndex: 1500,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Plot Map V26.1
        <img
          src="./luminexaLogo.png"
          alt="logo"
          style={{ width: "50%", marginTop: "4px" }}
        />
      </div>

      {selectedPlotId && (
        <PlotPanel
          selectedPlotId={selectedPlotId}
          selectedPlotData={selectedPlotData}
          panelLoading={panelLoading}
          closePlotPanel={closePlotPanel}
          windowWidth={windowWidth}
        />
      )}

      <style>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(20px);
          }
          70% {
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
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