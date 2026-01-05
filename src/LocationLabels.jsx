import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import "./LocationLabel.css";

// Hardcoded tooltips (static)
const tooltips = [
  { name: "Internal Road", coords: "project6BaseCoords", className: "project-8-label", transform: "translate(-50%, -100%)", isBold: true },
  { name: "🛣️ Kanakapura Main Road 3.5KM", coords: "c3", className: "project-5-label" },
  { name: "🌉 Bridge 2", coords: "c18", className: "project-5-label" },
  { name: "🛣️ Towards Sathanur", coords: "c10", className: "project-5-label" },
  { name: "🌉 Bridge 1", coords: "c8", className: "project-5-label" },
  { name: "🏡", coords: "c5", className: "i-label" },
  { name: "🏟️", coords: "c7", className: "i-label" },
];

// Hardcoded plots (hover labels for desktop only)
const plots = [
  { name: "Plot 71", x: 2617, y: 1908, dataKey: "plot-71" },
  { name: "Plot 70", x: 2609, y: 1813, dataKey: "plot-70" },
  { name: "Plot 69", x: 2585, y: 1622, dataKey: "plot-69" },
  { name: "Plot 68", x: 3262.1, y: 2688.9, dataKey: "plot-68" },
  { name: "Plot 67", x: 3245.6, y: 2544.9, dataKey: "plot-67" },
  { name: "Plot 66", x: 3072.3, y: 2625.9, dataKey: "plot-66" },
  { name: "Plot 65", x: 2894.1, y: 2644.3, dataKey: "plot-65" },
  { name: "Plot 64", x: 2714.3, y: 2655.8, dataKey: "plot-64" },
  { name: "Plot 63", x: 2550.9, y: 2663.3, dataKey: "plot-63" },
  { name: "Plot 62", x: 3224.1, y: 2393.7, dataKey: "plot-62" },
  { name: "Plot 61", x: 3047.6, y: 2413.1, dataKey: "plot-61" },
  { name: "Plot 60", x: 2871.0, y: 2432.5, dataKey: "plot-60" },
  { name: "Plot 59", x: 2692.8, y: 2451.0, dataKey: "plot-59" },
  // { name: "Plot 58", x: 2519.6, y: 2468.5, dataKey: "plot-58" },
  { name: "Plot 57", x: 3052.5, y: 2294.5, dataKey: "plot-57" },
  { name: "Plot 56", x: 3031.0, y: 2162.0, dataKey: "plot-56" },
  { name: "Plot 55", x: 2854.5, y: 2214.7, dataKey: "plot-55" },
  { name: "Plot 54", x: 2663.1, y: 2240.2, dataKey: "plot-54" },
  { name: "Plot 53", x: 2484.9, y: 2260.0, dataKey: "plot-53" },
  { name: "Plot 52", x: 2999.7, y: 1995.3, dataKey: "plot-52" },
  { name: "Plot 51", x: 2824.8, y: 2030.8, dataKey: "plot-51" },
  { name: "Plot 50", x: 2633.4, y: 2055.5, dataKey: "plot-50" },
  { name: "Plot 49", x: 2451.9, y: 2080.2, dataKey: "plot-49" },
  { name: "Plot 48", x: 2349.6, y: 1991.2, dataKey: "plot-48" },
  { name: "Plot 47", x: 2326.5, y: 1889.9, dataKey: "plot-47" },
  { name: "Plot 46", x: 2308.4, y: 1778.1, dataKey: "plot-46" },
  { name: "Plot 45", x: 2290.2, y: 1666.1, dataKey: "plot-45" },
  { name: "Plot 44", x: 2272.1, y: 1567.0, dataKey: "plot-44" },
  { name: "Plot 43", x: 2077.4, y: 2015.6, dataKey: "plot-43" },
  { name: "Plot 42", x: 2060.9, y: 1899.8, dataKey: "plot-42" },
  { name: "Plot 41", x: 2042.7, y: 1786.8, dataKey: "plot-41" },
  { name: "Plot 40", x: 2024.6, y: 1667.7, dataKey: "plot-40" },
  { name: "Plot 39", x: 2013.0, y: 1557.7, dataKey: "plot-39" },
  { name: "Plot 38", x: 1856.3, y: 2025.4, dataKey: "plot-38" },
  { name: "Plot 37", x: 1838.1, y: 1911.6, dataKey: "plot-37" },
  { name: "Plot 36", x: 1816.7, y: 1804.8, dataKey: "plot-36" },
  { name: "Plot 35", x: 1801.8, y: 1697.4, dataKey: "plot-35" },
  { name: "Plot 34", x: 1790.3, y: 1581.5, dataKey: "plot-34" },
  { name: "Plot 33", x: 1772.1, y: 1477.7, dataKey: "plot-33" },
  { name: "Plot 32", x: 1750.7, y: 1367.0, dataKey: "plot-32" },
  { name: "Plot 31", x: 1766.3, y: 1475.2, dataKey: "plot-31" },
  { name: "Plot 30", x: 1782.8, y: 1585.2, dataKey: "plot-30" },
  { name: "Plot 29", x: 1797.7, y: 1691.7, dataKey: "plot-29" },
  { name: "Plot 28", x: 1816.7, y: 1798.9, dataKey: "plot-28" },
  { name: "Plot 27", x: 1831.5, y: 1911.6, dataKey: "plot-27" },
  { name: "Plot 26", x: 1644.2, y: 1928.3, dataKey: "plot-26" },
  { name: "Plot 25", x: 1663.2, y: 2053.9, dataKey: "plot-25" },
  { name: "Plot 24", x: 2397.5, y: 2606.6, dataKey: "plot-24" },
  { name: "Plot 23", x: 2264.6, y: 2617.4, dataKey: "plot-23" },
  { name: "Plot 22", x: 2123.6, y: 2632.4, dataKey: "plot-22" },
  { name: "Plot 21", x: 1978.4, y: 2650.0, dataKey: "plot-21" },
  { name: "Plot 17", x: 1770.5, y: 2713.6, dataKey: "plot-17" },
  { name: "Plot 19", x: 1628.7, y: 2724.4, dataKey: "plot-19" },
  { name: "Plot 18", x: 1504.0, y: 2732.9, dataKey: "plot-18" },
  { name: "Plot 15", x: 1754.8, y: 2548.2, dataKey: "plot-15" },
  { name: "Plot 16", x: 1612.1, y: 2564.3, dataKey: "plot-16" },
  { name: "Plot 20", x: 1488.3, y: 2574.2, dataKey: "plot-20" },
  { name: "Plot 14", x: 2329.8, y: 2268.5, dataKey: "plot-14" },
  { name: "Plot 13", x: 2180.5, y: 2290.2, dataKey: "plot-13" },
  { name: "Plot 12", x: 2047.7, y: 2321.9, dataKey: "plot-12" },
  { name: "Plot 11", x: 1921.4, y: 2335.2, dataKey: "plot-11" },
  { name: "Plot 10", x: 1739.9, y: 2351.4, dataKey: "plot-10" },
  { name: "Plot 9", x: 1602.2, y: 2374.5, dataKey: "plot-9" },
  { name: "Plot 8", x: 1472.6, y: 2389.6, dataKey: "plot-8" },
  { name: "Plot 7", x: 2295.2, y: 2103.4, dataKey: "plot-7" },
  { name: "Plot 6", x: 2162.3, y: 2122.4, dataKey: "plot-6" },
  { name: "Plot 5", x: 2013.0, y: 2141.5, dataKey: "plot-5" },
  { name: "Plot 4", x: 1890.1, y: 2164.6, dataKey: "plot-4" },
  { name: "Plot 3", x: 1717.7, y: 2184.5, dataKey: "plot-3" },
  { name: "Plot 2", x: 1582.4, y: 2212.9, dataKey: "plot-2" },
  { name: "Plot 1", x: 1458.6, y: 2235.2, dataKey: "plot-1" },
];

