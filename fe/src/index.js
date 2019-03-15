import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import PropTypes from 'prop-types'

class App extends React.Component {
	render() {
		return(
			<div>
				<ListHeader/>
				<Arrivals/>
			</div>
		);
	}
};

const ListHeader = () => (
		<div className="list-header">
			DEPARTURES
		</div>
);

class Arrivals extends React.Component {
	state = {
		arrivals:[
			{time: 4, line: "2", station: 233, direction: 'N'},
			{time: 6, line: "2", station: 233, direction: 'N'},
			{time: 12, line: "2", station: 233, direction: 'N'},
		]
	};
		
	render() {
		return(
			<div>
				<Header/>
				<ArrivalsList arrivals={this.state.arrivals}/>
			</div>
		);
	}
};

const ArrivalsList = ({ arrivals }) => (
	<div className="arrivals-list">
		{arrivals.map(
			//replace key with actual ID from api, pass in all info
			arrivalInfo => <Arrival key={arrivalInfo.time} arrivalInfo={arrivalInfo}/>		
		)}
	</div>
);

const Header = () => (
	<div className="arrivals-header">
		<span>Time</span>
		<span>Line</span>
		<span>Direction</span>
		<span>Station</span>
	</div>
);

const Arrival = ({ arrivalInfo }) => (
	//fix this JSX to return seperate elements for each thing to display
	<div className="arrival-info">
		<span className="station-name">{arrivalInfo.station}</span>
		<span className="train-line">{arrivalInfo.line}</span>
		<span className="train-direction">{arrivalInfo.direction}</span>
	</div>
);

const testArrivals = [
	{time: 4, line: "2", station: 233, direction: 'N'},
	{time: 6, line: "2", station: 233, direction: 'N'},
	{time: 12, line: "2", station: 233, direction: 'N'},
]

ReactDOM.render(
	<App/>
	, document.getElementById('root'));
