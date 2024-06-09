// classes to define behaviour of pages / charts / metrics (attributes, regions and fuels)

// PAGES
class Chart {
	// VARIABLES
	id = '';
	icon = '';
	name = '';
	attributes = new Attribute();
	fuels = new Fuel();
	regions = new Region();

	width = 720;
	height = (this.width * 3) / 4;
	padding = [25, 25, 25, 25]; // TOP, RIGHT, BOTTOM, LEFT
	transitionDuration = 500;

	// CONSTRUCTOR
	constructor(id, name, icon, padding, attributes, fuels, regions, draw, hover) {
		this.id = id;
		this.name = name;
		this.padding = padding;
		this.icon = icon;
		this.attributes = attributes;
		this.fuels = fuels;
		this.regions = regions;
		this.draw = draw;
		this.hover = hover;
	}

	// GETTERS
	get id() {
		return this.id;
	}
	get icon() {
		return this.icon;
	}
	get attributes() {
		return this.attributes;
	}
	get fuels() {
		return this.fuels;
	}
	get regions() {
		return this.regions;
	}

	get isCurrent() {
		return currentChart == this;
	}

	get width() {
		return this.width;
	}
	get height() {
		return this.height;
	}
	get topPadding() {
		return this.padding[0];
	}
	get rightPadding() {
		return this.padding[1];
	}
	get bottomPadding() {
		return this.padding[2];
	}
	get leftPadding() {
		return this.padding[3];
	}
	get transitionDuration() {
		return this.transitionDuration;
	}

	get chartContainer() {
		return d3.selectAll('#chart #' + this.id);
	}
	get svg() {
		return d3.selectAll('#chart #' + this.id + ' svg');
	}
	get chartMain() {
		return d3.selectAll('#chart #' + this.id + ' svg g.chart_main');
	}

	// METHODS
	init = () => {
		// GENERAL CHART INITIALISATION
		// protect against multiple initialisations
		if (this.chartContainer.empty()) {
			// create a chart container for this page
			let container = d3.select('#chart').append('div').attr('id', this.id).attr('data-chart', this.id);

			// INIT FILTERS
			let header = container.append('div').attr('class', 'chart_header');
			this.initFilter(this.attributes, header);
			this.initFilter(this.regions, header);
			this.initFilter(this.fuels, header);

			// INIT RESET
			header.append('div').attr('class', 'reset').append('a').text('Reset').attr('data-chart', this.id).on('click', this.reset);

			// INIT SVG
			container
				.append('div')
				.attr('class', 'chart_svg')
				.append('svg')
				.attr('viewBox', '0 0 ' + this.width + ' ' + this.height)
				.attr('preserveAspectRatio', 'xMinYMid meet')
				.append('g')
				.classed('chart_main', true);

			// draw chart
			this.draw();
		}
	};

	// create filter for metric
	initFilter = (metric, header) => {
		let chart = this;
		let container = header.append('section').attr('class', 'filters').attr('id', metric.name);
		container.append('h2').text(metric.title);

		// APPEND LIST OF FILTERS
		var filters = container.selectAll('div.filter_item').data(metric.possible).enter().append('div').classed('filter_item', true).classed('current', metric.isCurrent);

		Object.values(Metric.COLOR_TYPES).forEach((color_type) => {
			filters.style(`--filter-${color_type}-color`, (value) => metric.color(value, color_type));
		});

		// ON CLICK
		filters.on('click', function (ev, value) {
			chart.filter(metric, value);
		});

		// FUEL AND REGION HOVER
		if (metric.name != 'attribute') {
			filters.on('mouseover mouseout', chart.hover);
		}

		filters
			.append('div')
			.classed('label', true)
			.text(function (value) {
				let label = metric.label(value);
				if (metric.name == 'attribute') {
					let unit = metric.unit(value);
					if (value != Attribute.PER_FED && value != Attribute.PER_REG) {
						unit = unit.substring(1);
					} // remove leading space
					label += ' (' + unit + ')';
				}
				return label;
			}); // text labels

		metric.filters = filters; // set the list of filters to the metric variable
	};

	// reset the chart
	reset = () => {
		// reset metrics
		this.attributes.reset();
		this.fuels.reset();
		this.regions.reset();
		// update the chart (re-chart)
		this.draw();
	};

	// update tooltip
	tooltip = (ev, content) => {
		let tooltip = d3.select('#tooltip');

		switch (ev.type) {
			case 'mouseover':
				// update tooltip
				tooltip.html(content).classed('visible', true);
				break;
			case 'mousemove':
				// move tooltip
				var x = +d3.pointer(ev, d3.select('body'))[0],
					y = +d3.pointer(ev, d3.select('body'))[1];
				tooltip.style('left', x + 'px').style('top', y + 5 + 'px');
				break;
			case 'mouseout':
				tooltip.classed('visible', false);
				break;
			default:
				break;
		}
	};