// Hardcoded plot centers
const plotCenters = [
  { id: "plot-1", x: 1528.0, y: 2299.75, alt: "Plot 1" },
  { id: "plot-2", x: 1669.0, y: 2267.0, alt: "Plot 2" },
  { id: "plot-3", x: 1799.75, y: 2256.75, alt: "Plot 3" },
  { id: "plot-4", x: 1965.5, y: 2236.5, alt: "Plot 4" },
  { id: "plot-5", x: 2098.75, y: 2217.0, alt: "Plot 5" },
  { id: "plot-6", x: 2241.0, y: 2194.75, alt: "Plot 6" },
  { id: "plot-7", x: 2375.25, y: 2177.75, alt: "Plot 7" },
  { id: "plot-8", x: 1542.25, y: 2456.25, alt: "Plot 8" },
  { id: "plot-9", x: 1676.75, y: 2455.0, alt: "Plot 9" },
  { id: "plot-10", x: 1830.0, y: 2449.25, alt: "Plot 10" },
  { id: "plot-11", x: 1999.75, y: 2431.25, alt: "Plot 11" },
  { id: "plot-12", x: 2133.5, y: 2386.5, alt: "Plot 12" },
  { id: "plot-13", x: 2280.75, y: 2366.25, alt: "Plot 13" },
  { id: "plot-14", x: 2408.75, y: 2354.0, alt: "Plot 14" },
  { id: "plot-20", x: 1558.5, y: 2648.25, alt: "Plot 20" },
  { id: "plot-16", x: 1691.0, y: 2637.5, alt: "Plot 16" },
  { id: "plot-15", x: 1848.0, y: 2624.5, alt: "Plot 15" },
  { id: "plot-18", x: 1575.5, y: 2805.75, alt: "Plot 18" },
  { id: "plot-19", x: 1708.75, y: 2798.75, alt: "Plot 19" },
  { id: "plot-17", x: 1872.5, y: 2790.75, alt: "Plot 17" },
  { id: "plot-21", x: 2067.5, y: 2753.75, alt: "Plot 21" },
  { id: "plot-22", x: 2199.75, y: 2744.75, alt: "Plot 22" },
  { id: "plot-23", x: 2344.75, y: 2723.75, alt: "Plot 23" },
  { id: "plot-24", x: 2470.0, y: 2728.0, alt: "Plot 24" },
  { id: "plot-25", x: 1766.75, y: 2090.5, alt: "Plot 25" },
  { id: "plot-26", x: 1748.25, y: 1977.75, alt: "Plot 26" },
  { id: "plot-27", x: 1729.0, y: 1864.25, alt: "Plot 27" },
  { id: "plot-28", x: 1713.25, y: 1756.75, alt: "Plot 28" },
  { id: "plot-29", x: 1695.5, y: 1651.75, alt: "Plot 29" },
  { id: "plot-30", x: 1678.5, y: 1543.75, alt: "Plot 30" },
  { id: "plot-31", x: 1660.75, y: 1435.75, alt: "Plot 31" },
  { id: "plot-32", x: 1861.0, y: 1409.25, alt: "Plot 32" },
  { id: "plot-33", x: 1871.0, y: 1517.5, alt: "Plot 33" },
  { id: "plot-34", x: 1888.75, y: 1624.5, alt: "Plot 34" },
  { id: "plot-35", x: 1902.75, y: 1735.75, alt: "Plot 35" },
  { id: "plot-36", x: 1919.25, y: 1848.25, alt: "Plot 36" },
  { id: "plot-37", x: 1935.0, y: 1959.5, alt: "Plot 37" },
  { id: "plot-38", x: 1953.25, y: 2064.0, alt: "Plot 38" },
  { id: "plot-39", x: 2128.25, y: 1613.25, alt: "Plot 39" },
  { id: "plot-40", x: 2145.75, y: 1722.25, alt: "Plot 40" },
  { id: "plot-41", x: 2160.75, y: 1837.0, alt: "Plot 41" },
  { id: "plot-42", x: 2182.25, y: 1947.25, alt: "Plot 42" },
  { id: "plot-43", x: 2196.75, y: 2043.0, alt: "Plot 43" },
  { id: "plot-44", x: 2423.0, y: 1615.8, alt: "Plot 44" },
  { id: "plot-45", x: 2426.5, y: 1712.0, alt: "Plot 45" },
  { id: "plot-46", x: 2442.25, y: 1814.75, alt: "Plot 46" },
  { id: "plot-47", x: 2461.5, y: 1922.0, alt: "Plot 47" },
  { id: "plot-48", x: 2473.25, y: 2009.75, alt: "Plot 48" },
  { id: "plot-49", x: 2553.0, y: 2157.0, alt: "Plot 49" },
  { id: "plot-50", x: 2738.0, y: 2133.75, alt: "Plot 50" },
  { id: "plot-51", x: 2934.6, y: 2117.0, alt: "Plot 51" },
  { id: "plot-52", x: 3108.75, y: 2049.25, alt: "Plot 52" },
  { id: "plot-53", x: 2584.0, y: 2336.0, alt: "Plot 53" },
  { id: "plot-54", x: 2767.0, y: 2342.5, alt: "Plot 54" },
  { id: "plot-55", x: 2953.25, y: 2291.75, alt: "Plot 55" },
  { id: "plot-56", x: 3157.75, y: 2215.25, alt: "Plot 56" },
  { id: "plot-57", x: 3200.25, y: 2304.0, alt: "Plot 57" },
  // { id: "plot-58", x: 2614.5, y: 2567.25, alt: "Plot 58" },
  { id: "plot-59", x: 2791.5, y: 2543.5, alt: "Plot 59" },
  { id: "plot-60", x: 2967.0, y: 2527.25, alt: "Plot 60" },
  { id: "plot-61", x: 3147.5, y: 2516.5, alt: "Plot 61" },
  { id: "plot-62", x: 3332.4, y: 2452.2, alt: "Plot 62" },
  { id: "plot-63", x: 2643.5, y: 2753.0, alt: "Plot 63" },
  { id: "plot-64", x: 2835.75, y: 2749.75, alt: "Plot 64" },
  { id: "plot-65", x: 2989.75, y: 2721.5, alt: "Plot 65" },
  { id: "plot-66", x: 3169.5, y: 2703.0, alt: "Plot 66" },
  { id: "plot-67", x: 3371.5, y: 2600.75, alt: "Plot 67" },
  { id: "plot-68", x: 3398.0, y: 2716.75, alt: "Plot 68" },
   { id: "plot-69", x: 2688.5, y: 1728.5, alt: "Plot 69" },
  { id: "plot-70", x: 2691.5, y: 1850, alt: "Plot 70" },
  { id: "plot-71", x: 2705, y: 1954.75, alt: "Plot 71" },
];

