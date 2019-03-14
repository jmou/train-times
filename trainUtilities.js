const fs = require('fs');
const parse = require('csv-parse');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const request = require('request');
const dotEnv = require('dotenv').config();


let stops;
let lineToFeedId;

function buildStopData() {
  return new Promise((resolve) => {
    buildStops()
      .then(function(data) {
        stops = data;
        resolve(data);
    });
  });
}

function buildFeedData() {
  lineToFeedId = buildFeedIds();
  return lineToFeedId;
}


async function getNextBusTimes(busLine, stopId) {
  let requestSettings = {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    url: `http://bustime.mta.info/api/siri/stop-monitoring.json?key=${process.env.MTA_BUS_KEY}&MonitoringRef=${stopId}&LineRef=MTA NYCT_${busLine}`,
    encoding: null
  };

  const data = await new Promise(function(resolve, reject) {
    request(requestSettings, (error, response, body) => {
      if (error) {
        return reject(error)
      }

      if (response.statusCode != 200) {
        return reject(new Error('unexpected status code ' + response.statusCode))
      }

      if (!/json/.test(response.headers['content-type'])) {
        return reject(new Error('unexpected content type'))
      }

      resolve(JSON.parse(body.toString()));
    });
  });

  const departTimes = data.Siri.ServiceDelivery.StopMonitoringDelivery.map((s) => {
    return s.MonitoredStopVisit.map((m) => {
      return m.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime
    })
  }).reduce((a, b) => [...a, ...b], []).filter(Boolean)

  let deltaTimes = formatArrivalTimes(departTimes);

  return deltaTimes
}


async function getNextTrainTimes() {

  let TRAIN_STOPS = [
    {line:"2",stop_id:"233"},
    {line:"3",stop_id:"233"},
    {line:"Q",stop_id:"R30"},
    {line:"B",stop_id:"R30"},
    {line:"D",stop_id:"R30"},
    {line:"N",stop_id:"R29"},
    {line:"R",stop_id:"R29"},
    {line:"W",stop_id:"R29"},
    {line:"A",stop_id:"A41"},
    {line:"C",stop_id:"A41"},
    {line:"F",stop_id:"A41"},
    {line:"G",stop_id:"A42"},
    {line:"4",stop_id:"232"},
    {line:"5",stop_id:"232"}
  ]

  let STATION_INFO = {
    "233": {station:"Hoyt St", walk_time:1},
    "R30": {station:"Dekalb Ave", walk_time:6},
    "R29": {station:"Jay St - MetroTech", walk_time:1},
    "A41": {station:"Jay St - MetroTech", walk_time:4},
    "A42": {station:"Hoyt - Schermerhorn", walk_time:5},
    "232": {station:"Borough Hall", walk_time:4},
  }
  

  results = [];
  for (let i = 0; i < TRAIN_STOPS.length; i++) {
    let train_stop = TRAIN_STOPS[i];
    let trainLine = train_stop.line;
    let stopId = train_stop.stop_id;

    let body = await makeRequest(trainLine);
    let feed = GtfsRealtimeBindings.FeedMessage.decode(body);

    for (const direction of ["N","S"]) {
      let arrivalTimes = parseArrivalTimes(feed, trainLine, stopId, direction);
      let deltaTimes = formatArrivalTimes(arrivalTimes);
      let result = deltaTimes.map(function(t) {return {time: t, line:trainLine, station:STATION_INFO[stopId].station, direction:direction};});
      results.push(...result);
    };
  };

  return results;
}

function parseArrivalTimes(feed, trainLine, stopId, direction) {
  let arrivalTimes = [];
  feed.entity.forEach((entity) => {
    let tripUpdate = entity.trip_update;
    if (tripUpdate && tripUpdate.trip.route_id === trainLine){
      tripUpdate.stop_time_update.forEach((update) => {
          if(update.stop_id === stopId + direction) {
            let time = update.arrival.time.low*1000;
            arrivalTimes.push(time);
          }
        })
      }

    });

  arrivalTimes.sort();
  return arrivalTimes;
}

function makeRequest(trainLine) {
  let feedId = lineToFeedId[trainLine];
  let requestSettings = {
    method: 'GET',
    url: `http://datamine.mta.info/mta_esi.php?key=${process.env.MTA_KEY}&feed_id=${feedId}`,
    encoding: null
  };

  return new Promise(function(resolve, reject) {
    request(requestSettings, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}

function validateInputs(trainLine, stopId, direction) {
  let feedId = lineToFeedId[trainLine];
  if(!feedId) {
    return "Invalid train line provided." ;
  }
  if(!stops[stopId]) {
    return "Invalid stop id provided.";
  }
  if(direction !== "N" && direction !== "S" && !direction) {
    return "Invalid direction.";
  }
  return "";
}

function formatArrivalTimes(arrivalTimes) {
  let deltaTimes = [];
  arrivalTimes.forEach((time) => {
    let arrival = new Date(time);
    let deltaTime = Math.floor((arrival - Date.now())/60000);
    console.log((arrival - Date.now())/60000)
    if(deltaTime > 0) deltaTimes.push(deltaTime);
  });

  return deltaTimes;
}

function buildStops() {
  return new Promise(function(resolve, reject) {

    let stops = {};
    fs.createReadStream("stops.csv")
        .pipe(parse({delimiter: ','}))
        .on('data', function(csvrow) {
          let stop = {
            stationId: csvrow[0],
            complexId: csvrow[1],
            stopId: csvrow[2],
            division: csvrow[3],
            line: csvrow[4],
            stopName: csvrow[5],
            borough: csvrow[6],
          }
          stops[stop.stopId] = stop;
        })
        .on('end',function() {
          resolve(stops);
          return;
        });
  });
}

function buildFeedIds() {
  //NOTE S LINE IS ALSO INCLUDED IN ACEH DATA, include S in that array to see S data
  let lineToFeedId = {};
  ["1","2","3","4","5","6","S"].forEach((line) => {
    lineToFeedId[line] = 1;
  });
  ["A","C","E","H"].forEach((line) => {
    lineToFeedId[line] = 26;
  });
  ["N","Q","R","W"].forEach((line) => {
    lineToFeedId[line] = 16;
  });
  ["B","D","F","M"].forEach((line) => {
    lineToFeedId[line] = 21;
  });
  ["J", "M"].forEach((line) => {
    lineToFeedId[line] = 36;
  });
  lineToFeedId["L"] = 2;
  lineToFeedId["SIR"] = 11;
  lineToFeedId["G"] = 31;
  lineToFeedId["7"] = 51;
  return lineToFeedId;
}

module.exports = {
  getNextTrainTimes: getNextTrainTimes,
  getNextBusTimes: getNextBusTimes,
  parseArrivalTimes: parseArrivalTimes,
  makeRequest: makeRequest,
  validateInputs: validateInputs,
  formatArrivalTimes: formatArrivalTimes,
  buildStops: buildStops,
  buildFeedIds: buildFeedIds,
  buildStopData: buildStopData,
  buildFeedData: buildFeedData
}
