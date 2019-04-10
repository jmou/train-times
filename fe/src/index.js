import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import PropTypes from 'prop-types'
import superagent from 'superagent'
import groupBy from 'lodash.groupby'
import moment from 'moment-timezone'

moment.defineLocale('en-trains', {
  parentLocale: 'en',
  relativeTime : {
    future: "%s",
    past:   "%s ago",
    s  : 'a few seconds',
    ss : '%d seconds',
    m:  "1 min",
    mm: "%d mins",
    h:  "1 hour",
    hh: "%d hours",
    d:  "a day",
    dd: "%d days",
    M:  "a month",
    MM: "%d months",
    y:  "a year",
    yy: "%d years"
  }
});

moment.relativeTimeThreshold('m', 100);

function importAll(r) {
	let images = {};
	r.keys().map((item, index) => { images[item.replace('./', '')] = r(item); });
	return images;
}

const subwayIcons = importAll(require.context('./subway_img', false, /\.(png|jpe?g|svg)$/));

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      arrivals: []
    }
  }

  componentDidMount () {
    this.fetch()
    setInterval(() => this.fetch(), 1000 * 60)

    this.tick()
    setInterval(() => this.tick(), 1000 * 5)
  }

  tick () {
    this.setState({now: moment()})
  }

  fetch () {
    fetch('http://localhost:3000/next-transit-times')
      .then((resp) => {
        if (/json/.test(resp.headers.get('content-type'))) {
          return resp
        } else {
          throw new Error(`unknown content type "${resp.headers.get('content-type')}"`)
        }
      })
      .then((resp) => resp.json())
      .then((arrivals) => this.setState({arrivals}))
      .catch((err) => console.error(err))
  }

	render() {
		return(
			<div>
				<Arrivals arrivals={this.state.arrivals} now={this.state.now} />
			</div>
		);
	}
};

const ListHeader = () => (
	<div className="list-header">
		DEPARTURES
	</div>
);

const sortAndFilterArrivals = (arrivals, now) => {
  const futureArrivals = arrivals.filter((a) => {
    const minutes = moment(a.time).diff(now, 'minutes')

    if (walkTimes[a.station] && walkTimes[a.station][a.line]) {
      return minutes > walkTimes[a.station][a.line]
    } else {
      return minutes >= 1
    }
  })

  const groups = groupBy(futureArrivals, (a) => `${a.line}${a.station}`)

  return Object.values(groups).map((group) => {
    const northbound = group.filter((a) => 'NW'.includes(a.direction))
    const southbound = group.filter((a) => 'SE'.includes(a.direction))

    return {
      n: northbound.length ? findBestArrival(northbound) : null,
      s: southbound.length ? findBestArrival(southbound) : null
    }
  })
}

let walkTimes = {
  "Hoyt St": {
    "2": 1,
    "3": 1,
  },
  "Dekalb Ave": {
    "Q": 6,
    "B": 6,
    "D": 6,
    "N": 6,
    "R": 6,
    "W": 6,
  },
  "Jay St - MetroTech": {
    "N": 1,
    "R": 1,
    "W": 1,
    "A": 4,
    "C": 4,
    "F": 4
  },
  "Hoyt - Schermerhorn": {
    "G": 5,
    "A": 5,
    "C": 5,
  },
  "Borough Hall": {
    "4": 4,
    "5": 4
  }
}

function findBestArrival (arrivals) {
  return arrivals.reduce((x, y) => {
    return +new Date(x.time) < +new Date(y.time) ? x : y
  })
}

class Arrivals extends React.Component {
	render() {
    const {arrivals, now} = this.props;

		return(
			<div>
				<Header/>
				<ArrivalsList arrivals={sortAndFilterArrivals(arrivals, now)} now={now} />
			</div>
		);
	}
};

const ArrivalsList = ({ arrivals, now }) => {
  const elements = arrivals.map((info, index) => {
    return <BiDirectionalArrival key={index} now={now} {...info} />
  })

  return (
    <div className="arrivals-list">
      {elements}
    </div>
  )
};

const Header = () => (
	<div className="arrivals-header">
	</div>
);

// TODO: group the rows by line;
//       show only one line icon
const BiDirectionalArrival = ({ n: northboundArrival, s: southboundArrival, now }) => {
  return [
    northboundArrival && <Arrival key="northbound" arrival={northboundArrival} now={now} />,
    southboundArrival && <Arrival key="southbound" arrival={southboundArrival} now={now} />
  ]
}

const Arrival = ({ arrival, now }) => {
	//fix this JSX to return seperate elements for each thing to display
  return (
    <div className="arrival-info">
      <span className="arrival-time">{moment(arrival.time).fromNow()}</span>
      <span className="arrival-direction">{arrival.direction}</span>
      <LineIcon>{arrival.line}</LineIcon>
      <span className="station-name">{arrival.station}</span>
    </div>
  )
};

const LineIcon = ({ children }) => (
  `${children}_bullet.png` in subwayIcons ? (
    <img className="line-icon" src={subwayIcons[`${children}_bullet.png`]}/>
  ) : (
    children
  )
);

ReactDOM.render(<App />, document.getElementById('root'))
