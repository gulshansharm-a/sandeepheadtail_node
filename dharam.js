const admin = require('firebase-admin');
const cron = require('node-cron');

const serviceAccount = require('./sandeepkote-c67f5-firebase-adminsdk-qhggd-e95af41597.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sandeepkote-c67f5-default-rtdb.firebaseio.com"
});

const db = admin.database();
const ref = db.ref('timer/time');
const standingRef = db.ref('standing');
const resultRef = db.ref('result');
const betRef = db.ref('funtarget/bet');

const determineWinningNumber = async (sumBets) => {
  const totalBets = sumBets.reduce((sum, bet) => sum + bet, 0);
  const profitForHouse = totalBets * 0.2;

  const snapshot = await standingRef.once('value');
  const currentStanding = snapshot.exists() ? parseFloat(snapshot.val()) : 0;

  const maxPayoutWithStanding = totalBets - profitForHouse + currentStanding;

  let maxPayoutSoFar = 0;
  let winningIndex = -1;

  for (let i = 0; i < sumBets.length; i++) {
    const potentialPayout = sumBets[i] * 10;

    if (potentialPayout > maxPayoutSoFar && potentialPayout <= maxPayoutWithStanding) {
      winningIndex = i;
      maxPayoutSoFar = potentialPayout;
    }
  }

  if (winningIndex === -1) {
    winningIndex = Math.floor(Math.random() * 10);
  }

  const usedFromStanding = Math.max(0, maxPayoutSoFar + profitForHouse - totalBets);
  const newStanding = currentStanding + profitForHouse - usedFromStanding;

  return {
    winningNumber: winningIndex,
    newStanding: newStanding
  };
};

const updateStandingAmount = async (newStanding) => {
  return standingRef.set(newStanding.toFixed(2));
}

const storeResultInDatabase = async (winningNumber) => {
  await resultRef.set(winningNumber);
}

const processBets = async () => {
  const snapshot = await betRef.once('value');
  const bets = snapshot.val();

  if (!bets) {
    const randomWinningNumber = Math.floor(Math.random() * 10);
    console.log("No bets placed. Random Winning number:", randomWinningNumber);
    await storeResultInDatabase(randomWinningNumber);
    return;
  }

  let sumBets = Array(10).fill(0);

  for (const userId in bets) {
    const userBets = bets[userId];
    userBets.forEach((bet, index) => {
      const betValue = parseInt(bet, 10);
      if (!isNaN(betValue)) {
        sumBets[index] += betValue;
      }
    });
  }

  const result = await determineWinningNumber(sumBets);
  console.log("Winning number:", result.winningNumber);
  await storeResultInDatabase(result.winningNumber);
  await updateStandingAmount(result.newStanding);
  await betRef.remove();
}

cron.schedule('*/1 * * * *', () => {
  const currentTime = Date.now();
  ref.set(currentTime, (error) => {
    if (error) {
      console.error('Error updating field:', error);
    } else {
      console.log('Field updated successfully!');
      processBets();
    }
  });
});
