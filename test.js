db.ref("users").child(userId).child("gameHistory").push(collection, (error) => {
    if (error) {
      console.error('Error storing game history:', error.message);
    } else {
        adddata(agent_value,collection.endpoint)

    }
  });

  db.ref("users").child(userId).child("gameHistory").push(collection, pustrequest(error));

  function pustrequest(error) {
    if (error) {
      console.error('Error storing game history:', error.message);
    } else {
        adddata(agent_value,collection.endpoint)

    }
  }