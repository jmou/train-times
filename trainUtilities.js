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


async function getNextBusTimes() {

  // TODO add B54 line?
  // TODO add walk_time to each station
  let BUS_STOPS = [
//    {'line': 'B25', 'station': 'FULTON ST/JAY ST', 'direction': 'W', 'stop_id': '302433'},
//    {'line': 'B26', 'station': 'FULTON ST/JAY ST', 'direction': 'W', 'stop_id': '302433'},
//    {'line': 'B38', 'station': 'FULTON ST/JAY ST', 'direction': 'W', 'stop_id': '302433'},
//    {'line': 'B52', 'station': 'FULTON ST/JAY ST', 'direction': 'W', 'stop_id': '302433'},
    {'line': 'B25', 'station': 'FULTON ST/HOYT ST', 'direction': 'E', 'stop_id': '307491', 'walk_time': 1},
//    {'line': 'B26', 'station': 'FULTON ST/HOYT ST', 'direction': 'E', 'stop_id': '307491'},
    {'line': 'B38', 'station': 'FULTON ST/HOYT ST', 'direction': 'E', 'stop_id': '307491', 'walk_time':1}
//    {'line': 'B52', 'station': 'FULTON ST/HOYT ST', 'direction': 'E', 'stop_id': '307491'},
//    {'line': 'B57', 'station': 'JAY ST/FULTON ST', 'direction': 'S', 'stop_id': '305211'},
//    {'line': 'B57', 'station': 'JAY ST/FULTON ST', 'direction': 'NE', 'stop_id': '307907'}
  ]

  let results = [];

  for (let i = 0; i < BUS_STOPS.length; i++) {
    let bus_stop = BUS_STOPS[i];
    let stopId = bus_stop["stop_id"];
    let busLine = bus_stop["line"]

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

    //let deltaTimes = formatArrivalTimes(departTimes);
    let result = departTimes.map(function(t) {return {time: t, line:busLine, station:bus_stop.station, direction:bus_stop.direction};});
    results.push(...result);
  };



  return results
}


async function getNextTrainTimes() {

  // TODO (optional) reduce number of API calls with feedID
  // TODO figure out rate limit?
  // TODO error handling
  // TODO filter the results to contain relevant ones only
  // TODO sort the results
  // TODO add "updated at ..." time for frontend?
  // TODO check where the direction "N"/"S" is coming from;
  //      optionally, edit the returned-json-parsing to get the actual bound name


  let TRAIN_STOPS = [
    {line:"2",stop_id:"233"},
//    {line:"3",stop_id:"233"},
    {line:"Q",stop_id:"R30"},
//    {line:"B",stop_id:"R30"},
//    {line:"D",stop_id:"R30"},
    {line:"N",stop_id:"R30"},
    {line:"R",stop_id:"R29"},
//    {line:"W",stop_id:"R29"},
    {line:"A",stop_id:"A41"},
    {line:"C",stop_id:"A41"},
    {line:"F",stop_id:"A41"},
    {line:"G",stop_id:"A42"}
//    {line:"4",stop_id:"232"},
//    {line:"5",stop_id:"232"}
  ]

  let STATION_INFO = {
    "233": {station:"Hoyt St", walk_time:1},
    "R30": {station:"Dekalb Ave", walk_time:6},
    "R29": {station:"Jay St - MetroTech", walk_time:1},
    "A41": {station:"Jay St - MetroTech", walk_time:4},
    "A42": {station:"Hoyt - Schermerhorn", walk_time:5},
    "232": {station:"Borough Hall", walk_time:4},
  }


  let results = [];
  for (let i = 0; i < TRAIN_STOPS.length; i++) {
    let train_stop = TRAIN_STOPS[i];
    let trainLine = train_stop.line;
    let stopId = train_stop.stop_id;

    let feed = await retryMakeRequest(trainLine);

    for (const direction of ["N","S"]) {
      let arrivalTimes = parseArrivalTimes(feed, trainLine, stopId, direction);
      //let deltaTimes = formatArrivalTimes(arrivalTimes);
      let result = arrivalTimes.map(function(t) {return {time: new Date(t), line:trainLine, station:STATION_INFO[stopId].station, direction:direction};});
      results.push(...result);
    };
  };

  return results;
}

const ATTEMPTS = 5

async function retryMakeRequest (trainLine, attempts = 0) {
  let body = await makeRequest(trainLine);

  try {
    return GtfsRealtimeBindings.FeedMessage.decode(body);
  } catch (error) {
    if (attempts < ATTEMPTS) {
      console.log(`retrying request for ${trainLine}`)
      return retryMakeRequest(trainLine, attempts + 1)
    } else {
      throw new Error(`failed to parse successful response after ${ATTEMPTS} attempts`)
    }
  }
}

async function getNextTransitTimes() {
  [bustime, traintime] = await Promise.all([getNextBusTimes(), getNextTrainTimes()]);
  return [...bustime, ...traintime];
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

  console.log(`GET ${requestSettings.url}`)

  return new Promise(function(resolve, reject) {
    request(requestSettings, (error, response, body) => {
      if (!/gtfs/.test(response.headers['content-disposition'])) {
        console.error('rejecting headers', response.headers)
        console.error('body for rejected headers', body)
      } else if (!error && response.statusCode == 200) {
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
    //console.log((arrival - Date.now())/60000)
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
  getNextTransitTimes: getNextTransitTimes,
  parseArrivalTimes: parseArrivalTimes,
  makeRequest: makeRequest,
  validateInputs: validateInputs,
  formatArrivalTimes: formatArrivalTimes,
  buildStops: buildStops,
  buildFeedIds: buildFeedIds,
  buildStopData: buildStopData,
  buildFeedData: buildFeedData
}
