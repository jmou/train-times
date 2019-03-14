# Train Times API
This API is a wrapper around the MTA's [GTFS specification](http://datamine.mta.info/). You can use it to:
1. Find the next trains coming to your station
2. Get a JSON object mapping train lines to their corresponding MTA feed id's.
3. Get a JSON object with relevant information for all MTA stops.  

This is a project built by [Mari](https://github.com/mgalicer) and [Patrick](https://github.com/merklebros).

## Set up the project
1. Clone the repo
```
git clone https://github.com/mgalicer/train-times.git
```

2. Install dependencies
[npm](https://www.npmjs.com/) 
[NodeJS](https://nodejs.org/en/)
```
cd train-times/
npm install
```

3. Register for an API key on the [MTA's website](https://datamine.mta.info/user/register)

4. Add your API key to the script
```
touch .env
echo "MTA_KEY=MY_MTA_KEY" >> .env
```
5. If you also want bus data, register for an MTA BusTime Developer API Key on the [MTA's Google form](https://docs.google.com/forms/d/e/1FAIpQLSfGUZA6h4eHd2-ImaK5Q_I5Gb7C3UEP5vYDALyGd7r3h08YKg/viewform?hl=en)

6. After 5, add your API key to the script
```
touch .env
echo "MTA_BUS_KEY=MY_MTA_BUS_KEY" >> .env
```

7. Add the port you want to use to develop locally
```
echo "PORT=3000" >> .env
```

8. Run the API
```
npm start
```

### Endpoints
Both train and bus JSON objects are formatted as below:
```
[{
	time: 8,
	line: "B25",
	station: "FULTON ST/JAY ST",
	direction: "W"
 },
...]
```
We made it easy for you so it returns all train/bus data relevant to RC.
You can access them through the following endpoints:
##### Get an array of JSON objects with :train: data
```localhost:3000/next-train-times```
##### Get an array of JSON objects with :bus: data
```localhost:3000/next-bus-times```
