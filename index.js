const dotEnv = require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 80;
const trainUtils = require('./trainUtilities');
let stops;
let lineToFeedId;

async function init() {
 stops = await trainUtils.buildStopData();
 lineToFeedId = trainUtils.buildFeedData();
}

// Route to get next train times, where stations are stored on req.body.stations
//TODO: Test next train times with front end http request
app.get('/next-train-times', async(req, res) => {
  try {
    let line = req.params.line;
    let station = req.params.station;
    let direction = req.params.direction;
    // TODO2 hardcode rest of lines
    // TODO4 pull into another file
    // TODO3 reduce number of API calls
    // TODO4 mapping station ids to names
    let TRAIN_STOPS = [
      {line:"2",station:"233",direction:"N"},
      {line:"2",station:"233",direction:"S"},
      {line:"3",station:"233",direction:"N"},
      {line:"3",station:"233",direction:"S"},
      {line:"Q",station:"R30",direction:"N"},
      {line:"Q",station:"R30",direction:"S"},
    ]
    let results = [];
    for (let i = 0; i < TRAIN_STOPS.length; i++) {
      let train_stop = TRAIN_STOPS[i];
      let times = await trainUtils.getNextTrainTimes(train_stop.line, train_stop.station, train_stop.direction);
      let result = times.map(function(t) {return {time: t, line:train_stop.line, station:train_stop.station, direction:train_stop.direction};});
      results.push(...result);
    }
    res.send(results);
  }
  catch(e) {
    console.log(e);
    res.send('Error');
  }
});

app.get('/next-bus-times/:line/:stop', async(req, res) => {
  try {
    let {line, stop} = req.params;
    let times = await trainUtils.getNextBusTimes(line, stop);
    res.send(times);
  }
  catch(e) {
    console.log(e);
    res.send('Error');
  }
});

app.get('/line-to-feed-ids', (req, res) => {
  try {
    res.send(lineToFeedId);
  }
  catch(e) {
    console.log(e);
    res.send('Error')
  }
});

app.get('/stops', (req, res) => {
  try {
    res.send(stops);
  }
  catch(e) {
    console.log(e);
    res.send('Error')
  }
});

app.get('*', (req, res) => {
  res.status(404).send('Error');
})

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Error')
})

app.listen(port, () => console.log(`App listening on port ${port}!`))

init();
