// list of charts
var parCoord, stackedBar;
var currentChart = stackedBar;
var charts = [stackedBar, parCoord];

// store the nav links globally
var links;

// store data globally
var dataOrig = [];

const init = () => {
	// NAVIGATION
	links = d3
		.select('#chart_links')
		.selectAll('a')
		.data(charts)
		.enter()
		.append('a')
		.attr('data-chart', function (chart) {
			return chart.id;
		});
	links.append('i').attr('class', function (chart) {
		return `fa-solid fa-${chart.icon}`;
	});
	links
		.append('div')
		.attr('class', 'chart-label')
		.text(function (chart) {
			return chart.name;
		});

	links
		.each(function (chart) {
			d3.select(this).classed('active_chart', chart.isCurrent);
		})
		.on('mouseover mouseout', function (ev, chart) {
			d3.select(this).classed('active_chart', chart.isCurrent);
		});

	// get data
	d3.csv('data/data.csv', function (d) {
		//  convert to numbers
		return {
			REGION: d.REGION,
			FUEL: d.FUEL,
			CONSUMP: +d.CONSUMP,
			PER_REG: +d.PER_REG,
			PER_FED: +d.PER_FED,
			PER_CAP: +d.PER_CAP,
			PER_GSP: +d.PER_GSP,
		};
	}).then(afterDataParse);
};

// after data is parsed, do this
function afterDataParse(data) {
	dataOrig = data; // set data to global variable
	charts.forEach(function (chart) {
		chart.init();
		d3.selectAll('[data-chart="' + chart.id + '"]').classed('active_chart', chart.isCurrent);
	}); // initialise all chart charts

	links.on('click', function (ev, newCurrentChart) {
		if (newCurrentChart != currentChart) {
			currentChart = newCurrentChart;
		}
		charts.forEach(function (chart) {
			d3.selectAll('[data-chart="' + chart.id + '"]').classed('active_chart', chart.isCurrent);
		});
	}); // change focus of page
}

window.addEventListener('load', init);
