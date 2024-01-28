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

const setTominimumRef = db.ref('setTominimum');
const betRef = db.ref('bet');
const totalRef = db.ref('result');
const userRef = db.ref('users');
const earningPercentageRef = db.ref('earningPercentage');
const last10dataRef = db.ref('last10data');

let standingAmount = 0;
let earningPercentage = 0;
let result = "";


cron.schedule('*/1 * * * *', () => {
  getComissionValues()
  const currentTime = Date.now();

  ref.set(currentTime, (error) => {
    if (error) {
      console.error('Error updating field:', error);
      return;
    }
    console.log('Field updated successfully!');
  });

  betRef.once('value', (snapshot) => {
    let totalChapa = 0;
    let totalKata = 0;

    snapshot.forEach((childSnapshot) => {
      const userId = childSnapshot.key;
      const childData = childSnapshot.val();
      const chapa = parseInt(childData.chapa);
      const kata = parseInt(childData.kata);
      if (!isNaN(chapa) && !isNaN(kata)) {
        totalChapa += chapa;
        totalKata += kata;
      } else {
        console.error('Invalid bet data for user', userId);
      }
    });

    standingRef.once('value', (snapshot) => {
      standingAmount = parseInt(snapshot.val()) || 0;
      console.log("standing Amount: " + standingAmount);

      earningPercentageRef.once('value', (snapshot) => {
        earningPercentage = parseFloat(snapshot.val()) / 100.0;
        console.log("earning Percentage: " + earningPercentage);

        let minOfThem = Math.min(totalChapa, totalKata);
        let totalOfBoth = totalChapa + totalKata;
        let maxOfBoth = Math.max(totalChapa, totalKata);
        let earning = 0;

        if (totalChapa != totalKata) {
          earning = totalOfBoth * earningPercentage;
        }

        console.log("total chapa: " + totalChapa + "  " + totalKata);

        if (totalChapa == totalKata) {
          console.log("commission time");
          const randomCharacter = Math.random() < 0.5 ? "c" : "k";

          if (randomCharacter == "c") {
            earning = totalChapa * earningPercentage;
          } else if (randomCharacter == "k") {
            earning = totalKata * earningPercentage;
          }

          result = "commission" + randomCharacter;
        } else {
          console.log("other time");

          if (standingAmount === 0 || standingAmount <= maxOfBoth) {
            standingAmount = standingAmount + totalOfBoth - minOfThem * 2 - earning;
            setStanding(standingAmount);

            if (totalChapa > totalKata) {
              result = "kata";
            } else {
              result = "chapa";
            }
          } else if (standingAmount >= maxOfBoth * 3) {
            standingAmount = standingAmount + totalOfBoth - (maxOfBoth * 4) - earning;
            setStanding(standingAmount);

            if (totalChapa > totalKata) {
              result = "chapaj";
            } else {
              result = "kataj";
            }
          } else if (standingAmount >= maxOfBoth) {
            standingAmount = standingAmount + totalOfBoth - (maxOfBoth * 2) - earning;
            setStanding(standingAmount);

            if (totalChapa > totalKata) {
              result = "chapa";
            } else {
              result = "kata";
            }
          }
        }

        const earningAmount = earning;

        earningRef.once('value', (snapshot) => {
          let currentEarningAmount = parseInt(snapshot.val()) || 0;

          const newEarningAmount = currentEarningAmount + earningAmount;

          if (isNaN(newEarningAmount)) {
            console.error('Invalid earning amount:', newEarningAmount);
            return;
          }

          earningRef.set(newEarningAmount, (error) => {
            if (error) {
              console.error('Error storing earning amount:', error);
            } else {
              console.log('Earning amount stored successfully!');
              setStanding(standingAmount);
            }
          });
        });

        setTominimumRef.once('value', (snapshot) => {
          const setTominimum = snapshot.val();
          console.log("set to minimum")
          const isSetToMinimum = setTominimum === 'true';

          if (isSetToMinimum) {
            result = totalChapa < totalKata ? 'chapa' : 'kata';
          }

        });

        db.ref('customBet').once('value', (snapshot) => {
          const setTominimum = snapshot.val();
          console.log("set to minimum")
          const isSetToMinimum = setTominimum === 'chapa' || setTominimum === 'kata';
          if (isSetToMinimum) {
            result = setTominimum
          }
        });
        storeResultAndDeleteBetCollection();
      });
    });
  });

  var query = db.ref("users").orderByChild("role").equalTo("distributor");
  query.once("value")
    .then(function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var data = childSnapshot.val();
        console.log(data);
      });
    })
    .catch(function(error) {
      console.error("Error fetching data:", error);
    });
});

function setStanding(amount) {
  standingRef.set(amount, (error) => {
    if (error) {
      console.error('Error storing standing amount:', error);
    } else {
      console.log('Standing amount stored successfully!');
    }
  });
}

