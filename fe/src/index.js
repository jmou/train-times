import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import PropTypes from 'prop-types'

const ListHeader = () => (
		<div>
			This is the header.
		</div>
);

const ArrivalsList = ({ arrivals }) => (
	<table className="arrivals-list">
		<tbody>
			{arrivals.map(arrival => <ArrivalsListItem key={arrival.time} station={arrival.station}/>)}
		</tbody>
	</table>
);

const ArrivalsListItem = ({ station }) => (
	<td>
		{station}
	</td>
);

const ArrivalIcon = 0;

const testArrivals = [
	{time: 4, line: "2", station: 233, direction: 'N'},
	{time: 6, line: "2", station: 233, direction: 'N'},
	{time: 12, line: "2", station: 233, direction: 'N'},
]

ReactDOM.render(
	<div>
		<ListHeader/>
		<ArrivalsList arrivals = {testArrivals}/>
	</div>
	, document.getElementById('root'));