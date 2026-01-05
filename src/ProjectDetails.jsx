import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./ProjectDetails.css";
import forestTreeIcon from "./assets/forest-tree-icon.svg";
import fruitTreeIcon from "./assets/fruit-tree-icon.svg";
import mapIcon from "./assets/close.svg";
import status from "./assets/status.svg";
import noTreesIcon from "./assets/no-tree-icon.png";
import PaymentHandler from "./PaymentHandler";

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [activeTreeType, setActiveTreeType] = useState(null);
  const [plotStatus, setPlotStatus] = useState("Loading...");

  // Fetch plot data from Firestore
  useEffect(() => {
    const fetchPlotData = async () => {
      try {
        const plotRef = doc(db, "plots", projectId);
        const plotSnap = await getDoc(plotRef);

        if (plotSnap.exists()) {
          const selectedPlot = { projectId: plotSnap.id, ...plotSnap.data() };
          const totalForestTrees = Object.values(selectedPlot.NumberOfForestTrees || {}).reduce(
            (sum, val) => sum + val, 0
          );
          const totalFruitTrees =
            Object.values(selectedPlot.NumberOfFruitTrees || {}).reduce((sum, val) => sum + val, 0) +
            (selectedPlot.coconutTree || 0);

          setPlotData({
            id: selectedPlot.projectId,
            blockName: selectedPlot.blockName,
            plotName: selectedPlot.plotNumber,
            facing: selectedPlot.facing || "Not Specified",
            surveyNumber: selectedPlot.SurveyNumber,
            areaSqMt: selectedPlot.AreaSqMt,
            areaSqFt: selectedPlot.AreaSqFt,
            areaGuntas: selectedPlot.AreaGuntas,
            lengthFt: selectedPlot.lengthFt,
            widthFt: selectedPlot.widthFt,
            documnetLink: selectedPlot.documnetLink,
            numberOfForestTrees: totalForestTrees,
            numberOfFruitTrees: totalFruitTrees,
            coconutTree: selectedPlot.coconutTree || 0,
            fruitTrees: selectedPlot.NumberOfFruitTrees || {},
            forestTrees: selectedPlot.NumberOfForestTrees || {},
          });
          setSelectedPlot(selectedPlot.projectId);
          setPlotStatus(selectedPlot.Status || "Not Available");
        } else {
          setPlotData({
            id: projectId,
            plotName: `Plot ${projectId.split("-")[1]} (Data Not Available)`,
          });
          setPlotStatus("Not Available");
        }
      } catch (error) {
        console.error("Error fetching plot data from Firestore:", error);
        setPlotData({
          id: projectId,
          plotName: `Plot ${projectId.split("-")[1]} (Data Not Available)`,
        });
        setPlotStatus("Error");
      } finally {
        setLoading(false);
      }
    };

    fetchPlotData();
  }, [projectId]);

  const closePopup = () => {
    setSelectedPlot(null);
    setActiveTreeType(null);
    navigate("/");
  };

  const toggleTreeDetails = (type) => {
    setActiveTreeType(activeTreeType === type ? null : type);
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "sold": return "status-sold";
      case "booked": return "status-booked";
      case "available": return "status-available";
      default: return "status-default";
    }
  };

if (loading) {
  return (
    <div className="project-details-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '25px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
        <div
          style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #024837',
            borderRadius: '50%',
            width: '25px',
            height: '25px',
            animation: 'spin 1s linear infinite',
            marginBottom: '10px'
          }}
        ></div>
        <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', color: '#333' }}>Loading...</span>
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

  return (
    <div className="project-details-container">
      {selectedPlot && plotData ? (
        <div className="popup" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="header-row">
              <h3>{plotData.blockName}</h3>
              <span className="facing">Facing {plotData.facing} ^ </span>
            </div>
            <div className="popup-columns">
              <div className="column column-plot-number">
                <div className={`plot-number-box`}>{plotData.plotName}</div>
                <div className={`status-bar ${getStatusClass(plotStatus)}`}>
                  <span>
                    <img src={status} className="status-icon" alt="status" />
                    Status: {plotStatus}
                  </span>
                </div>
              </div>
              <div className="column column-details">
                <div className="detail-card">
                  Survey Number
                  <span className="detail-value">{plotData.surveyNumber}</span>
                </div>
                <div className="detail-card">
                  Area in Sq. Ft
                  <span className="detail-value">{plotData.areaSqFt}</span>
                </div>
                <div className="detail-card">
                  Width
                  <span className="detail-value">{plotData.widthFt}</span>
                  Length
                  <span className="detail-value">{plotData.lengthFt}</span>
                </div>
                <div className="detail-card">
                  Area in Guntas
                  <span className="detail-value">{plotData.areaGuntas}</span>
                </div>
              </div>
              <div className="column column-trees">
                <h4>Total Trees in the Site: 50+</h4>
                {plotData.numberOfForestTrees + plotData.numberOfFruitTrees === 0 ? (
                  <div className="no-trees-container">
                    <img src={noTreesIcon} alt="No Trees" className="no-trees-icon" />
                    <p>Join Us in Planting Trees</p>
                  </div>
                ) : (
                  <>
                    <div className="tree-icons-row">
                      <img
                        src={forestTreeIcon}
                        alt="Forest Trees"
                        className="tree-icon"
                        onClick={() => toggleTreeDetails("forest")}
                      />
                      <img
                        src={fruitTreeIcon}
                        alt="Fruit Trees"
                        className="tree-icon"
                        onClick={() => toggleTreeDetails("fruit")}
                      />
                    </div>
                    <div className="tree-type-row">
                      <span className="t1">Forest: {plotData.numberOfForestTrees}</span>
                      <span className="t1">Fruit: {plotData.numberOfFruitTrees}</span>
                    </div>
                    <div className="dynamic-tree-box">
                      {activeTreeType && (
                        <div className="tree-details">
                          {activeTreeType === "forest" ? (
                            Object.entries(plotData.forestTrees).map(([type, count]) =>
                              count > 0 && (
                                <div key={type} className="tree-item">
                                  <img src={forestTreeIcon} alt={type} className="small-icon" />
                                  <span>
                                    {type}: {count}
                                  </span>
                                </div>
                              )
                            )
                          ) : (
                            <>
                              <div className="tree-item">
                                <img src={fruitTreeIcon} alt="Coconut" className="small-icon" />
                                <span>Coconut: {plotData.coconutTree}</span>
                              </div>
                              {Object.entries(plotData.fruitTrees).map(([type, count]) =>
                                count > 0 && (
                                  <div key={type} className="tree-item">
                                    <img src={fruitTreeIcon} alt={type} className="small-icon" />
                                    <span>
                                      {type}: {count}
                                    </span>
                                  </div>
                                )
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="footer-row">
  {(() => {
    const plotNumber = parseInt(plotData.plotName.replace(/\D/g, ""), 10);
    const isRestricted = plotNumber >= 49 && plotNumber <= 71;
    return !isRestricted;
  })() && (
    <PaymentHandler
      plotData={plotData}
      plotStatus={plotStatus}
      projectId={projectId}
      setPlotStatus={setPlotStatus}
      closeParentPopup={closePopup}
    />
  )}
  <div className="home-button" onClick={closePopup}>
    <img
      src={mapIcon}
      alt="Map"
      style={{ width: "60px", height: "60px", marginRight: "20px" }}
    />
  </div>
</div>
          </div>
        </div>
      ) : (
        <div>No detailed data available for this plot.</div>
      )}
    </div>
  );
};

export default ProjectDetails;
