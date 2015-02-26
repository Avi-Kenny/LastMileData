var svg = dimple.newSvg("#dataportal_dashboard_cashOnHand", 475, 400);

// Data (!!!!! fill manually for now !!!!!)
var data = [
    { "Month":"Dec '14", "Measure":"USD", "Number":4305484, "Order":1 },
    { "Month":"Jan '15", "Measure":"USD", "Number":4623701, "Order":2 }
];


var myChart = new dimple.chart(svg, data);

// Set color scheme: orange
myChart.defaultColors = [
    new dimple.color("#F79646")
];

myChart.setBounds(40, 30, 430, 305);
var x = myChart.addCategoryAxis("x", "Month");
x.addOrderRule("Order");
myChart.addMeasureAxis("y", "Number");
myChart.addSeries("Measure", dimple.plot.line);
myChart.draw();
