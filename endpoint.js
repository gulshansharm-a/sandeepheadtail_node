// Import necessary modules
const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase Admin SDK with service account credentials
const serviceAccount = require('./sandeepkote-c67f5-firebase-adminsdk-qhggd-e95af41597.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sandeepkote-c67f5-default-rtdb.firebaseio.com"
});

// Initialize the Firebase Realtime Database
const db = admin.database();

// Reference to the 'timer/time' node in the database
const ref = db.ref('timer/time');

// Reference to the 'standing' node in the database
const standingRef = db.ref('standing');

// Reference to the 'earning' node in the database
const earningRef = db.ref('earning');

// Initialize the standing amount variable
let standingAmount = 0;

// Define the current player's UID (Replace 'your_current_player_uid' with the actual UID)
let currentPlayerUid = 'your_current_player_uid';

// Define the 'result' variable to store the game result
let result;

// Define a reference to the 'last10data' node in the database
const last10dataRef = db.ref('last10data');

// Define a reference to the 'result' node in the database
const totalRef = db.ref('result');

// Initialize the earning amount variable
let earningAmount = 0;

// Function to store the game result and delete the 'bet' collection
function storeResultAndDeleteBetCollection() {
  // Retrieve the current 'last10data' values from the database
  last10dataRef.once('value', (snapshot) => {
    // Get the 'last10data' array or initialize it as an empty array if it doesn't exist
    let last10data = snapshot.val() || [];

    // Add the new game result to the front of the 'last10data' array
    last10data.unshift(result);

    // If 'last10data' has more than 10 elements, remove the last one
    if (last10data.length > 10) {
      last10data.pop();
    }

    // Set the 'result' in the 'result' node in the database
    totalRef.set(result, (error) => {
      if (error) {
        console.error('Error storing total value:', error);
      } else {
        console.log('Total value stored successfully!');
        deleteBetCollection();
      }
    });

    // Schedule the update of 'last10data' using a setTimeout function
    setTimeout(() => {
      // Update 'last10data' in the Firebase database
      last10dataRef.set(last10data, (error) => {
        if (error) {
          console.error('Error updating last10data:', error);
        } else {
          console.log('last10data updated successfully!');
          // Additional functionality to update endpoints for Agent and Distributor
          updateEndpointsForUser(currentPlayerUid, earningAmount);
        }
      });
    }, 10000); // Delay the update for 10 seconds (adjust as needed)
  });
}

// Schedule the field update using a cron job (runs every minute)
cron.schedule('*/1 * * * *', () => {
  // Get the current time in milliseconds
  const currentTime = Date.now();

  // Update the 'timer/time' field in the database with the current time
  ref.set(currentTime, (error) => {
    if (error) {
      console.error('Error updating field:', error);
    } else {
      console.log('Field updated successfully!');
    }
  });

  // Reference to the 'bet' node in the database
  const betRef = db.ref('bet');

  // Reference to the 'earningPercentage' node in the database
  const earningPercentageRef = db.ref('earningPercentage');

  // Initialize the earning percentage variable
  let earningPercentage = 0;

  // Retrieve the 'bet' data from the database
  betRef.once('value', (snapshot) => {
    // Initialize total points for 'chapa' and 'kata'
    let totalChapa = 0;
    let totalKata = 0;

    // Iterate through each 'bet' entry
    snapshot.forEach((childSnapshot) => {
      // Get the data for a specific bet
      const childData = childSnapshot.val();

      // Update the total points for 'chapa' and 'kata'
      totalChapa += parseInt(childData.chapa);
      totalKata += parseInt(childData.kata);

      // Get the player UID from the bet data
      const playerUid = childData.betUid;

      // Calculate the player's total points (sum of chapa and kata)
      const playerPoint = parseInt(childData.chapa) + parseInt(childData.kata);

      // Update the player's point in the 'Player' node
      updatePlayerPoint(playerUid, playerPoint);

      // If the player UID matches the current player UID, update their win
      if (playerUid === currentPlayerUid) {
        // Calculate the player's win
        const playerWin = playerPoint * 2;
        updatePlayerWin(playerUid, playerWin);
      }
    });

    // Get the standing amount from the 'standing' node
    standingRef.once('value', (snapshot) => {
      // Update the 'standingAmount' variable with the standing value from the database
      standingAmount = parseInt(snapshot.val());
      console.log("standing Amount: " + standingAmount);

      // Get the earning percentage from the 'earningPercentage' node
      earningPercentageRef.once('value', (snapshot) => {
        // Update the 'earningPercentage' variable with the percentage value from the database
        earningPercentage = parseFloat(snapshot.val()) / 100.0;
        console.log("earning Percentage: " + earningPercentage);

        // Calculate the game result based on 'chapa' and 'kata' points
        if (totalChapa > totalKata) {
          result = 'chapa';
        } else if (totalKata > totalChapa) {
          result = 'kata';
        } else {
          // Handle the case when totalChapa and totalKata are equal
          const randomCharacter = Math.random() < 0.5 ? 'c' : 'k';
          result = `commission${randomCharacter}`;
        }

        // Calculate the earning amount
        earningAmount = (totalChapa + totalKata) * earningPercentage;

        // Store the result and delete the 'bet' collection
        storeResultAndDeleteBetCollection();
      });
    });
  })
  .catch((error) => {
    console.error('Error retrieving data:', error);
  });
});

// Function to update a player's point in the 'Player' node
function updatePlayerPoint(playerUid, amount) {
  // Construct the path to the specific player's data in the 'Player' node
  const playerRef = db.ref('Player').child(playerUid);

  // Update the 'playerpoint' field with the new point amount
  playerRef.update({
    playerpoint: amount,
  });
}