function storeResultAndDeleteBetCollection() {
  last10dataRef.once('value', (snapshot) => {
    let last10data = snapshot.val() || [];
    last10data.unshift(result);

    if (last10data.length > 10) {
      last10data.pop();
    }

    betRef.once('value', (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const childData = childSnapshot.val();
        const chapa_value = parseInt(childData.chapa);
        const kata_value = parseInt(childData.kata);

        if (isNaN(chapa_value) || isNaN(kata_value)) {
          console.error("Invalid values for chapa_value or kata_value for user:", userId);
          return;
        }

        if (chapa_value === 0 && kata_value === 0) {
          console.log("Skipping upload for user:", userId, "as both chapa and kata are 0");
          return;
        }

        let agent_value = "";
        const agentRef = db.ref("users").child(userId);
        agentRef.once('value', (snapshot) => {
          agent_value = snapshot.child("agent").val();
          balance_child = parseInt( snapshot.child("balance").val());
          if (agent_value === null) {
            console.error('Agent value is null for user:', userId);
            return;
          }

          let profit = 0;

          switch (result) {
            case "chapa":
              profit = chapa_value > 0 ? chapa_value * 2 : 0;
              break;
            case "chapaj":
              profit = chapa_value > 0 ? chapa_value * 4 : 0;
              break;
            case "commissionc":
              // Handle commissionc case
              break;
            case "kataj":
              profit = kata_value > 0 ? kata_value * 4 : 0;
              break;
            case "kata":
              profit = kata_value > 0 ? kata_value * 2 : 0;
              break;
            case "commissionc":
              console.log("cc "+chapa_value+ " "+earningPercentage);
              profit = chapa_value > 0 ?chapa_value*2  -((chapa_value * (earningPercentage))) : 0;
              break;
            case "commissionk":
              console.log("cc "+kata_value+ " "+earningPercentage);

                profit = kata_value > 0 ? kata_value*2 -((kata_value * (earningPercentage))) : 0;
              break;
          }
          console.log("uska profit is "+profit +" "+ balance_child);
          snapshot.child("balance").ref.set(balance_child+profit);
          const collection = {
            chapa: chapa_value,
            kata: kata_value,
            agent: agent_value,
            playPoint: chapa_value + kata_value,
            winpoint: profit,
            result:result,
            endpoint: chapa_value + kata_value - profit,
            stime: getCurrentDateTime(),
          };


          db.ref("users").child(userId).child("gameHistory").push(collection, (error) => {
            if (error) {
              console.error('Error storing game history:', error.message);
            } else {
                adddata(agent_value,collection.endpoint)

            }
          });
        });
      });

      totalRef.set(result, (error) => {
        if (error) {
          console.error('Error storing total value:', error);
        } else {
          console.log('Total value stored successfully!');
          deleteBetCollection();
        }
      });

      setTimeout(() => {
        last10dataRef.set(last10data, (error) => {
          if (error) {
            console.error('Error updating last10data:', error);
          } else {
            console.log('last10data updated successfully!');
          }
        });
        UpdateEndPointOFDistributor()
      }, 10000);
    });
  });
}


function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}


function deleteBetCollection() {
  // Remove the bet collection after 3 seconds
  setTimeout(() => {
    betRef.remove((error) => {
      if (error) {
        console.error('Error deleting bet collection:', error);
      } else {
        console.log('Bet collection deleted successfully!');
      }
    });
  }, 10);

  // Remove the customBet collection after 3 seconds
  setTimeout(() => {
    db.ref('customBet').remove((error) => {
      if (error) {
        console.error('Error deleting customBet collection:', error);
      } else {
        console.log('customBet collection deleted successfully!');
      }
    });
  }, 3000);
}


function adddata(snapshot,tobeadded) {
  const testDataRef = db.ref("users").child(snapshot).child("endpoint");
  const testDataRef_true = db.ref("users").child(snapshot).child("isupdated");

  testDataRef_true.transaction((currentValue) => {
    return true;
}, (error, committed, snapshot) => {
  if (error) {
    console.error('Transaction failed abnormally!', error);
  } else if (!committed) {
    console.log('Transaction aborted (possibly due to conflicting operations)');
  } else {
    console.log('Transaction completed successfully! New value:', snapshot.val());
  }
});

  testDataRef.transaction((currentValue) => {
      return (parseInt(currentValue) || 0) + tobeadded;
  }, (error, committed, snapshot) => {
    if (error) {
      console.error('Transaction failed abnormally!', error);
    } else if (!committed) {
      console.log('Transaction aborted (possibly due to conflicting operations)');
    } else {
      console.log('Transaction completed successfully! New value:', snapshot.val());
    }
  });



}

