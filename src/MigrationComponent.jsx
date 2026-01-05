import React, { useState } from 'react';
import { db } from './firebase'; // Adjust path to your firebase.js
import { collection, doc, writeBatch } from 'firebase/firestore';
import plotDetails from './data/plotdetails.json'; // Adjust path to your JSON file

const MigrationComponent = () => {
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');

  const uploadData = async () => {
    setStatus('uploading');
    setMessage('Uploading data to Firestore...');

    try {
      // Debug: Log the imported data
      console.log('Imported plotDetails:', plotDetails);

      // Extract the plots array
      const dataToUpload = plotDetails.plots;
      if (!Array.isArray(dataToUpload)) {
        throw new Error('plotDetails.plots is not an array');
      }

      // Validate data
      if (dataToUpload.length === 0) {
        throw new Error('No data to upload (empty plots array)');
      }

      const batch = writeBatch(db);
      dataToUpload.forEach((plot, index) => {
        // Ensure plot is an object and has projectId
        if (!plot || typeof plot !== 'object') {
          throw new Error(`Invalid data at index ${index}: expected an object`);
        }
        if (!plot.projectId) {
          throw new Error(`Missing projectId at index ${index}`);
        }

        // Use projectId as the document ID
        const docRef = doc(collection(db, 'plots'), plot.projectId);
        batch.set(docRef, plot);
      });

      await batch.commit();
      setStatus('success');
      setMessage(`Successfully uploaded ${dataToUpload.length} plots to Firestore!`);
    } catch (error) {
      setStatus('error');
      setMessage(`Error uploading data: ${error.message}`);
      console.error('Migration error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Firestore Data Migration</h1>
        <p className="text-gray-600 mb-6 text-center">
          Upload plot details from JSON to Firestore
        </p>
        <button
          onClick={uploadData}
          disabled={status === 'uploading'}
          className={`w-full py-2 px-4 rounded-lg text-white font-semibold ${
            status === 'uploading'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {status === 'uploading' ? 'Uploading...' : 'Start Migration'}
        </button>
        {message && (
          <p
            className={`mt-4 text-center ${
              status === 'error' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default MigrationComponent;

// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /plots/{document=**} {
//       allow read, write: if true;
//     }
//   }
// }

// import MigrationComponent from './components/MigrationComponent';

// function App() {
//   return (
//     <div>
//       <MigrationComponent />
//     </div>
//   );
// }

// export default App;