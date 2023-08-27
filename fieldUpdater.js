const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase Admin SDK
const serviceAccount = require('./sandeepkote-c67f5-firebase-adminsdk-qhggd-e95af41597.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sandeepkote-c67f5-default-rtdb.firebaseio.com"
});

const db = admin.database();
const ref = db.ref('timer/time');
const standingRef = db.ref('standing');
const earningRef = db.ref('earning');
let standingAmount = 0;

// Schedule the field update using cron job
cron.schedule('*/1 * * * *', () => {

  // Get the current time in milliseconds
  const currentTime = Date.now();

  // Update the desired field with the current time
  ref.set(currentTime, (error) => {
    if (error) {
      console.error('Error updating field:', error);
    } else {
      console.log('Field updated successfully!');
    }
  });

  const betRef = db.ref('bet');
  const totalRef = db.ref('result');
  const earningPercentageRef = db.ref('earningPercentage');
  let earningPercentage = 0;
  betRef.once('value', (snapshot) => {
    let totalChapa = 0;
    let totalKata = 0;
    let result = "";
    snapshot.forEach((childSnapshot) => {
      const childData = childSnapshot.val();
      totalChapa += parseInt(childData.chapa);
      totalKata += parseInt(childData.kata);
    });

    // Get standing Amount
    standingRef.once('value', (snapshot) => {
      standingAmount = parseInt(snapshot.val());
      console.log("standing Amount: " + standingAmount);

      // Get Earning %
      earningPercentageRef.once('value', (snapshot) => {
        earningPercentage = parseFloat(snapshot.val()) / 100.0;
        console.log("earning Percentage: " + earningPercentage);

        // Logic of result
        let minOfThem = Math.min(totalChapa, totalKata);
        let totalOfBoth = totalChapa + totalKata;
        let maxOfBoth = Math.max(totalChapa, totalKata);
        let earning = 0;
        if(totalChapa != totalKata) {
           earning = totalOfBoth * earningPercentage;
        }
        console.log("total chapa: " + totalChapa+"  "+totalKata);
        if (totalChapa == totalKata) {
          console.log("commission time");
          const randomCharacter = Math.random() < 0.5 ? "c" : "k";
          if(randomCharacter == "c") {
            earning = totalChapa*earningPercentage;
          }else if(randomCharacter == "k") { 
            earning = totalKata*earningPercentage;
          }
          result = "commission" + randomCharacter;

        } else {
          console.log("other time");
          // for the case of standingAmount = 0 or less than max*2
          if (standingAmount === 0 || standingAmount <= maxOfBoth) {
            standingAmount = standingAmount + totalOfBoth - minOfThem * 2 - earning;
            setStanding(standingAmount);
            if (totalChapa > totalKata) {
              result = "kata";
            } else {
              result = "chapa";
            }
          }

          else if (standingAmount >= maxOfBoth * 3) {
            standingAmount = standingAmount + totalOfBoth -( maxOfBoth * 4 )-earning;
            setStanding(standingAmount);
            if (totalChapa > totalKata) {
              result = "chapaj";
            } else {
              result = "kataj";
            }
          }
         
          // else if((totalChapa*80)/100>totalKata) {
          //   standingAmount = standingAmount + totalOfBoth - maxOfBoth * 4;
          //   result = "kataj"
          // }
          // else if((totalChapa*80)/100>totalKata) {
          //   standingAmount = standingAmount + totalOfBoth - maxOfBoth * 4;
          //   result = "chapaj"
          // }
          
          else if (standingAmount >= maxOfBoth) {
            standingAmount = standingAmount + totalOfBoth -( maxOfBoth * 2)-earning;
            setStanding(standingAmount);
            if (totalChapa > totalKata) {
              result = "chapa";
            } else {
              result = "kata";
            }
          }
        }

        const earningAmount = earning;

        // Fetch the current earning amount from the database
        earningRef.once('value', (snapshot) => {
          let currentEarningAmount = snapshot.val() || 0; // If the earning amount is null, initialize it as 0

          // Calculate the new earning amount
          const newEarningAmount = currentEarningAmount + earningAmount;

          if (isNaN(newEarningAmount)) {
            console.error('Invalid earning amount:', newEarningAmount);
            return;
          }

          // Update the earning amount in the database
          earningRef.set(newEarningAmount, (error) => {
            if (error) {
              console.error('Error storing earning amount:', error);
            } else {
              console.log('Earning amount stored successfully!');
              // Set standing Amount in DB
              setStanding(standingAmount);
            }
          });
        });
      });
    });

// First, get the reference to the 'last10data' in your Firebase database.
const last10dataRef = db.ref('last10data');

// Inside your storeResultAndDeleteBetCollection function, get the current 'last10data' values.
function storeResultAndDeleteBetCollection() {
  last10dataRef.once('value', (snapshot) => {
    let last10data = snapshot.val() || [];
    
    // Add new result to the front of the 'last10data' array.
    last10data.unshift(result);

    // If 'last10data' has more than 10 elements, remove the last one.
    if (last10data.length > 10) {
      last10data.pop();
    }
    totalRef.set(result, (error) => {
      if (error) {
        console.error('Error storing total value:', error);
      } else {
        console.log('Total value stored successfully!');
        deleteBetCollection();
      }
    });
    // Wrap the updating of 'last10data' inside a setTimeout function.
    // The first argument is a function that will be called after the delay.
    // The second argument is the delay in milliseconds, 10000ms equals 10 seconds.
    setTimeout(() => {
      // Update 'last10data' in the Firebase database.
      last10dataRef.set(last10data, (error) => {
        if (error) {
          console.error('Error updating last10data:', error);
        } else {
          console.log('last10data updated successfully!');
          
        }
      });
    }, 10000);
  });
}

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

    function deleteBetCollection() {
      betRef.remove((error) => {
        if (error) {
          console.error('Error deleting bet collection:', error);
        } else {
          console.log('Bet collection deleted successfully!');
        }
      });
    }
  })
    .catch((error) => {
      console.error('Error retrieving data:', error);
    });
});