// Function to update a player's win in the 'Player' node
function updatePlayerWin(playerUid, winAmount) {
  // Construct the path to the specific player's data in the 'Player' node
  const playerRef = db.ref('Player').child(playerUid);

  // Update the 'win' field with the new win amount
  playerRef.update({
    win: winAmount,
  });
}

// ... (Continuation of the code)

// ... (Continuation of the code)

// Function to update player data based on the game result
function updatePlayerData(result, totalChapa, totalKata) {
  const playerRef = db.ref('Player');

  // Retrieve the player data from the database
  playerRef.once('value', (snapshot) => {
    const playerData = snapshot.val();

    if (playerData) {
      Object.keys(playerData).forEach((playerUid) => {
        const player = playerData[playerUid];

        if (player && player.hasOwnProperty('playerpoint')) {
          const playerpoint = player.playerpoint || 0;
          const endpoint = player.endpoint || 0;
          const win = player.win || 0;

          let updatedWin = win;
          let updatedEndpoint = endpoint;

          // Update win and endpoint based on the game result
          if (result === 'chapa') {
            updatedWin = totalChapa * 2;
          } else if (result === 'kata') {
            updatedWin = totalKata * 2;
          }

          updatedEndpoint = -updatedWin + playerpoint;

          // Update the player's win and endpoint in the database
          playerRef.child(playerUid).update({
            win: updatedWin,
            endpoint: updatedEndpoint,
          });
        }
      });
    }
  });
}

// Function to update endpoints for related users (e.g., agents and distributors)
function updateEndpointsForUser(userId, earningAmount) {
  const playerRef = db.ref('Player');

  // Retrieve the user's data from the database
  playerRef.child(userId).once('value', (snapshot) => {
    const userData = snapshot.val();

    if (userData && userData.hasOwnProperty('agentID') && userData.hasOwnProperty('distributorID')) {
      const agentID = userData.agentID;
      const distributorID = userData.distributorID;

      // Update the endpoint for the agent and distributor
      updateEndpointForUser(agentID, earningAmount);
      updateEndpointForUser(distributorID, earningAmount);
    }
  });
}

// Function to update the endpoint for a specific user
// Function to update endpoints for related users (e.g., agents and distributors)
function updateEndpointsForUser(userId, earningAmount) {
  const playerRef = db.ref('Player');

  // Retrieve the user's data from the database
  playerRef.child(userId).once('value', (snapshot) => {
    const userData = snapshot.val();

    if (userData && userData.hasOwnProperty('agentID') && userData.hasOwnProperty('distributorID')) {
      const agentID = userData.agentID;
      const distributorID = userData.distributorID;

      // Update the endpoint for the agent and distributor if they exist in the database
      updateEndpointForUser(agentID, earningAmount);
      updateEndpointForUser(distributorID, earningAmount);
    }
  });
}

// Function to update the endpoint for a specific user
function updateEndpointForUser(userId, earningAmount) {
  const playerRef = db.ref('Player');
  const agentRef = db.ref('Agent');
  const distributorRef = db.ref('Distributor');

  // Retrieve the user's data from the database
  playerRef.child(userId).once('value', (snapshot) => {
    const userData = snapshot.val();

    if (userData && userData.hasOwnProperty('endpoint')) {
      const currentEndpoint = userData.endpoint;
      const newEndpoint = currentEndpoint - earningAmount;

      // Update the endpoint for the user in the Player node
      playerRef.child(userId).update({
        endpoint: newEndpoint,
      });
    }

    // Check if the user is an agent and their agent ID exists in the Agent node
    if (userData && userData.hasOwnProperty('agentID')) {
      const agentID = userData.agentID;
      agentRef.child(agentID).once('value', (agentSnapshot) => {
        if (agentSnapshot.exists()) {
          // If the agent exists, update their endpoint
          updateEndpoint(agentSnapshot.key, earningAmount);
        }
      });
    }

    // Check if the user is a distributor and their distributor ID exists in the Distributor node
    if (userData && userData.hasOwnProperty('distributorID')) {
      const distributorID = userData.distributorID;
      distributorRef.child(distributorID).once('value', (distributorSnapshot) => {
        if (distributorSnapshot.exists()) {
          // If the distributor exists, update their endpoint
          updateEndpoint(distributorSnapshot.key, earningAmount);
        }
      });
    }
  });
}

// Helper function to update the endpoint for an agent or distributor
function updateEndpoint(agentOrDistributorUid, earningAmount) {
  const agentOrDistributorRef = db.ref(agentOrDistributorUid);

  // Retrieve the agent or distributor data from the database
  agentOrDistributorRef.once('value', (snapshot) => {
    const agentOrDistributorData = snapshot.val();

    if (agentOrDistributorData && agentOrDistributorData.hasOwnProperty('endpoint')) {
      const currentEndpoint = agentOrDistributorData.endpoint;
      const newEndpoint = currentEndpoint - earningAmount;

      // Update the endpoint for the agent or distributor
      agentOrDistributorRef.update({
        endpoint: newEndpoint,
      });
    }
  });
}


// Function to set the standing amount in the 'standing' node
function setStanding(amount) {
  standingRef.set(amount, (error) => {
    if (error) {
      console.error('Error storing standing amount:', error);
    } else {
      console.log('Standing amount stored successfully!');
      storeResultAndDeleteBetCollection();
    }
  });
}

// Function to delete the 'bet' collection
function deleteBetCollection() {
  const betRef = db.ref('bet');
  betRef.remove((error) => {
    if (error) {
      console.error('Error deleting bet collection:', error);
    } else {
      console.log('Bet collection deleted successfully!');
    }
  });
}

// Don't forget to add necessary error handling and adapt this code to your specific Firebase Realtime Database structure.