const UpdateEndPointOFDistributor = async () => {
  console.log('Task executed at:', new Date());

  try {
    const distributorSnapshot = await db.ref("users").orderByChild("role").equalTo("distributor").once('value');
    const distributors = distributorSnapshot.val() || {};

    const updates = {};

    for (const [distributorKey, distributor] of Object.entries(distributors)) {
      let newEndpoint = 0;

      const endpointSnapshot = await db.ref("users").orderByChild("distributor").equalTo(distributorKey).once('value');
      const agents = endpointSnapshot.val() || {};

      for (const agentKey in agents) {
        if (agents[agentKey].endpoint) {
          newEndpoint += parseInt(agents[agentKey].endpoint) || 0;
        }
      }

      console.log("Updated endpoint for distributor " + distributorKey + " to " + newEndpoint);

      updates[`${distributorKey}/endpoint`] = newEndpoint;
    }

    await db.ref("users").update(updates);

  } catch (error) {
    console.error('Error:', error.message);
  }
};



cron.schedule('0 * * * *', UpdateEndPointOFDistributor);



//Express code


const express = require('express');
const app = express();
const port = 3000;


// Express API route
app.get('/api/resetEndpointsAndCommission', async (req, res) => {
  try {
    // Fetch users with role "distributor"
    const distributorSnapshot = await db.ref("users").orderByChild("role").equalTo("distributor").once('value');
    const agentSnapshot = await db.ref("users").orderByChild("role").equalTo("agent").once('value');

    const updates = {}; 

    distributorSnapshot.forEach((distributorChildSnapshot) => {
      const distributorKey = distributorChildSnapshot.key;

      // Update endpoint based on the distributor's endpoint (keep it the same if <= 0)
      const currentCommission = distributorChildSnapshot.child("commission").val() || 0;
      const currentEndpoint = distributorChildSnapshot.child("endpoint").val() || 0;
      const newEndpoint = (currentEndpoint); // Set to 0 or keep the same if <= 0

      // If newEndpoint is positive, calculate and update commission
      if (newEndpoint > 0) {
        const commission = calculateCommission(newEndpoint, currentCommission);
        updates[`${distributorKey}/commission`] = calculateCommission(newEndpoint, currentCommission);;
        updates[`${distributorKey}/endpoint`] = 0;
        const date_c  = Date.now()
        const collection = {
          commission : commission,
          currentCommission: currentCommission,
          endpoint:newEndpoint,
          date: getCurrentDateTime()
        }
        db.ref(`users/${distributorKey}/commissionHistory`).push(collection);
      }



    });

    agentSnapshot.forEach((distributorChildSnapshot) => {
      const distributorKey = distributorChildSnapshot.key;

      // Update endpoint based on the distributor's endpoint (keep it the same if <= 0)
      const currentCommission = distributorChildSnapshot.child("commission").val() || 0;
      const currentEndpoint = distributorChildSnapshot.child("endpoint").val() || 0;
      const newEndpoint = (currentEndpoint); // Set to 0 or keep the same if <= 0

      // If newEndpoint is positive, calculate and update commission
      if (newEndpoint > 0) {
        const commission = calculateCommission_agent(newEndpoint, currentCommission);
        updates[`${distributorKey}/commission`] = calculateCommission_agent(newEndpoint, currentCommission);;
        updates[`${distributorKey}/endpoint`] = 0;
        const date_c  = Date.now()
        const collection = {
          commission : commission,
          currentCommission: currentCommission,
          endpoint:newEndpoint,
          stime: getCurrentDateTime()
        }
        db.ref(`users/${distributorKey}/commissionHistory`).push(collection);
      }


    });

    // Perform a single update with all the changes
    await db.ref("users").update(updates);

    res.json({ message: 'Endpoints and commission reset successfully.' });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
let agentComission = 0.1;
let distributorComission = 0.1;

function getComissionValues() {
  db.ref("agentComission").once('value', (snapshot) => {    // Use val() to get the value from the snapshot
    agentComission = parseFloat(snapshot.val());
    console.log("agentcomission"+agentComission)
    // Now you can use the updated agentComission variable as needed
  });
  db.ref("distributorComission").once('value', (snapshot) => {
    // Use val() to get the value from the snapshot
    distributorComission = parseFloat(snapshot.val());
    console.log("agentcomission"+distributorComission)

    // Now you can use the updated agentComission variable as needed
  });
}

function calculateCommission(newEndpoint, currentCommission) {
  let commissionRate = distributorComission;
  const newCommission = currentCommission + newEndpoint * commissionRate;
  return newCommission;
}
function calculateCommission_agent(newEndpoint, currentCommission) {
  let commissionRate = agentComission;
  const newCommission = currentCommission + newEndpoint * commissionRate;
  return newCommission;
  
}

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
