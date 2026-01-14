import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
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
  const [documentLink, setDocumentLink] = useState("");

  const [formData, setFormData] = useState({
    _level: "L2",
    dealClosedAmount: "",
    advanceAmount: "",
    note: "",
    termsAgreed: false,
    privacyAgreed: false,
  });

  const timeoutIdRef = useRef(null);

  const currentUser = auth.currentUser;

  // Load Razorpay script
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
      if (document.body.contains(script)) document.body.removeChild(script);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, []);

  // Fetch document link
  useEffect(() => {
    const fetchDocumentLink = async () => {
      try {
        const q = query(collection(db, "raagaDocument"), where("plotDocId", "==", projectId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setDocumentLink(querySnapshot.docs[0].data().plotSurveyDocumentLink || "");
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

  const handleBookNow = () => {
    if (plotStatus.toLowerCase() !== "available") {
      setErrorMessage("This plot is not available for booking.");
      setShowBookingPopup(true);
      setShowErrorSection(true);
      return;
    }
    if (!currentUser) {
      setErrorMessage("Please log in to book a plot.");
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

  const handleProceedToPayment = (e) => {
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

    if (!formData.dealClosedAmount || !formData.advanceAmount) {
      setValidationError("Please fill in all required fields.");
      return;
    }

    const advanceNum = parseFloat(formData.advanceAmount);
    if (isNaN(advanceNum) || advanceNum < 50000 || advanceNum > 500000) {
      setValidationError("Advance Amount must be between ₹50,000 and ₹5,00,000.");
      return;
    }

    setShowConfirmationSection(true);
    setShowErrorSection(false);
  };

  const sendConfirmationEmail = async (email, name, bookingNumber, plotName, blockName, dealClosedAmount, advanceAmount, note, documentLink) => {
    try {
      const response = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (!response.ok) {
        console.error("Failed to send email");
      }
    } catch (error) {
      console.error("Error sending confirmation email:", error);
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
    if (!currentUser) {
      setErrorMessage("Authentication required. Please log in again.");
      setShowErrorSection(true);
      return;
    }

    setIsPaymentProcessing(true);
    setShowBookingPopup(false);
    const bookingNumber = generateBookingNumber();
    const userDocRef = doc(db, "users", currentUser.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const plotRef = doc(db, "mapplots", projectId);
        const plotSnap = await transaction.get(plotRef);

        if (!plotSnap.exists()) {
          throw new Error("Plot does not exist.");
        }

        if (plotSnap.data().Status?.toLowerCase() !== "available") {
          throw new Error("Plot is no longer available.");
        }

        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) {
          throw new Error("User profile not found. Please complete your profile.");
        }

        // Lock plot
        transaction.update(plotRef, {
          Status: "Booking",
          bookingTimestamp: new Date().toISOString(),
        });

        const newBooking = {
          bookingNumber,
          plotOwned: plotData.plotName,
          communityName: plotData.blockName,
          advanceAmount: Number(formData.advanceAmount) || 0,
          dealClosedAmount: Number(formData.dealClosedAmount) || 0,
          note: formData.note || "",
          timestamp: new Date().toISOString(),
          status: "Pending",
        };

        const currentBookings = userSnap.data().bookings || [];
        transaction.update(userDocRef, {
          updatedAt: serverTimestamp(),
          bookings: [...currentBookings, newBooking],
        });
      });

      // Set timeout for payment window (10 minutes)
      timeoutIdRef.current = setTimeout(async () => {
        try {
          await revertPlotStatus();
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const bookings = snap.data().bookings || [];
            const updated = bookings.map((b) =>
              b.bookingNumber === bookingNumber ? { ...b, status: "Failed", failedReason: "Timeout" } : b
            );
            await updateDoc(userDocRef, { bookings: updated });
          }
        } catch (e) {
          console.error("Auto-revert failed:", e);
        }
      }, 10 * 60 * 1000);

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: Number(formData.advanceAmount) * 100,
        currency: "INR",
        name: "Hasiru Farms Enterprises Pvt Ltd",
        description: `Advance payment for Plot ${plotData?.plotName || projectId}`,

        handler: async (response) => {
          if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
          setIsPaymentProcessing(false);

          try {
            const userSnap = await getDoc(userDocRef);
            const bookings = userSnap.data().bookings || [];
            const updatedBookings = bookings.map((b) =>
              b.bookingNumber === bookingNumber
                ? { ...b, status: "Success", paymentId: response.razorpay_payment_id }
                : b
            );

            await updateDoc(userDocRef, { bookings: updatedBookings });

            await updateDoc(doc(db, "mapplots", projectId), {
              Status: "Booked",
            });

            const invoiceData = {
              bookingId: currentUser.uid,
              bookingNumber,
              emailId: currentUser.email,
              mobileNumber: userSnap.data().mobileNumber || "",
              dealClosedAmount: Number(formData.dealClosedAmount) || 0,
              advanceAmount: Number(formData.advanceAmount) || 0,
              note: formData.note,
              name: currentUser.displayName || "Customer",
              plotNo: plotData.plotName,
              projectName: plotData.blockName,
              status: "success",
              BookingStatus: "Booking Successful",
              timestamp: new Date().toISOString(),
            };
            await addDoc(collection(db, "invoices"), invoiceData);

            await sendConfirmationEmail(
              currentUser.email,
              currentUser.displayName || "Customer",
              bookingNumber,
              plotData.plotName,
              plotData.blockName,
              formData.dealClosedAmount,
              formData.advanceAmount,
              formData.note,
              documentLink
            );

            setBookingDetails({
              bookingId: currentUser.uid,
              bookingNumber,
              advanceAmount: Number(formData.advanceAmount) || 0,
              dealClosedAmount: Number(formData.dealClosedAmount) || 0,
              note: formData.note,
              email: currentUser.email,
              mobileNumber: userSnap.data().mobileNumber || "Not provided",
              name: currentUser.displayName || "Customer",
            });

            setShowConfirmation(true);
            setPlotStatus("Booked");
          } catch (err) {
            console.error("Success handler error:", err);
            await revertPlotStatus();
            setErrorMessage("Payment successful but failed to update records. Contact support.");
            setShowBookingPopup(true);
            setShowErrorSection(true);
          }
        },

        prefill: {
          name: currentUser.displayName || "",
          email: currentUser.email || "",
          contact: "", // mobile can be added if available in user doc
        },
        notes: {
          plotId: projectId,
          bookingNumber,
        },
        theme: {
          color: "#024837",
        },
        modal: {
          ondismiss: async () => {
            setIsPaymentProcessing(false);
            if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

            try {
              await revertPlotStatus();

              const snap = await getDoc(userDocRef);
              if (snap.exists()) {
                const bookings = snap.data().bookings || [];
                const updated = bookings.map((b) =>
                  b.bookingNumber === bookingNumber ? { ...b, status: "Failed", failedReason: "User cancelled" } : b
                );
                await updateDoc(userDocRef, { bookings: updated });
              }

              const invoiceData = {
                bookingId: currentUser.uid,
                bookingNumber,
                emailId: currentUser.email,
                mobileNumber: (await getDoc(userDocRef)).data()?.mobileNumber || "",
                dealClosedAmount: Number(formData.dealClosedAmount) || 0,
                advanceAmount: Number(formData.advanceAmount) || 0,
                note: formData.note,
                name: currentUser.displayName || "Customer",
                plotNo: plotData.plotName,
                projectName: plotData.blockName,
                status: "Failed",
                BookingStatus: "Booking Failed",
                timestamp: new Date().toISOString(),
              };
              await addDoc(collection(db, "invoices"), invoiceData);

              setErrorMessage("Payment was canceled. You can try again or return to the plot page.");
              setShowBookingPopup(true);
              setShowErrorSection(true);
            } catch (error) {
              console.error("Cancellation handling failed:", error);
              setErrorMessage("Cancellation processing failed. Contact support.");
              setShowErrorSection(true);
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async (response) => {
        setIsPaymentProcessing(false);
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

        try {
          await revertPlotStatus();

          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const bookings = snap.data().bookings || [];
            const updated = bookings.map((b) =>
              b.bookingNumber === bookingNumber
                ? { ...b, status: "Failed", failedReason: response.error.description || "Payment failed" }
                : b
            );
            await updateDoc(userDocRef, { bookings: updated });
          }

          const invoiceData = {
            bookingId: currentUser.uid,
            bookingNumber,
            emailId: currentUser.email,
            mobileNumber: (await getDoc(userDocRef)).data()?.mobileNumber || "",
            dealClosedAmount: Number(formData.dealClosedAmount) || 0,
            advanceAmount: Number(formData.advanceAmount) || 0,
            note: formData.note,
            name: currentUser.displayName || "Customer",
            plotNo: plotData.plotName,
            projectName: plotData.blockName,
            status: "Failed",
            BookingStatus: "Booking Failed",
            timestamp: new Date().toISOString(),
          };
          await addDoc(collection(db, "invoices"), invoiceData);

          setErrorMessage(response.error.description || "Payment failed.");
          setShowBookingPopup(true);
          setShowErrorSection(true);
        } catch (err) {
          console.error("Payment failed handling error:", err);
          setErrorMessage("Payment failed and update could not be completed.");
          setShowErrorSection(true);
        }
      });

      rzp.open();
    } catch (error) {
      setIsPaymentProcessing(false);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      console.error("Booking initiation failed:", error);
      setErrorMessage(error.message || "Failed to initiate booking.");
      setShowBookingPopup(true);
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
        dealClosedAmount: "",
        advanceAmount: "",
        note: "",
        termsAgreed: false,
        privacyAgreed: false,
      }));
    } catch (error) {
      console.error("Error checking plot status:", error);
      setErrorMessage("Failed to verify plot availability.");
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
            minWidth: '280px',
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
          <p>Please wait while we process your payment…</p>
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
          <strong>
            <i className="fa fa-leaf" aria-hidden="true"></i> Reserve your dream farm plot today!
          </strong>
        </p>
      </div>
    )}

    {plotStatus.toLowerCase() === "available" ? (
      <div
        className="book-now-button"
        onClick={handleBookNow}
        title="Click to reserve this plot"
      >
        <i className="fas fa-book book-now-icon" style={{ marginRight: "8px", transition: "transform 0.2s" }} />
        Reserve Now
        <span
          className="badge"
          style={{
            marginLeft: "8px",
            background: "none",
            border: '2px dotted #f5fde9',
            color: "#f5fde9",
            padding: "6px 12px",
            borderRadius: "15px",
            fontSize: "12px",
          }}
        >
          <strong>Available</strong>
        </span>
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
            {/* Left column - Plot info */}
            <div className="booking-column booking-info">
              <img
                src="./logo36.png"
                alt="Hasiru Farms Logo"
                className="company-logo"
                style={{ maxWidth: "180px", marginBottom: "20px" }}
              />
              <h4><i className="fas fa-check-circle"></i> Plot Details</h4>
              <div className="info-item">Project: <strong>{plotData.blockName}</strong></div>
              <div className="info-item">Plot Number: <strong>{plotData.plotName}</strong></div>
              <div className="info-item">Survey Number: <strong>{plotData.surveyNumber}</strong></div>
              <div className="info-item">Area: <strong>{plotData.areaGuntas} Guntas</strong></div>
              <h4 className="booking-amount">
                <i className="fas fa-credit-card"></i> ₹{formData.advanceAmount || "—"}
              </h4>

              <div className="payment-methods">
                <p>Accepted Payment Methods</p>
                <div className="payment-icons">
                  <i className="fab fa-cc-visa"></i>
                  <i className="fab fa-cc-mastercard"></i>
                  <i className="fa-brands fa-google-pay"></i>
                  <i className="fab fa-cc-amex"></i>
                </div>
                <p className="secure-note">
                  <i className="fas fa-lock"></i> Secure payment via Razorpay
                </p>
              </div>
            </div>

            {/* Right column - Form / Confirmation / Error */}
            <div className="booking-column booking-form">
              {showErrorSection ? (
                <div className="error-section">
                  <h4><i className="fas fa-exclamation-circle" style={{ color: '#d32f2f' }}></i> Error</h4>
                  <p style={{ fontSize: '15px', margin: '12px 0' }}>{errorMessage}</p>
                  <div className="form-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="retry-button" onClick={handleRetryBooking}>
                      Retry Booking
                    </button>
                    <button className="return-button" onClick={handleReturnToPlotPage}>
                      Back to Map
                    </button>
                  </div>
                </div>
              ) : showConfirmationSection ? (
                <div className="confirmation-section">
                  <h4><i className="fas fa-info-circle"></i> Confirm Your Booking</h4>
                  <p style={{ marginBottom: '16px' }}>Please review before proceeding to payment.</p>

                  <div
                    className="confirmation-details"
                    style={{
                      padding: '16px',
                      border: '2px dotted #024837',
                      borderRadius: '16px',
                      background: '#f9fafb',
                      marginBottom: '24px',
                    }}
                  >
                    <p><strong>Booking for:</strong> {currentUser?.displayName || "User"}</p>
                    <p><strong>Email:</strong> {currentUser?.email}</p>
                    <p><strong>Project:</strong> {plotData.blockName}</p>
                    <p><strong>Plot:</strong> {plotData.plotName}</p>
                    <p><strong>Advance Amount:</strong> ₹{formData.advanceAmount}</p>
                    <p><strong>Agreed Amount:</strong> ₹{formData.dealClosedAmount}</p>
                    <p><strong>Note:</strong> {formData.note || "—"}</p>
                  </div>

                  <div className="form-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      className="confirm-button"
                      onClick={handleConfirmDetails}
                      style={{
                        padding: '12px 28px',
                        background: '#024837',
                        color: 'white',
                        border: 'none',
                        borderRadius: '999px',
                        fontWeight: '600',
                      }}
                    >
                      Confirm & Pay
                    </button>
                    <button
                      className="edit-button"
                      onClick={() => setShowConfirmationSection(false)}
                      style={{
                        padding: '12px 28px',
                        background: '#f5f7e9',
                        color: '#333',
                        border: '1px solid #ccc',
                        borderRadius: '999px',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h4>Complete Your Booking</h4>
                  {validationError && (
                    <div className="validation-error" style={{ color: '#d32f2f', marginBottom: '16px' }}>
                      {validationError}
                    </div>
                  )}

                  {/* Read-only user info */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      fontSize: '14px',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                      {currentUser?.displayName || "Registered User"}
                    </div>
                    <div style={{ color: '#555' }}>{currentUser?.email}</div>
                  </div>

                  <div className="form-group">
                    <input
                      type="number"
                      placeholder="Advance Amount (min ₹50,000)"
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
                      placeholder="Agreed Deal Amount (INR)"
                      name="dealClosedAmount"
                      value={formData.dealClosedAmount}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <textarea
                      placeholder="Any special note or request (optional)"
                      name="note"
                      value={formData.note}
                      onChange={handleFormChange}
                      rows="3"
                    />
                  </div>

                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="termsAgreed"
                        checked={formData.termsAgreed}
                        onChange={handleFormChange}
                      />
                      I agree to the <strong>Terms & Conditions</strong>
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
                      I agree to the <strong>Refund Policy</strong>
                    </label>
                  </div>

                  <div className="form-buttons" style={{ marginTop: '24px' }}>
                    <button
                      type="button"
                      className="proceed-button"
                      onClick={handleProceedToPayment}
                    >
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {showConfirmation && bookingDetails && (
      <div className="confirmation-popup" onClick={closeParentPopup}>
        <div className="confirmation-popup-content" onClick={(e) => e.stopPropagation()}>
          <i className="fas fa-check-circle" style={{ fontSize: "64px", color: "#024837" }}></i>
          <h3>Booking Confirmed!</h3>

          <div className="confirmation-details" style={{ margin: '20px 0' }}>
            <p style={{ fontSize: '18px', fontWeight: '600' }}>
              Booking Number: <strong>{bookingDetails.bookingNumber}</strong>
            </p>
            <p>Advance Amount: <strong>₹{bookingDetails.advanceAmount.toLocaleString('en-IN')}</strong></p>
            <p>Project: <strong>{plotData.blockName}</strong></p>
            <p>Plot: <strong>{plotData.plotName}</strong></p>
            <p>
              <strong>{bookingDetails.name}</strong> • {bookingDetails.email}
            </p>
          </div>

          <p style={{
            padding: '16px',
            background: '#e8f5e9',
            borderRadius: '12px',
            color: '#1b5e20',
            margin: '16px 0',
            lineHeight: '1.5'
          }}>
            <i className="fas fa-check-circle"></i> Receipt and documents have been sent to your registered email.
            <br />
            Please check your inbox (including spam/junk folder).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <button className="download-receipt-button" onClick={generateReceiptPDF}>
              <i className="fas fa-download"></i> Download Receipt PDF
            </button>
            <button className="back-button" onClick={closeParentPopup}>
              Back to Map
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default PaymentHandler;
