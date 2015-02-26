var svg = dimple.newSvg("#dataportal_dashboard_fundsReceived", 475, 400);

// Data (!!!!! fill manually for now !!!!!)
var data = [
    { "Month":"Dec '14", "Measure":"USD", "Number":5929485, "Order":1 },
    { "Month":"Jan '15", "Measure":"USD", "Number":6529994, "Order":2 }
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
