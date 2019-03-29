import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import PropTypes from 'prop-types'

function importAll(r) {
	let images = {};
	r.keys().map((item, index) => { images[item.replace('./', '')] = r(item); });
	return images;
}

const subwayIcons = importAll(require.context('./subway_img', false, /\.(png|jpe?g|svg)$/));

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
			{time: 4, line: "F", station: "Hoyt", direction: 'N'},
			{time: 6, line: "A", station: "DeKalb", direction: 'S'},
			{time: 12, line: "Q", station: "Jay", direction: 'N'},
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
	</div>
);

const Arrival = ({ arrivalInfo }) => (
	//fix this JSX to return seperate elements for each thing to display
	<div className="arrival-info">
		<span className="arrival-time">{arrivalInfo.time} MIN</span>
		<LineIcon>{arrivalInfo.line}</LineIcon>
		<span className="station-name">DEPARTING {arrivalInfo.station} FOR ANOTHER PLACE</span>
	</div>
);

const LineIcon = ({ children }) => (
	<img className="line-icon" src={subwayIcons[`${children}_bullet.png`]}/>
);

ReactDOM.render(
	<App/>
	, document.getElementById('root'));
