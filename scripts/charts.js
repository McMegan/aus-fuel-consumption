// PARALLEL COORDINATES
parCoord = new Chart(
	'parCoord',
	'Parallel Coordinates Chart',
	'chart-column',
	[25, 45, 30, 45],
	new Attribute([Attribute.CONSUMP, Attribute.PER_REG, Attribute.PER_CAP, Attribute.PER_GSP], Attribute.CONSUMP),
	new Fuel([Fuel.COAL, Fuel.OIL, Fuel.GAS, Fuel.RENEW], [Fuel.COAL, Fuel.OIL, Fuel.GAS, Fuel.RENEW], 2),
	new Region(
		[Region.AUS, Region.NSW, Region.VIC, Region.QLD, Region.WA, Region.SA, Region.TAS, Region.NT],
		[Region.AUS, Region.NSW, Region.VIC, Region.QLD, Region.WA, Region.SA, Region.TAS, Region.NT],
		1
	),
	// chart function -- create or update chart
	() => {
		let chart = parCoord;

		// DATA
		// group data by region & filter original data for fuels
		data = chart.regions.current.map(function (region) {
			let temp = { REGION: region };

			let regionData = dataOrig.filter(function (datum) {
				return region == datum.REGION;
			});
			temp.DATA = [];
			chart.fuels.current.forEach(function (fuel) {
				temp.DATA.push({
					REGION: region,
					FUEL: fuel,
					VALUE: regionData.filter(function (datum) {
						return fuel == datum.FUEL;
					})[0][chart.attributes.current],
				});
			});
			return temp;
		});

		// SCALES
		// x scale -- depeds on current fuels
		var xScale = d3
			.scalePoint()
			.domain(chart.fuels.current)
			.rangeRound([chart.leftPadding, chart.width - chart.rightPadding]);

		// y scale domain -- depends on current attribute
		var yDomain =
			chart.attributes.isCurrent(Attribute.PER_REG) || chart.attributes.isCurrent(Attribute.PER_FED)
				? [0, 100]
				: [
						0,
						d3.max(data, function (group) {
							return d3.max(group.DATA, function (datum) {
								return datum.VALUE;
							});
						}),
				  ];

		// y scale
		var yScale = d3
			.scaleLinear()
			.domain(yDomain)
			.nice()
			.range([chart.height - chart.bottomPadding, chart.topPadding]);

		// CALC LINES FOR DATA
		data.forEach(function (datum) {
			for (let i = 0; i < datum.DATA.length; i++) {
				let nextIndex = i == datum.DATA.length - 1 ? i : i + 1;
				datum.DATA[i].LINE = {
					x1: xScale(datum.DATA[i].FUEL),
					y1: yScale(datum.DATA[i].VALUE),
					x2: xScale(datum.DATA[nextIndex].FUEL),
					y2: yScale(datum.DATA[nextIndex].VALUE),
				};
			}
		});

		// AXES -- behind lines
		// add or update x-axis
		var xAxis = chart.svg.select('g.x.axis');
		if (xAxis.empty()) {
			xAxis = chart.svg
				.append('g')
				.attr('transform', 'translate(0, ' + (chart.height - chart.bottomPadding) + ')')
				.classed('x axis', true);
		}
		xAxis.call(d3.axisBottom().tickValues(chart.fuels.current).tickFormat(chart.fuels.label).scale(xScale));

		// remove lines from x axis
		xAxis.selectAll('path').remove();
		xAxis.selectAll('line').remove();

		// add or update y-axis groups
		var yAxes = chart.chartMain
			.selectAll('g.y.axis')
			.data(chart.fuels.current)
			.join(
				(enter) => enter.append('g').classed('y axis', true),
				(update) => update,
				(exit) => exit.remove()
			)
			.attr('transform', function (datum) {
				return 'translate(' + xScale(datum) + ', 0)';
			});

		// draw y axes
		yAxes.call(d3.axisLeft().scale(yScale).ticks(10));

		// style y axes - remove lines and tick marks
		yAxes.selectAll('.tick:not(:first-of-type):not(:last-of-type) line').attr('x2', function () {
			return d3.select(this).attr('x2') / 2;
		});
		// remove axis labels on every axis but the first
		yAxes.each(function (datum, index) {
			if (index != 0) {
				d3.select(this).selectAll('.tick text').remove();
			}
		});

		// MAIN CHART
		// create groups for regions
		var groups = chart.chartMain
			.selectAll('g.region_groups')
			.data(data)
			.join(
				(enter) => enter.append('g').classed('region_groups', true),
				(update) => update,
				(exit) => exit.remove()
			);

		// create lines
		groups
			.selectAll('line')
			.data(function (datum) {
				return datum.DATA;
			})
			.join(
				(enter) => enter.append('line'),
				(update) => update,
				(exit) => exit.remove()
			)
			.attr('x1', function (datum) {
				return datum.LINE.x1;
			})
			.attr('x2', function (datum) {
				return datum.LINE.x2;
			})
			.attr('y1', function (datum) {
				return datum.LINE.y1;
			})
			.attr('y2', function (datum) {
				return datum.LINE.y2;
			})

			.style('stroke-width', '2px')
			.style('stroke', function (datum) {
				return chart.regions.color(datum.REGION);
			});

		// create points
		groups
			.selectAll('circle')
			.data(function (datum, index) {
				return data[index].DATA;
			})
			.join(
				(enter) => enter.append('circle'),
				(update) => update,
				(exit) => exit.remove()
			)
			.attr('cx', function (datum) {
				return xScale(datum.FUEL);
			})
			.attr('cy', function (datum) {
				return yScale(datum.VALUE);
			})
			.attr('r', 3)
			.style('fill', function (datum) {
				return chart.regions.color(datum.REGION);
			});

		// line hover -- tooltip
		groups.selectAll('line').on('mouseover mousemove mouseout', function (ev, datum) {
			chart.hover(ev, datum.REGION);

			let text = '<div class="label">' + chart.attributes.label(chart.attributes.current) + ' by ' + chart.regions.fullLabel(datum.REGION) + '</div>';

			chart.tooltip(ev, text);
		});

		// circle hover -- tooltip
		groups.selectAll('circle').on('mouseover mousemove mouseout', function (ev, datum) {
			chart.hover(ev, datum.REGION);

			let text = '<div class="label">' + chart.fuels.label(datum.FUEL) + ' ' + chart.attributes.label(Attribute.CONSUMP) + ' by ' + chart.regions.fullLabel(datum.REGION) + '</div>';
			text += '<div class="value"><strong>' + datum.VALUE.toFixed(1) + chart.attributes.unit(chart.attributes.current) + '</strong></div>';

			chart.tooltip(ev, text);
		});
	},
	// hover function -- what to do on hover of datum
	(ev, hoverValue) => {
		let chart = parCoord;
		let metric = chart.regions.isOption(hoverValue) ? chart.regions : chart.fuels;

		let color = ev.type == 'mouseout' ? metric.color : metric.colorHover;

		let strokeWidth = ev.type == 'mouseout' ? '2px' : '4px';
		let circleR = ev.type == 'mouseout' ? '3' : '5';

		// hightlight on chart
		chart.chartMain
			.selectAll('g.region_groups line')
			.filter(function (datum) {
				return datum.REGION == hoverValue;
			})
			.transition()
			.duration(chart.transitionDuration)
			.style('stroke', function (datum) {
				return color(datum.REGION);
			})
			.style('stroke-width', strokeWidth);

		chart.chartMain
			.selectAll('g.region_groups circle')
			.filter(function (datum) {
				return datum.REGION == hoverValue;
			})
			.transition()
			.duration(chart.transitionDuration)
			.attr('r', circleR)
			.style('fill', function (datum) {
				return color(datum.REGION);
			});
	}
);

