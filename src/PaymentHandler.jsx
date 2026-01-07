import React, { useEffect, useState, useRef } from "react";
import { collection, addDoc, updateDoc, doc, getDoc, runTransaction, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import jsPDF from "jspdf";


const PaymentHandler = ({ plotData, plotStatus, projectId, setPlotStatus, closeParentPopup }) => {
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showConfirmationSection, setShowConfirmationSection] = useState(false);
  const [showErrorSection, setShowErrorSection] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [documentLink, setDocumentLink] = useState(""); // New state for document link
  const [formData, setFormData] = useState({
    name: auth.currentUser?.displayName || "",
    email: auth.currentUser?.email || "",
    _level: "L2",
    mobileNumber: auth.currentUser?.phoneNumber || "",
    dealClosedAmount: "",
    advanceAmount: "",
    note: "",
    termsAgreed: false,
    privacyAgreed: false,
  });
  const timeoutIdRef = useRef(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      setRazorpayLoaded(false);
      setErrorMessage("Failed to load payment gateway. Please try again later.");
      setShowBookingPopup(true);
      setShowErrorSection(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // Fetch document link from "raagaDocument" collection
  useEffect(() => {
    const fetchDocumentLink = async () => {
      try {
        const q = query(
          collection(db, "raagaDocument"),
          where("plotDocId", "==", projectId) // e.g., "plot-1"
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setDocumentLink(docData.plotSurveyDocumentLink || "");
        } else {
          console.warn("No document found for plotDocId:", projectId);
          setDocumentLink("");
        }
      } catch (error) {
        console.error("Error fetching document link:", error);
        setDocumentLink("");
      }
    };

    if (projectId && showBookingPopup) {
      fetchDocumentLink();
    }
  }, [projectId, showBookingPopup]);

  const handleBookNow = async () => {
    if (plotStatus.toLowerCase() !== "available") {
      setErrorMessage("This plot is not available for booking.");
      setShowBookingPopup(true);
      setShowErrorSection(true);
      return;
    }
    setShowBookingPopup(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setValidationError("");
  };

  const generateBookingNumber = () => {
    const prefix = "RAAGA";
    const now = new Date();
    const timePart = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
    const random = Math.floor(Math.random() * 10);
    return `${prefix}${timePart}${random}`;
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setValidationError("");
    if (!razorpayLoaded || !window.Razorpay) {
      setErrorMessage("Payment gateway failed to load. Please try again later.");
      setShowErrorSection(true);
      return;
    }
    if (!formData.termsAgreed || !formData.privacyAgreed) {
      setValidationError("Please agree to the Terms and Conditions and Privacy Policy.");
      return;
    }
    if (!formData.name || !formData.email || !formData.mobileNumber || !formData.dealClosedAmount || !formData.advanceAmount) {
      setValidationError("Please fill in all required fields, including Deal Closed Amount and Advance Amount.");
      return;
    }
    const advanceAmountNum = parseFloat(formData.advanceAmount);
    if (isNaN(advanceAmountNum) || advanceAmountNum < 50000 || advanceAmountNum > 500000) {
      setValidationError("Advance Amount must be between ₹50,000 and ₹5,00,000.");
      return;
    }
    setShowConfirmationSection(true);
    setShowErrorSection(false);
  };

  const sendConfirmationEmail = async (email, name, bookingNumber, plotName, blockName, dealClosedAmount, advanceAmount, note, documentLink) => {
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          bookingNumber,
          plotName,
          blockName,
          dealClosedAmount,
          advanceAmount,
          note,
          documentLink,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Failed to send email:', result.error);
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  };

  const revertPlotStatus = async () => {
    try {
      await updateDoc(doc(db, "mapplots", projectId), {
        Status: "Available",
      });
      setPlotStatus("Available");
    } catch (error) {
      console.error("Error reverting plot status:", error);
    }
  };

  const handleConfirmDetails = async () => {
    setIsPaymentProcessing(true);
    setShowBookingPopup(false);
    const bookingNumber = generateBookingNumber();

    try {
      let canProceed = false;
      let userDocRef;
      await runTransaction(db, async (transaction) => {
        const plotRef = doc(db, "mapplots", projectId);
        const plotSnap = await transaction.get(plotRef);

        if (!plotSnap.exists()) {
          throw new Error("Plot does not exist.");
        }

        const currentStatus = plotSnap.data().Status?.toLowerCase();
        if (currentStatus !== "available") {
          throw new Error("Plot is not available for booking.");
        }

        transaction.update(plotRef, {
          Status: "Booking",
          bookingTimestamp: new Date().toISOString(),
        });

        userDocRef = await addDoc(collection(db, "users"), {
          userId: auth.currentUser?.uid || "anonymous",
          name: formData.name,
          email: formData.email,
          mobileNumber: formData.mobileNumber,
          dealClosedAmount: parseFloat(formData.dealClosedAmount) || 0,
          advanceAmount: parseFloat(formData.advanceAmount) || 0,
          note: formData.note,
          plotOwned: plotData.plotName,
          communityName: plotData.blockName,
          bookingNumber,
          paymentStatus: "Pending",
          createdAt: serverTimestamp(),
        });

        canProceed = true;
      });

      if (!canProceed) {
        throw new Error("Plot is not available for booking.");
      }

      timeoutIdRef.current = setTimeout(async () => {
        await revertPlotStatus();
        await updateDoc(doc(db, "users", userDocRef.id), {
          paymentStatus: "Failed",
        });
      }, 10 * 60 * 1000);

      const createOrderResponse = await fetch('/.netlify/functions/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(formData.advanceAmount),
      }),
    });

    if (!createOrderResponse.ok) {
      throw new Error('Failed to create Razorpay order');
    }

    const { order_id } = await createOrderResponse.json();

      const options = {
        key : process.env.REACT_APP_RAZORPAY_KEY,
        amount: parseFloat(formData.advanceAmount) * 100,
        currency: "INR",
        name: "Hasiru Farms Enterprises Pvt Ltd",
        description: `Advance payment for Plot ${plotData?.plotName || projectId}`,
        order_id: order_id,
        handler: async (response) => {
          setIsPaymentProcessing(false);
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
          }

          try {
            await updateDoc(doc(db, "users", userDocRef.id), {
              paymentStatus: "success",
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            });

            await updateDoc(doc(db, "mapplots", projectId), {
              Status: "Booked",
            });

            const invoiceData = {
              bookingId: userDocRef.id,
              bookingNumber,
              emailId: formData.email,
              mobileNumber: formData.mobileNumber,
              dealClosedAmount: parseFloat(formData.dealClosedAmount) || 0,
              advanceAmount: parseFloat(formData.advanceAmount) || 0,
              note: formData.note,
              name: formData.name,
              email: formData.email,
              plotNo: plotData.plotName,
              projectName: plotData.blockName,
              status: "success",
              BookingStatus: "Booking Successful",
              timestamp: new Date().toISOString(),
            };
            await addDoc(collection(db, "invoices"), invoiceData);

            await sendConfirmationEmail(
              formData.email,
              formData.name,
              bookingNumber,
              plotData.plotName,
              plotData.blockName,
              formData.dealClosedAmount,
              formData.advanceAmount,
              formData.note,
              documentLink // Updated: from raagaDocument
            );

            setBookingDetails({
              bookingId: userDocRef.id,
              bookingNumber,
              advanceAmount: parseFloat(formData.advanceAmount) || 0,
              dealClosedAmount: parseFloat(formData.dealClosedAmount) || 0,
              note: formData.note,
              email: formData.email,
              mobileNumber: formData.mobileNumber,
            });
            setShowConfirmationSection(false);
            setShowConfirmation(true);
            setPlotStatus("Booked");
          } catch (error) {
            console.error("Error processing successful payment:", error);
            await revertPlotStatus();
            await updateDoc(doc(db, "users", userDocRef.id), {
              paymentStatus: "Failed",
            });
            setIsPaymentProcessing(false);
            setErrorMessage("Payment successful, but failed to save data. Please contact support.");
            setShowBookingPopup(true);
            setShowConfirmationSection(false);
            setShowErrorSection(true);
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.mobileNumber,
        },
        notes: {
          plotId: projectId,
          bookingNumber,
          dealClosedAmount: formData.dealClosedAmount,
          advanceAmount: formData.advanceAmount,
          projectName: plotData.projectName,
          note: formData.note,
        },
        theme: {
          color: "#024837",
        },
        modal: {
          ondismiss: async () => {
            setIsPaymentProcessing(false);
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
            }

            try {
              await updateDoc(doc(db, "users", userDocRef.id), {
                paymentStatus: "Failed",
              });

              await revertPlotStatus();

              const invoiceData = {
                bookingId: userDocRef.id,
                bookingNumber,
                emailId: formData.email,
                mobileNumber: formData.mobileNumber,
                dealClosedAmount: parseFloat(formData.dealClosedAmount) || 0,
                advanceAmount: parseFloat(formData.advanceAmount) || 0,
                note: formData.note,
                name: formData.name,
                plotNo: plotData.plotName,
                projectName: plotData.blockName,
                status: "Failed",
                BookingStatus: "Booking Failed",
                timestamp: new Date().toISOString(),
              };
              await addDoc(collection(db, "invoices"), invoiceData);

              setErrorMessage("Payment was canceled. You can try again or return to the plot page.");
              setShowBookingPopup(true);
              setShowConfirmationSection(false);
              setShowErrorSection(true);
            } catch (error) {
              console.error("Error processing payment cancellation:", error);
              setErrorMessage("Failed to process cancellation. Please contact support.");
              setShowBookingPopup(true);
              setShowConfirmationSection(false);
              setShowErrorSection(true);
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.Failed", async (response) => {
        setIsPaymentProcessing(false);
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }

        try {
          await updateDoc(doc(db, "users", userDocRef.id), {
            paymentStatus: "Failed",
          });

          await revertPlotStatus();

          const invoiceData = {
            bookingId: userDocRef.id,
            bookingNumber,
            emailId: formData.email,
            mobileNumber: formData.mobileNumber,
            dealClosedAmount: parseFloat(formData.dealClosedAmount) || 0,
            advanceAmount: parseFloat(formData.advanceAmount) || 0,
            note: formData.note,
            name: formData.name,
            plotNo: plotData.plotName,
            projectName: plotData.blockName,
            status: "Failed",
            BookingStatus: "Booking Failed",
            timestamp: new Date().toISOString(),
          };
          await addDoc(collection(db, "invoices"), invoiceData);

          setErrorMessage(
            response.error.description || "Payment failed due to an unknown error."
          );
          setShowBookingPopup(true);
          setShowConfirmationSection(false);
          setShowErrorSection(true);
        } catch (error) {
          console.error("Error processing failed payment:", error);
          setErrorMessage(
            "Payment failed and could not update status. Please contact support."
          );
          setShowBookingPopup(true);
          setShowConfirmationSection(false);
          setShowErrorSection(true);
        }
      });
      rzp.open();
    } catch (error) {
      setIsPaymentProcessing(false);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      console.error("Error initiating payment:", error);
      setErrorMessage(error.message || "Failed to initiate payment. Plot may not be available.");
      setShowBookingPopup(true);
      setShowConfirmationSection(false);
      setShowErrorSection(true);
    }
  };

  const handlePhoneClick = () => {
    window.location.href = "tel:+911234567890";
  };

  const handleRetryBooking = async () => {
    try {
      const plotRef = doc(db, "mapplots", projectId);
      const plotSnap = await getDoc(plotRef);
      if (!plotSnap.exists() || plotSnap.data().Status?.toLowerCase() !== "available") {
        setErrorMessage("Plot is not available for booking.");
        setShowErrorSection(true);
        return;
      }
      setShowErrorSection(false);
      setFormData((prev) => ({
        ...prev,
        termsAgreed: false,
        privacyAgreed: false,
        dealClosedAmount: "",
        advanceAmount: "",
        note: "",
      }));
    } catch (error) {
      console.error("Error checking plot status on retry:", error);
      setErrorMessage("Failed to verify plot availability. Please try again later.");
      setShowErrorSection(true);
    }
  };

  const handleReturnToPlotPage = () => {
    setShowBookingPopup(false);
    closeParentPopup();
  };

  const generateReceiptPDF = async () => {
    let y = 40;
    const lineHeight = 5;

    const doc = new jsPDF();
    const logoImageUrl = 'https://raw.githubusercontent.com/param-fsd/blog-ps/main/frontend/src/assets/hasirulogo.png';
    doc.addImage(logoImageUrl, 'PNG', 93, 10, 33, 15);

    doc.setFontSize(12);
    doc.setFont("Helvetica", "bold");
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`, 20, y);
    y += lineHeight;
    doc.text(`Booking Number: ${bookingDetails.bookingNumber}`, 20, y);
    y += lineHeight + 5;

    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    const paragraph = `We, Hasiru Farms Enterprises, have received an advance payment of Rs.${bookingDetails.advanceAmount}/-, on ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')} and from ${formData.name}. This payment is for the sale of a managed farm land plot, in the project ${plotData.blockName}, which is developed and maintained under the name "HASIRU FARMS ENTERPRISES PVT LTD."

The plot measures tentatively ${plotData.areaGuntas} Square Feet in Survey Number ${plotData.surveyNumber} & Plot Number is ${plotData.plotName}.

The agreed sale price of the land is Rs.${formData.dealClosedAmount}/-, excluding the registration and other government charges. The agreed annual maintenance cost of the land is Rs.4/- per square feet, resulting in a value of Rs.39,422/-.`;
    const splitParagraph = doc.splitTextToSize(paragraph, 178);
    doc.text(splitParagraph, 20, y);
    y += splitParagraph.length * 4 + 10;

    doc.setFont("Helvetica", "bold");
    doc.text("Details of Purchaser/Buyer/Customer/Applicant :", 20, y); y += lineHeight;
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.text(`Name: ${formData.name}`, 20, y); y += lineHeight;
    doc.text(`Email: ${formData.email}`, 20, y); y += lineHeight;
    doc.text(`Mobile Number: ${bookingDetails.mobileNumber}`, 20, y); y += 5 + lineHeight;

    const noteText = `Note: ${bookingDetails.note || 'N/A'}`;
    const splitNote = doc.splitTextToSize(noteText, 165);
    doc.setFont("Helvetica", "italic", "bold");
    doc.text(splitNote, 20, y);
    y += splitNote.length * 5 + lineHeight;


    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("Additional Note:", 20, y);
    y += 6;
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    const additionalNotes = [
      "1. Additional of 1,00,000/- should be paid while applying for 11E Sketch for each plot",
      "2. The above mentioned plot size is tentatively measured. The actual measurement shall be given post the 11E Sketch and the different amount may or may not be calculated accordingly as per sqft mentioned.",
      "3. Registration charges of 7.65% on total sale consideration.",
      "4. Additional charges for Club house membership shall be Rs.20/- per sqft.",
      "5. Additional Charges for Miscellaneous Charges towards Pre and Post Registration- 49000/-"
    ];
    additionalNotes.forEach(note => {
      const splitText = doc.splitTextToSize(note, 175);
      doc.text(splitText, 20, y);
      y += splitText.length * lineHeight;
    });
    y += 9 + lineHeight;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Hasiru Farms Enterprises Pvt. Ltd.", 80, 272);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("#1139, Maruthi Complex, 2nd Floor, BEML Layout, RR Nagar, Bengaluru, Karnataka 560098", 38, 275);
    doc.setFontSize(9);
    doc.text("booking@hasirufarms.com | www.hasirufarms.com", 68, 278);

    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("Terms & Conditions:", 20, y); y += 6;
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    const terms = [
      "1. The Applicant(s) have submitted this application to request the allotment of a Unit in the afore mentioned Project. HASIRU FARMS ENTERPRISES PVT LTD retains the right to either allot or reject the requested unit based on its availability.",
      "2. The applicant(s) confirm they have visited and inspected the project, understood the development plan, and acknowledge the phased progress in the vicinity.",
      "3. If the applicant(s) fail to execute the Sale Agreement, HASIRU FARMS ENTERPRISES PVT LTD may revise unit prices or cancel the unit(s).",
      "4. The Applicant(s) must sign the Sale Agreement within 30 days (35 days including a 5-day buffer) from allotment, including 15 days for legal due diligence. Failure to execute within this period implies acceptance of the terms, and the Applicant(s) must pay the unit’s market value at the time of execution.",
      "5. After receiving 70% of the agreed Sale Consideration amount mentioned in the Payment Schedule, HASIRU FARMS ENTERPRISES PVT LTD will process this application by executing a Sale Agreement. The Applicant(s) will be responsible for paying the applicable stamp duty for registrations.",
      "6. In the event that the Applicant(s) initiates a cancellation after the completion of legal due diligence, HASIRU FARMS ENTERPRISES PVT LTD will retain 30% of the booking amount, provided that the legal due diligence report reveals no discrepancies. However, if the cancellation is initiated by the Applicant(s) within 15 days from the date of booking, HASIRUFARMS ENTERPRISES will refund the entire booking amount.",
      "7. If the applicant(s) fail to execute the Sale Agreement within 45 days of application, HASIRU FARMS ENTERPRISES PVT LTD may cancel the unit. This will result in forfeiture of 30% of the booking amount as cancellation charges, along with interest for any delayed payment. The applicant(s) remain liable for all taxes, duties, and statutory levies, which are non-refundable.",
      "8. If the Sale Agreement is not executed within thirty-five days from the date of this application and there is a reasonable postponement after discussing with HASIRU FARMS ENTERPRISES PVT LTD, the completion date of the project will be determined based on the date when the Sale Agreement is eventually executed.",
      "9. The Applicant(s) acknowledge and agree that they are entitled to leave Seven-Ten feet from their property boundary towards the road as an Easementary right. The Applicant(s) further confirm that they are fully aware of this condition and accept it as part of the overall project development guidelines.",
      "10. The applicant(s) acknowledge that the allotment letter provided by HASIRU FARMS ENTERPRISES PVT LTD is provisional and will only become final once the applicant(s) execute the Sale Agreement and strictly adhere to the payment schedule without any delays or defaults.",
      "11. The applicant(s) acknowledge that any transfer or reassignment of the unit requires the prior approval of HASIRU FARMS ENTERPRISES PVT LTD. The request from the applicant(s) to switch from one unit to another, whether within the same project or a different project, will be evaluated and decided upon solely at the discretion of HASIRU FARMS ENTERPRISES PVT LTD.",
      "12. HASIRU FARMS ENTERPRISES PVT LTD shall not be responsible for any funds transferred to employees or as directed by them unless officially confirmed. A receipt must be obtained for every transaction. For any issues, please email: grievance@hasirufarms.com, booking@hasirufarms.com"
    ];

    terms.forEach(term => {
      const splitText = doc.splitTextToSize(term, 175);
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText, 20, y);
      y += splitText.length * 4;
    });

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Hasiru Farms Enterprises Pvt. Ltd.", 80, 272);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("#1139, Maruthi Complex, 2nd Floor, BEML Layout, RR Nagar, Bengaluru, Karnataka 560098", 38, 275);
    doc.setFontSize(9);
    doc.text("booking@hasirufarms.com | www.hasirufarms.com", 68, 278);

    doc.save(`Receipt_${bookingDetails.bookingNumber}.pdf`);
  };

  return (
    <>
      {/* Payment Processing Overlay */}
      {isPaymentProcessing && (
        <div
          className="payment-processing-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="payment-processing-section"
            style={{
              textAlign: 'center',
              padding: '20px',
              background: 'white',
              borderRadius: '10px',
            }}
          >
            <div
              className="circular-loader"
              style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #024837',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px',
              }}
            ></div>
            <h4>Payment is Processing</h4>
            <p>Please wait while we process your payment...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      {plotStatus.toLowerCase() === "available" && (
        <div className="smallText">
          <p>
 <strong><i class="fa fa-leaf" aria-hidden="true"></i> Reserve your dream farm plot today!</strong>

</p>

        </div>
      )}

      {plotStatus.toLowerCase() === "available" ? (
        <div
          className="book-now-button"
          onClick={handleBookNow}
          title={plotStatus.toLowerCase() === "available" ? "Click to book this plot" : "Plot not available"}
        >
          <i className="fas fa-book book-now-icon" style={{ marginRight: "8px", transition: "transform 0.2s" }} />
          {plotStatus.toLowerCase() === "available" ? "ReserveNow" : "Plot Unavailable"}
          {plotStatus.toLowerCase() === "available" && (
            <span
              className="badge"
              style={{
                marginLeft: "8px",
                background: "none",
                border: '2px dotted #f5fde9',
                color: "#f5fde9",
                padding: "8px 8px",
                borderRadius: "15px",
                fontSize: "12px",
              }}
            >
              <strong>Available</strong>
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="contact-support">
            <span><strong>Need Support:</strong></span>
            <button onClick={handlePhoneClick} className="contacts-button">
              <strong><i className="fas fa-envelope"></i> booking@hasirufarms.com</strong>
            </button>
          </div>
          <div className="not-available">Currently Unavailable</div>
        </>
      )}

      {showBookingPopup && !isPaymentProcessing && (
        <div className="booking-popup" onClick={() => setShowBookingPopup(false)}>
          <div className="booking-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="booking-popup-columns">
              <div className="booking-column booking-info">
                <img
                  src="./logo36.png"
                  alt="Hasiru Farms Logo"
                  className="company-logo"
                  style={{ maxWidth: "180px", marginBottom: "20px", alignItems: 'flex-start' }}
                />
                <h4 className="booking info-item"><i className="fas fa-check-circle"></i> Plot Details, Please Ensure.</h4>
                <div className="info-item">Project Name: <strong>{plotData.blockName}</strong></div>
                <div className="info-item">Plot Number: <strong>{plotData.plotName}</strong></div>
                <div className="info-item">Survey Number: <strong>{plotData.surveyNumber}</strong></div>
                <div className="info-item">Area (Guntas): <strong>{plotData.areaGuntas}</strong></div>
                <h4 className="booking"><i className="fas fa-credit-card"></i> INR ₹{formData.advanceAmount}</h4>
                <div className="payment-methods">
                  <p>Accepted Payment Methods</p>
                  <div className="payment-icons">
                    <i className="fab fa-cc-visa" style={{ fontSize: "24px", marginRight: "10px" }}></i>
                    <i className="fab fa-cc-mastercard" style={{ fontSize: "24px", marginRight: "10px" }}></i>
                    <i className="fa-brands fa-google-pay" style={{ fontSize: "24px", marginRight: "10px" }}></i>
                    <i className="fab fa-cc-amex" style={{ fontSize: "24px" }}></i>
                  </div>
                  <p className="secure-note">
                    <i className="fas fa-lock" style={{ marginRight: "5px" }}></i>
                    This is a secure and safe payment gateway powered by Razorpay | Hasiru Farms Enterprises Pvt Ltd.
                  </p>
                </div>
              </div>
              <div className="booking-column booking-form">
                {showErrorSection ? (
                  <div className="error-section">
                    <h4><i className="fas fa-exclamation-circle" style={{ color: '#d32f2f' }}></i> Payment Error</h4>
                    <div className="error-details">
                      <p style={{ fontSize: '15px' }}>{errorMessage}</p>
                      <p style={{ fontSize: '12px' }}>
                        For assistance, contact our support team at{' '}
                        <a href="mailto:booking@hasirufarms.com">booking@hasirufarms.com</a> or{' '}
                      </p>
                    </div>
                    <div className="form-buttons" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        className="retry-button"
                        onClick={handleRetryBooking}
                        style={{
                          padding: '20px 30px',
                          background: '#024837',
                          color: 'white',
                          border: 'none',
                          borderRadius: '18px',
                          cursor: 'pointer',
                        }}
                      >
                        Retry
                      </button>
                      <button
                        className="return-button"
                        onClick={handleReturnToPlotPage}
                        style={{
                          padding: '20px 30px',
                          background: '#f5f7e9',
                          color: 'black',
                          border: '1px dotted black',
                          borderRadius: '18px',
                          cursor: 'pointer',
                        }}
                      >
                        Return to Map
                      </button>
                    </div>
                  </div>
                ) : showConfirmationSection ? (
                  <div className="confirmation-section">
                    <h4><i className="fas fa-info-circle"></i> Confirm Your Details</h4>
                    <p>Please verify the information below before proceeding to payment.</p>
                    <div
                      className="confirmation-details"
                      style={{
                        padding: '10px',
                        border: '2px dotted #024837',
                        borderRadius: '26px',
                        marginBottom: '20px',
                      }}
                    >
                      <p style={{ margin: '5px 0', color: 'black' }}>
                        Name: <strong>{formData.name}</strong>
                      </p>
                      <p style={{ margin: '5px 0', color: 'black' }}>
                        Email: <strong>{formData.email}</strong>
                      </p>
                      <p style={{ margin: '5px 0', color: 'black' }}>
                        Mobile Number: <strong>{formData.mobileNumber}</strong>
                      </p>
                      <p style={{ margin: '5px 0', color: 'black' }}>
                        Deal Closed Amount: <strong>₹{formData.dealClosedAmount}</strong>
                      </p>
                      <p style={{ margin: '5px 0', color: 'black' }}>
                        Advance Amount: <strong>₹{formData.advanceAmount}</strong>
                      </p>
                      <p style={{ margin: '5px 0', color: 'black' }}>
                        Note: <strong>{formData.note || 'N/A'}</strong>
                      </p>
                    </div>
                    <div className="form-buttons" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        className="confirm-button"
                        onClick={handleConfirmDetails}
                        style={{
                          padding: '10px 20px',
                          background: '#024837',
                          color: 'white',
                          border: 'none',
                          borderRadius: '18px',
                          cursor: 'pointer',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        className="edit-button"
                        onClick={() => setShowConfirmationSection(false)}
                        style={{
                          padding: '10px 20px',
                          background: '#f5f7e9',
                          color: 'black',
                          border: '1px dotted black',
                          borderRadius: '18px',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h4>Enter Information</h4>
                    {validationError && (
                      <div
                        className="validation-error"
                        style={{
                          color: '#d32f2f',
                          fontSize: '14px',
                          marginBottom: '10px',
                          textAlign: 'center',
                        }}
                      >
                        {validationError}
                      </div>
                    )}
                    <div>
                      <div className="form-group">
                        <input
                          type="text"
                          id="name"
                          name="name"
                          placeholder="Full Name"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="tel"
                          id="mobileNumber"
                          placeholder="Mobile Number"
                          name="mobileNumber"
                          value={formData.mobileNumber}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="email"
                          id="email"
                          placeholder="Email"
                          name="email"
                          value={formData.email}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="number"
                          id="advanceAmount"
                          placeholder="Advance Amount"
                          name="advanceAmount"
                          value={formData.advanceAmount}
                          onChange={handleFormChange}
                          required
                          min="50000"
                          max="500000"
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="number"
                          id="dealClosedAmount"
                          placeholder="Deal Closed Amount (INR)"
                          name="dealClosedAmount"
                          value={formData.dealClosedAmount}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <textarea
                          style={{
                            borderRadius: "10px",
                            fontSize: "14px",
                            padding: "8px",
                            border: "1px solid #ccc",
                          }}
                          id="note"
                          placeholder="Note"
                          name="note"
                          value={formData.note}
                          onChange={handleFormChange}
                          rows="4"
                        />
                      </div>
                      <div className=" checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            name="termsAgreed"
                            checked={formData.termsAgreed}
                            onChange={handleFormChange}
                          />
                          I agree to the Terms and Conditions
                        </label>
                      </div>
                      <div className="checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            name="privacyAgreed"
                            checked={formData.privacyAgreed}
                            onChange={handleFormChange}
                          />
                          I agree to the Refund Policy
                        </label>
                      </div>
                      <div className="form-buttons">
                        <button type="submit" className="proceed-button" onClick={handleProceedToPayment}>
                          Proceed to Payment
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setShowBookingPopup(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="confirmation-popup" onClick={closeParentPopup}>
          <div className="confirmation-popup-content" onClick={(e) => e.stopPropagation()}>
            <h3><i className="fas fa-check-circle"></i> Booking Confirmed!</h3>
            <div className="confirmation-details">
              <p style={{ padding: '6px', fontWeight: '600', fontSize: '18px' }}>
                Booking Number: <strong>{bookingDetails.bookingNumber}</strong>
              </p>
              <p>Advance Amount: <strong>₹{bookingDetails.advanceAmount}</strong></p>
              <p>Project Name: <strong>{plotData.blockName}</strong></p>
              <p>Plot Number: <strong>{plotData.plotName}</strong></p>
              <p>
                <strong>{formData.name}</strong> | <strong>{formData.email}</strong>
              </p>
              <p style={{ padding: '6px', fontWeight: '400', border: '2px dotted green', borderRadius: '15px', color: 'green' }}>
                The document has been sent to <strong>{formData.email}</strong> <br /> Please check your inbox.
              </p>
              <p>
                Support: <a href="mailto:booking@hasirufarms.com">booking@hasirufarms.com</a> 
              </p>
            </div>
            <button className="download-receipt-button" onClick={generateReceiptPDF}>
              <i className="fas fa-download"></i> Download Receipt
            </button>
            <button className="download-receipt-button" onClick={closeParentPopup}>
              Back to Home
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentHandler;