const LocationLabels = ({ labelStyle, getResponsivePosition, coords, onC5Click, onC7Click }) => {
  const [hoveredPlot, setHoveredPlot] = useState(null);
  const [plotStatuses, setPlotStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    const fetchPlotStatuses = async () => {
      try {
        const plotsCollection = collection(db, "plots");
        const plotsSnapshot = await getDocs(plotsCollection);
        const statusMap = plotsSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = data.Status || "Unknown";
          return acc;
        }, {});
        setPlotStatuses(statusMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching plot statuses from Firestore:", error);
        setPlotStatuses({});
        setLoading(false);
      }
    };

    fetchPlotStatuses();
  }, []);

  useEffect(() => {
    if (!isTouchDevice) {
      const areas = document.querySelectorAll("area[data-key^='plot']");

      const handleMouseOver = (e) => {
        const dataKey = e.target.getAttribute("data-key");
        const plot = plots.find((p) => p.dataKey === dataKey);
        if (plot) setHoveredPlot(plot);
      };
      const handleMouseOut = () => setHoveredPlot(null);

      areas.forEach((area) => {
        area.addEventListener("mouseover", handleMouseOver);
        area.removeEventListener("mouseout", handleMouseOut);
      });

      return () => {
        areas.forEach((area) => {
          area.removeEventListener("mouseover", handleMouseOver);
          area.removeEventListener("mouseout", handleMouseOut);
        });
      };
    }
  }, [isTouchDevice]);

  if (loading) {
    return null; // Render nothing while loading
  }

  return (
    <>
      {tooltips.map((tooltip, index) => {
        const coord = coords[tooltip.coords];
        if (!coord) return null;

        return (
          <div
            key={`tooltip-${index}`}
            className={`persistent-tooltip ${tooltip.className}`}
            onClick={(e) => {
              e.stopPropagation();
              if (tooltip.coords === "c5" && onC5Click) onC5Click();
              else if (tooltip.coords === "c7" && onC7Click) onC7Click();
            }}
            style={{
              ...labelStyle,
              ...getResponsivePosition(coord.x, coord.y),
              transform: tooltip.transform || "none",
              border: tooltip.border || "none",
              cursor: tooltip.coords === "c5" || tooltip.coords === "c7" ? "pointer" : "default",
            }}
          >
            {tooltip.isBold ? (
              <strong>
                {tooltip.name}
                {tooltip.description && <span dangerouslySetInnerHTML={{ __html: tooltip.description }} />}
              </strong>
            ) : (
              <>
                {tooltip.name}
                {tooltip.description && <span dangerouslySetInnerHTML={{ __html: tooltip.description }} />}
              </>
            )}
          </div>
        );
      })}

      {!loading &&
        plotCenters.map((plot, index) => {
          const status = plotStatuses[plot.id] || "Unknown";
          if (status === "Available") return null;

          let backgroundColor;
          if (status === "Sold") backgroundColor = "red";
          else if (status === "Booked") backgroundColor = "orange";
          else backgroundColor = "rgba(36, 35, 35, 0.8)";

          return (
            <div
              key={`plot-center-${index}`}
              className="plot-center-label"
              style={{
                ...labelStyle,
                ...getResponsivePosition(plot.x, plot.y),
                transform: "translate(-50%, -50%)",
                fontSize: "4px",
                color: "White",
                backgroundColor: backgroundColor,
                padding: "2px",
                borderRadius: "1px"
              }}
            >
              {`${plot.alt}`}
              <br />
              {`${status}`}
            </div>
          );
        })}

      {!isTouchDevice && hoveredPlot && (
        <div
          className="plot-hover-label"
          style={{
            ...labelStyle,
            ...getResponsivePosition(hoveredPlot.x, hoveredPlot.y),
            transform: "translate(-50%, -50%)",
          }}
        >
          {hoveredPlot.name}
        </div>
      )}
    </>
  );
};

export default LocationLabels;