	// filter the metric by the value
	filter = (metric, value) => {
		// only remake chart if the current value is changed
		if (metric.toggle(value)) {
			// remove or add the filter value
			this.draw(); // update chart
			metric.updateFilters(); // update metric
		}
	};
}

// METRICS
class Metric {
	name = 'metric';
	title = 'Metric';
	options = []; // all value options for this metric in any chart
	initial = []; // the inital set of values for this metric
	current = []; // the current set of values for this metric
	minCurrent = 1; // the minimum current values allowed
	possible = []; // all options for this metric in this chart
	dict = {}; // the dictionary for labels of values
	colors = {}; // set of colors for metric values

	filters; // list of filters for this metric
	legends; // list of legends for this metric

	constructor(possible, current, minCurrent) {
		this.possible = possible;
		this.current = current;
		this.initial = current;
		this.minCurrent = minCurrent ? minCurrent : 1;
	}

	// GETTERS
	get name() {
		return this.name;
	}
	get metricKey() {
		return this.name.toUpperCase();
	}
	get classPath() {
		return '.' + this.name;
	}

	get isList() {
		return typeof this.current == 'object';
	}

	get options() {
		return this.options;
	}
	get initial() {
		return this.initial;
	}
	get current() {
		return this.current;
	}
	get possible() {
		return this.possible;
	}

	get dict() {
		return this.dict;
	}

	// METHODS
	// is the value possible in this metric
	isCurrent = (value) => {
		return this.isList ? this.current.includes(value) : this.current == value;
	};
	isPossible = (value) => {
		return this.possible.includes(value);
	};
	isOption = (value) => {
		return this.options.includes(value);
	};

	// order two values
	order = (a, b) => {
		return this.options.indexOf(a) - this.options.indexOf(b);
	};
	// sort the current values
	sort = () => {
		this.isList && this.current.sort(this.order);
	};

	// toggle a value in current
	toggle = (value) => {
		if (!this.isList) {
			if (this.current == value) {
				return false;
			} // dont change the value if its already current
			this.current = value;
		} else if (this.isCurrent(value)) {
			this.current = this.current.filter(function (filterValue) {
				return filterValue != value;
			});
			// reset if there will only be one left
			if (this.current.length < this.minCurrent) {
				this.current = this.possible;
			}
		} else {
			this.current.push(value);
		}

		this.sort(); // sort to keep order
		return true;
	};

	// reset the metric
	reset = () => {
		this.current = this.initial; // set current to initial
		this.updateFilters(); // reset the filters
	};

	// update the styling of the filters
	updateFilters = () => {
		if (this.filters) {
			this.filters.classed('current', this.isCurrent);
		}
	};

	// grab the label for a value
	label = (value) => {
		return this.dict[value];
	};

	static COLOR_TYPES = Object.freeze({
		MAIN: 'main',
		MAIN_BACKGROUND: 'main-background',
		INACTIVE: 'inactive',
		INACTIVE_BACKGROUND: 'inactive-background',
		HOVER: 'hover',
		HOVER_BACKGROUND: 'hover-background',
	});

	// get the color for a value
	color = (value, color_type = Metric.COLOR_TYPES.MAIN) => {
		var { h: h_orig, s: s_orig, l: l_orig } = d3.scaleOrdinal(Object.values(this.colors).map((colorMap) => colorMap)).domain(this.options)(value);
		var h = h_orig != undefined ? h_orig : 0;
		var s = s_orig != undefined ? s_orig : 100;
		var l = l_orig != undefined ? l_orig : 70;
		switch (color_type) {
			case Metric.COLOR_TYPES.MAIN:
				l += 15;
				break;
			case Metric.COLOR_TYPES.MAIN_BACKGROUND:
				l += 30;
				break;
			case Metric.COLOR_TYPES.INACTIVE:
			case Metric.COLOR_TYPES.INACTIVE_BACKGROUND:
				l = 96;
				break;
			case Metric.COLOR_TYPES.HOVER:
				break;
			case Metric.COLOR_TYPES.HOVER_BACKGROUND:
				l += 20;
				break;
		}
		switch (color_type) {
			case Metric.COLOR_TYPES.MAIN:
			case Metric.COLOR_TYPES.MAIN_BACKGROUND:
			case Metric.COLOR_TYPES.HOVER:
			case Metric.COLOR_TYPES.HOVER_BACKGROUND:
				l = l > 90 && l != l_orig ? 90 : l;
				break;
		}
		return `hsl(${h}, ${s}%, ${l}%)`;
	};
	colorHover = (value, a) => {
		return this.color(value, Metric.COLOR_TYPES.HOVER);
	};
}