// STACKED BAR
stackedBar = new Chart(
	'stackedBar',
	'Stacked Bar Chart',
	'chart-line',
	[20, 40, 25, 40],
	new Attribute([Attribute.CONSUMP, Attribute.PER_REG, Attribute.PER_CAP, Attribute.PER_GSP], Attribute.PER_REG),
	new Fuel([Fuel.COAL, Fuel.OIL, Fuel.GAS, Fuel.RENEW], [Fuel.COAL, Fuel.OIL, Fuel.GAS, Fuel.RENEW]),
	new Region(
		[Region.AUS, Region.NSW, Region.VIC, Region.QLD, Region.WA, Region.SA, Region.TAS, Region.NT],
		[Region.AUS, Region.NSW, Region.VIC, Region.QLD, Region.WA, Region.SA, Region.TAS, Region.NT],
		2
	),
	// chart function -- create or update chart
	() => {
		let chart = stackedBar;

		// DATA
		var data = chart.regions.possible.map(function (region) {
			return {
				REGION: region,
				DATA: dataOrig.filter(function (datum) {
					return region == datum.REGION && Fuel.TOTAL != datum.FUEL;
				}),
			};
		});

		// stack the data by fuel over filtered dataset
		var series = d3
			.stack()
			.keys(chart.fuels.possible)
			.value(function (datum, key) {
				return chart.fuels.isCurrent(key)
					? datum.DATA.find(function (datum) {
							return key == datum.FUEL;
					  })[chart.attributes.current]
					: 0;
			})(
			data.filter(function (datum) {
				return chart.regions.isCurrent(datum.REGION);
			})
		);

		// SCALES
		// x scale -- depeds on current regions
		var xScale = d3
			.scaleBand()
			.domain(chart.regions.current)
			.rangeRound([chart.leftPadding, chart.width - chart.rightPadding])
			.paddingInner(0.1);

		// y scale domain -- depends on current attribute
		var yDomain =
			chart.attributes.isCurrent(Attribute.PER_REG) || chart.attributes.isCurrent(Attribute.PER_FED)
				? [0, 100]
				: [
						0,
						d3.max(series, function (set) {
							return d3.max(set, function (datum) {
								return datum[1];
							});
						}),
				  ];

		// y scale
		var yScale = d3
			.scaleLinear()
			.domain(yDomain)
			.nice()
			.range([chart.height - chart.bottomPadding, chart.topPadding]);

		// GROUPS & BARS
		// fill on group, height on rect -- to allow simultaneous transitions
		var groups = chart.chartMain
			.selectAll('g.fuel_group')
			.data(series)
			.join(
				(enter) => enter.append('g').classed('fuel_group', true),
				(update) => update,
				(exit) => exit.remove()
			)
			.attr('fill', function (datum) {
				return chart.fuels.color(datum.key);
			});

		// BARS
		groups
			.selectAll('rect.bar')
			.data(function (data) {
				data.forEach(function (datum) {
					datum.FUEL = data.key;
					datum.REGION = datum.data.REGION;
				});
				return data;
			})
			.join(
				(enter) =>
					enter
						.append('rect')
						.classed('bar', true)
						.attr('x', function (datum) {
							return xScale(datum.data.REGION);
						})
						.attr('width', xScale.bandwidth())
						.attr('y', function (datum) {
							return yScale(datum[1]);
						})
						.attr('height', function (datum) {
							return yScale(datum[0]) - yScale(datum[1]);
						}),
				(update) => update,
				(exit) =>
					exit
						.transition()
						.duration(1000)
						.attr('x', chart.width * 2) // don't remove -- so it enters from side
						// keep updating so it looks right when it enters
						.attr('width', xScale.bandwidth())
						.attr('y', chart.height - chart.bottomPadding)
						.attr('height', 0)
			)
			// add transition
			.transition()
			.duration(1000)
			.attr('x', function (datum) {
				return xScale(datum.data.REGION);
			})
			.attr('width', xScale.bandwidth())
			.attr('y', function (datum) {
				return yScale(datum[1]);
			})
			.attr('height', function (datum) {
				return yScale(datum[0]) - yScale(datum[1]);
			});

		// AXES
		// add or update x-axis
		var xAxis = chart.svg.select('g.x.axis');
		if (xAxis.empty()) {
			xAxis = chart.svg
				.append('g')
				.classed('x axis', true)
				.attr('transform', 'translate(0, ' + (chart.height - chart.bottomPadding) + ')');
		}
		// update the x axis
		xAxis.call(d3.axisBottom().tickValues(chart.regions.current).tickFormat(chart.regions.label).scale(xScale));

		// add or update y-axis
		var yAxis = chart.svg.select('g.y.axis');
		if (yAxis.empty()) {
			yAxis = chart.svg
				.append('g')
				.classed('y axis', true)
				.attr('transform', 'translate(' + chart.leftPadding + ', 0)');
		}
		// update the y axis
		yAxis.call(d3.axisLeft().scale(yScale));

		// style axes - remove lines and tick marks
		chart.svg.selectAll('g.axis path.domain').remove();
		chart.svg.selectAll('g.axis .tick line').remove();

		// HOVER
		groups.on('mouseover mouseout', chart.hover); // groups hover

		// TOOLTIP
		// bars hover -- update tooltip
		groups.selectAll('rect.bar').on('mouseover mousemove mouseout', function (ev, data) {
			let datum = data.data.DATA.filter(function (datum) {
				return data.FUEL == datum.FUEL;
			})[0];

			let text = '<div class="label">' + chart.fuels.label(data.FUEL) + ' ' + chart.attributes.label(Attribute.CONSUMP) + ' by ' + chart.regions.fullLabel(data.REGION) + '</div>';

			text += '<div class="value">';
			if (chart.attributes.isCurrent(Attribute.CONSUMP)) {
				text += '<strong>' + datum.CONSUMP + chart.attributes.unit(Attribute.CONSUMP) + '</strong>';
				text += ' <span>(' + datum.PER_REG.toFixed(1) + chart.attributes.unit(Attribute.PER_REG) + ')</span>';
			}
			if (chart.attributes.isCurrent(Attribute.PER_REG)) {
				text += '<strong>' + datum.PER_REG.toFixed(1) + chart.attributes.unit(Attribute.PER_REG) + '</strong>';
				text += ' <span>(' + datum.CONSUMP + chart.attributes.unit(Attribute.CONSUMP) + ')</span>';
			}
			if (chart.attributes.isCurrent(Attribute.PER_CAP)) {
				text += '<strong>' + datum.PER_CAP.toFixed(1) + chart.attributes.unit(Attribute.PER_CAP) + '</strong>';
			}
			if (chart.attributes.isCurrent(Attribute.PER_GSP)) {
				text += '<strong>' + datum.PER_GSP.toFixed(1) + chart.attributes.unit(Attribute.PER_GSP) + '</strong>';
			}
			text += '</div>';

			chart.tooltip(ev, text);
		});
	},
	// hover function -- what to do on hover of datum
	(ev, datum) => {
		let chart = stackedBar;
		let hoverValue = chart.fuels.isOption(datum) ? datum : chart.regions.isOption(datum) ? datum : datum.key;
		let metric = chart.fuels.isOption(hoverValue) ? chart.fuels : chart.regions;
		let color = ev.type == 'mouseout' ? metric.color : metric.colorHover;

		// hightlight these rectangles on chart
		chart.chartMain
			.selectAll('g.fuel_group')
			.filter(function (datum) {
				return datum.key == hoverValue;
			})
			.transition()
			.duration(chart.transitionDuration)
			.style('fill', function (datum) {
				return color(datum.key);
			});
	}
);
