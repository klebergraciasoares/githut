function flattenArray(array) {
	return [].concat.apply([],array);
}

function SmallMultiples(nested_data,options) {

	var INDICATOR=options.indicator || "cellule",
		METRIC=options.metric || "median";

	console.log(options)

	nested_data.forEach(function(d){
		d.values=d.values.sort(function(a,b){
			return (new Date(a.key).getTime()) - (new Date(b.key).getTime());
		});
	})

	function getNestedValues(indicator,metric) {
		return flattenArray(nested_data.map(function(d){
			return d.values.map(function(dd){
				return dd.values[indicator][metric];
			})
		}))
	}

	function updateExtents(data) {

		d3.entries(data[0].values[0].values).forEach(function(d){
			options.extents[d.key]={};
			options.extents[d.key][METRIC]=d3.extent(getNestedValues(d.key,METRIC))
		});

		console.log(options.extents)
	}

	updateExtents(nested_data);


	function createAverage() {
		return d3.nest()
					.key(function(d){
						return d.key;
					})
					.rollup(function(leaves){
						
						return {
							mean:d3.mean(leaves,function(l){
								return l.values[INDICATOR][METRIC]
							}),
							median:d3.median(leaves.sort(function(a,b){
								return a.values[INDICATOR][METRIC] - b.values[INDICATOR][METRIC];
							}),function(l){
								return l.values[INDICATOR][METRIC]
							})
						}
					})
					.entries(nested_data.map(function(d){
						return d.values;
					}).reduce(function(a, b) {
						return a.concat(b);
					}));
	}

	var avg=createAverage();
	console.log(avg)

	var WIDTH=150,
		HEIGHT=WIDTH*9/16;

	var margins={
		top:20,
		bottom:20,
		left:35,
		right:20
	}

	var padding={
		top:0,
		bottom:0,
		left:0,
		right:0
	}

	var container=options.container;

	d3.select(container)
		.append("h2")
			.text(options.title)

	var charts=d3.select(container)
		.selectAll("div")
		.data(nested_data)
		.enter()
		.append("div")
			.attr("id",function(d){
				return "p"+d.key;
			})
			.attr("class","chart")
			.classed("region",function(d){
				return d.key===0;
			})

	charts.append("h4")
			.text(function(d){
				return d.key;
			})

	var svgs=charts.append("svg")
			.attr("width",WIDTH)
			.attr("height",HEIGHT);

	var axes=svgs.append("g")
				.attr("id","axes")
				.attr("transform","translate("+margins.left+","+(HEIGHT-margins.bottom)+")");

	var linechart=svgs.append("g")
			.attr("class","linechart")
			.attr("transform","translate("+margins.left+","+margins.top+")");

	console.log("!!!!!!!!!!!!!!!!!!!",options.extents)

	var xscale=d3.time.scale().domain(options.extents.date).range([0,WIDTH-(margins.left+margins.right+padding.left+padding.right)]);
	var yscale=d3.scale.linear()
					.domain([options.extents[INDICATOR][METRIC][0]*0.1,options.extents[INDICATOR][METRIC][1]*1])
					.range([HEIGHT-(margins.bottom+margins.top),0]);//.nice();


	if(options.threshold) {
		var threshold=svgs.append("g")
				.attr("class","threshold")
				.attr("transform","translate("+margins.left+","+(margins.top+yscale(options.threshold))+")");

		threshold.append("line")
				.attr("x1",0)
				.attr("x2",WIDTH-(margins.right+margins.left))
				.attr("y1",0)
				.attr("y2",0);
	}
	

	var line = d3.svg.line()
				    .x(function(d) { return xscale(new Date(d.key)); })
				    .y(function(d) { return yscale(d.values[INDICATOR][METRIC]); })
	var area = d3.svg.area()
					.x(function(d) { return xscale(new Date(d.key)); })
					.y0(HEIGHT-(margins.bottom+margins.top))
				    .y1(function(d) { return yscale(d.values[INDICATOR][METRIC]); })

	var default_line=d3.svg.line()
					    .x(function(d) { return xscale(new Date(d.key)); })
					    .y(function(d) { return yscale(d.values.mean); })

	

	linechart
			.append("path")
			.attr("class","area")
			.attr("d",function(d){
				return area(d.values);
			})

	linechart
			.append("path")
			.attr("class","default")
			.attr("d",function(d){
				return default_line(avg);
			});

	linechart
			.append("path")
			.attr("d",function(d){
				return line(d.values);
			})

	var circles=linechart.selectAll("circle")
				.data(function(d){
					return d.values;
				})
				.enter()
				.append("g")
					.attr("transform",function(d){
						var x=xscale(new Date(d.key)),
							y=yscale(d.values[INDICATOR][METRIC]);
						return "translate("+x+","+y+")";
					})

	circles.append("circle")
					.attr("class","ix")
					.attr("cx",0)
					.attr("cy",0)
					.attr("r",5);

	circles.append("circle")
					.attr("cx",0)
					.attr("cy",0)
					.attr("r",2);

	circles.append("text")
				.attr("x",0)
				.attr("y",-5)
				.text(function(d){
					return d.values[INDICATOR][METRIC]
				})

	var xAxis = d3.svg.axis().scale(xscale).tickSize(3).tickValues(options.extents.date);
	var yAxis = d3.svg.axis().scale(yscale).orient("left").tickValues([10000,100000]);

	var xtickFormat=function(value){
		var q= Math.ceil(+d3.time.format("%m")(value)/3);
		return d3.time.format("Q"+q+"/%y")(value)
	}
	var ytickFormat=function(value){
		var values=[1000,10000,100000,150000];
		
		if(values.indexOf(value)>-1) {
			var precision=0;
			return d3.format("s")(value)
		} else {

		}
		return "";
	} 
	xAxis.tickFormat(xtickFormat);
	yAxis.tickFormat(ytickFormat)

	axes.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate("+padding.left+",0)")
      .call(xAxis);


    axes.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(0,"+(-(HEIGHT-(margins.bottom+margins.top)))+")")
      .call(yAxis);

    //console.log(yscale.ticks(3))

    axes.selectAll("line.ygrid")
    		/*.data(yscale.ticks(2).filter(function(d){
    			if(options.threshold) {
    				return d!=options.threshold;
    			}
    			return 1;
    		}))*/
			.data([10000,100000])
    		.enter()
    		.append("line")
    			.attr("class","ygrid")
    			.attr("x1",0)
    			.attr("x2",WIDTH-(margins.left+margins.right))
    			.attr("y1",function(d){
    				return  - ((HEIGHT - (margins.top+margins.bottom)) - yscale(d));
    			})
    			.attr("y2",function(d){
    				return  - ((HEIGHT - (margins.top+margins.bottom)) - yscale(d));
    			})

}