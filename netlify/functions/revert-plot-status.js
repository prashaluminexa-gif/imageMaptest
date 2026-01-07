const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, runTransaction, doc, updateDoc, addDoc } = require('firebase/firestore');
const { getAuth, signInWithCustomToken } = require('firebase/auth');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase
const firebaseConfig = {
 apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Netlify function handler
exports.handler = async (event, context) => {
  try {
    // Authenticate as admin using custom token
    const customToken = process.env.FIREBASE_ADMIN_TOKEN;
    if (!customToken) {
      throw new Error('Missing FIREBASE_ADMIN_TOKEN');
    }
    await signInWithCustomToken(auth, customToken);

    // List of plot collections to scan (excluding plotsDrag)
    const plotCollections = [
      'plots',
      'brindavanplots',
      'prakruthiplots',
      'vihaarplots',
      'blankProjectPlotsDrag'
    ];

    const tenMinutesInMs = 10 * 60 * 1000;
    const now = new Date();
    let totalProcessed = 0;
    let totalUpdated = 0;
    const results = [];

    // Process each collection
    for (const coll of plotCollections) {
      const plotsQuery = query(collection(db, coll), where('Status', '==', 'Booking'));
      const plotsSnapshot = await getDocs(plotsQuery);
      totalProcessed += plotsSnapshot.size;

      // Process each plot in a transaction
      for (const plotDoc of plotsSnapshot.docs) {
        const plotId = plotDoc.id;
        const plotData = plotDoc.data();
        const bookingTimestamp = plotData.bookingTimestamp;

        // Validate bookingTimestamp
        if (!bookingTimestamp) {
          console.warn(`Plot ${plotId} in ${coll} has no bookingTimestamp. Skipping.`);
          results.push(`Plot ${plotId} in ${coll}: Skipped (no bookingTimestamp)`);
          continue;
        }

        const bookingTime = new Date(bookingTimestamp);
        if (isNaN(bookingTime.getTime())) {
          console.warn(`Invalid bookingTimestamp for plot ${plotId} in ${coll}. Skipping.`);
          results.push(`Plot ${plotId} in ${coll}: Skipped (invalid bookingTimestamp)`);
          continue;
        }

        // Check if 10 minutes have passed
        if (now - bookingTime <= tenMinutesInMs) {
          continue;
        }

        // Find associated booking record
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('plotOwned', '==', plotData.plotName),
          where('communityName', '==', plotData.blockName),
          where('paymentStatus', '==', 'Pending')
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);

        if (bookingsSnapshot.empty) {
          console.warn(`No pending booking found for plot ${plotId} in ${coll}. Reverting plot status.`);
          results.push(`Plot ${plotId} in ${coll}: No pending booking found`);
        }

        // Run transaction to update plot and booking
        await runTransaction(db, async (transaction) => {
          const plotRef = doc(db, coll, plotId);
          const plotSnap = await transaction.get(plotRef);

          if (!plotSnap.exists()) {
            console.warn(`Plot ${plotId} in ${coll} no longer exists. Skipping.`);
            results.push(`Plot ${plotId} in ${coll}: Skipped (does not exist)`);
            return;
          }

          if (plotSnap.data().Status !== 'Booking') {
            console.warn(`Plot ${plotId} in ${coll} is no longer in Booking status. Skipping.`);
            results.push(`Plot ${plotId} in ${coll}: Skipped (not in Booking status)`);
            return;
          }

          // Update plot to Available
          transaction.update(plotRef, {
            Status: 'Available',
            bookingTimestamp: null,
          });

          // Update booking and create invoice
          for (const bookingDoc of bookingsSnapshot.docs) {
            const bookingRef = doc(db, 'bookings', bookingDoc.id);
            transaction.update(bookingRef, {
              paymentStatus: 'Failed',
            });

            const invoiceData = {
              bookingId: bookingDoc.id,
              bookingNumber: bookingDoc.data().bookingNumber,
              emailId: bookingDoc.data().email,
              mobileNumber: bookingDoc.data().mobileNumber,
              dealClosedAmount: bookingDoc.data().dealClosedAmount || 0,
              note: bookingDoc.data().note || '',
              name: bookingDoc.data().name,
              plotNo: bookingDoc.data().plotOwned,
              projectName: bookingDoc.data().communityName,
              advanceAmount: bookingDoc.data().advanceAmount || process.env.ADVANCE_AMOUNT || 99999,
              status: 'Failed',
              BookingStatus: 'Booking Failed',
              timestamp: new Date().toISOString(),
            };

            transaction.set(doc(collection(db, 'invoices')), invoiceData);
          }
        });

        totalUpdated++;
        console.log(`Reverted plot ${plotId} in ${coll} to Available and updated associated booking.`);
        results.push(`Plot ${plotId} in ${coll}: Reverted to Available`);
      }

      if (plotsSnapshot.empty) {
        console.log(`No plots in Booking status found in ${coll}.`);
        results.push(`Collection ${coll}: No plots in Booking status`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Processed ${totalProcessed} plots across ${plotCollections.length} collections. Reverted ${totalUpdated} to Available.`,
        details: results,
      }),
    };
  } catch (error) {
    console.error('Error in revert-plot-status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process plots.', details: error.message }),
    };
  }
};