// ATTRIBUTES
class Attribute extends Metric {
	// CONSTANTS
	static CONSUMP = 'CONSUMP';
	static PER_REG = 'PER_REG';
	static PER_FED = 'PER_FED';
	static PER_CAP = 'PER_CAP';
	static PER_GSP = 'PER_GSP';

	// ATTRIBUTE SPECIFIC VARIABLES
	name = 'attribute';
	title = 'View As';
	options = [Attribute.CONSUMP, Attribute.PER_REG, Attribute.PER_FED, Attribute.PER_CAP, Attribute.PER_GSP];
	dict = {
		REGION: 'Region',
		FUEL: 'Fuel',
		CONSUMP: 'Consumption',
		PER_REG: 'Percentage of Regional Consumption',
		PER_FED: 'Percentage of Federal Consumption',
		PER_CAP: 'Per Capita',
		PER_GSP: 'Per Gross State Product',
	};

	colors = {
		REGION: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
		FUEL: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
		CONSUMP: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
		PER_REG: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
		PER_FED: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
		PER_CAP: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
		PER_GSP: { h: 200, s: 100, l: 60 }, // LIGHT BLUE
	};

	// CONSTRUCTOR
	constructor(possible, current, minCurrent) {
		super(possible, current, minCurrent);
	}

	// METHODS
	// get the attribute unit for a value
	unit = (value) => {
		switch (value) {
			case Attribute.CONSUMP:
				return ' PJ';
				break;
			case Attribute.PER_REG:
			case Attribute.PER_FED:
				return '%';
				break;
			case Attribute.PER_CAP:
				return ' GJ per capita';
				break;
			case Attribute.PER_GSP:
				return ' GJ per million dollars of GSP';
				break;

			default:
				return '';
				break;
		}
	};
}

// FUEL
class Fuel extends Metric {
	// CONSTANTS
	static COAL = 'COAL';
	static OIL = 'OIL';
	static GAS = 'GAS';
	static RENEW = 'RENEW';
	static TOTAL = 'TOTAL';

	// FUEL SPECIFIC VARIABLES
	name = 'fuel';
	title = 'Fuel';
	options = [Fuel.COAL, Fuel.OIL, Fuel.GAS, Fuel.RENEW, Fuel.TOTAL];
	dict = {
		COAL: 'Coal',
		OIL: 'Oil',
		GAS: 'Gas',
		RENEW: 'Renewables',
		TOTAL: 'Total',
	};
	colors = {
		COAL: { h: 90, s: 75, l: 60 }, // GREEN
		OIL: { h: 205, s: 75, l: 60 }, // BLUE
		GAS: { h: 260, s: 70, l: 60 }, // PURPLE
		RENEW: { h: 325, s: 75, l: 60 }, // PINK
		TOTAL: { h: 0, s: 100, l: 100 }, // WHITE FOR TOTAL - NEVER SHOWN
	};

	// CONSTRUCTOR
	constructor(possible, current, minCurrent) {
		super(possible, current, minCurrent);
	}
}

// REGION
class Region extends Metric {
	// CONSTANTS
	static AUS = 'AUS';
	static NSW = 'NSW';
	static VIC = 'VIC';
	static QLD = 'QLD';
	static WA = 'WA';
	static SA = 'SA';
	static TAS = 'TAS';
	static NT = 'NT';

	// REGION SPECIFIC VARIABLES
	name = 'region';
	title = 'Region';
	options = [Region.AUS, Region.NSW, Region.VIC, Region.QLD, Region.WA, Region.SA, Region.TAS, Region.NT];
	dict = {
		AUS: 'Australia',
		NSW: 'New South Wales & Australian Capital Territory',
		VIC: 'Victoria',
		QLD: 'Queensland',
		WA: 'Western Australia',
		SA: 'South Australia',
		TAS: 'Tasmania',
		NT: 'Northern Territory',
	};
	colors = {
		AUS: { h: 0, s: 0, l: 60 }, // GREY
		NSW: { h: 360, s: 90, l: 55 }, // RED
		VIC: { h: 30, s: 90, l: 55 }, // ORANGE
		QLD: { h: 55, s: 90, l: 55 }, // YELLOW
		WA: { h: 120, s: 90, l: 55 }, // GREEN
		SA: { h: 180, s: 90, l: 55 }, // CYAN
		TAS: { h: 220, s: 90, l: 55 }, // BLUE
		NT: { h: 300, s: 90, l: 55 }, // MAGENTA
	};

	// CONSTRUCTOR
	constructor(possible, current, minCurrent) {
		super(possible, current, minCurrent);
	}

	// METHODS
	label = (value) => {
		return value == Region.NSW ? 'NSW & ACT' : value;
	};
	fullLabel = (value) => {
		return this.dict[value];
	};
}
