// Module:          LMD_dataPortal.js
// Author:          Avi Kenny
// Last update:     2014-10-11
// Dependencies:    LMD_utilities.js, LMD_dimpleHelper, Knockout.js, Dimple.js, D3.js
// Purpose:         Used by frag_indicatorReport.php to dynamically generate indicator reports
// Notes:           An "indicator" is an individual metric that can be implemented repeatedly (e.g. ANC4+)
//                  An "indicator instance" (II) is an "implementations" of an indicator in a specific geographic region (e.g. ANC4+ in Konobo)
//                  An "instance value" is the numeric value of a particular II (e.g. 54%, for the ANC4+ rate in Konobo in March of 2015)

var LMD_dataPortal = (function() {


    // PRIVATE VARS
    var chartData = {};             // Used for Dimple charts
    var tableData = {};             // Used for data tables
    var csvData = [];               // Used for CSV-formatted data (for downloading)
    var territoryNames = {};        // Holds list of territories (key = territory_id_unique)
    var indicatorMetadata = {};     // Holds indicator metadata (key = ind_id)
    var reportObjects = [];         // Main object that holds report model
    
    
    // PRIVATE: Sets the dates for the Data Portal to display
    //          If it is the 15th of the month or later, display the previous 4 months; otherwise, display the four months before the previous month
    //          Example:
    //              Before June 15th, the months would be Jan -- Apr
    //              After June 15th, the months would be Feb -- May
    //          This a business rule to account for the fact that the Data Portal is "updated" on the 15th of each month with the previous month's data
    function setDates() {
        
        // Generate dates (last 4 months)
        var todayDay = moment().format('D'),
            todayMinus1m = moment().subtract(1 + ( todayDay < 15 ? 1 : 0 ),'months'),
            todayMinus2m = moment().subtract(2 + ( todayDay < 15 ? 1 : 0 ),'months'),
            todayMinus3m = moment().subtract(3 + ( todayDay < 15 ? 1 : 0 ),'months'),
            todayMinus4m = moment().subtract(4 + ( todayDay < 15 ? 1 : 0 ),'months');

        // Create object to hold formatted dates
        var lastFourMonths = [
            { yearMonth: todayMinus4m.format("YYYY-M"), shortMonth: todayMinus4m.format("MMM 'YY") },
            { yearMonth: todayMinus3m.format("YYYY-M"), shortMonth: todayMinus3m.format("MMM 'YY") },
            { yearMonth: todayMinus2m.format("YYYY-M"), shortMonth: todayMinus2m.format("MMM 'YY") },
            { yearMonth: todayMinus1m.format("YYYY-M"), shortMonth: todayMinus1m.format("MMM 'YY") }
        ];
        
        return lastFourMonths;
        
    }


    // PRIVATE: Stores "instance value" data (in "chartData" and "tableData" objects), to be used in charts and tables
    //          The single parameter comes from LMD_REST.php/indicatorValues
    //          For chartData, keys are instance IDs and values are objects containing two properties, a MySQL-formatted date and the indicator value
    //          For tableData, keys are "instID-monthyear" hashes (e.g. "i_33_m_2015-4", for instID "33" on April, 2015) and values are indicator values
    function setData(indicatorValues) {
        for (var key in indicatorValues) {
            
            var d = indicatorValues[key];
            
            // Set chart data
            var inst_id = d.ind_id + "-" + d.territory_type + "_" + d.territory_id + "-" + d.period_id;
            chartData[inst_id] = chartData[inst_id] || [];
            chartData[inst_id].push({
                date: d.year + "-" + LMD_utilities.twoDigits(d.month) + "-01",
                value: Number(d.value)
            });
            
            // Set table data
            tableData["i_" + inst_id + "_m_" + d.year + "-" + d.month] = d.value;
            
        }
    }


    // PUBLIC: Object storing territoryNames (associated with IDs, territory_id_unique)
    //          Input object comes from LMD_REST.php/indicators
    function setTerritoryNames(territoryNames) {
        
        var territoryNames_return = {};
        
        for (var key in territoryNames) {
            var t = territoryNames[key];
            territoryNames_return[t.territory_id_unique] = t.territory_name;
        }
        
        return territoryNames_return;
    }
    
    
    // PUBLIC: Stores indicator instance metadata (in "instanceMetadata" object)
    //          Input object comes from LMD_REST.php/indicators
    //          Keys are instance IDs, values are objects containing metadata for a given indicator instance
    function setMetadata(indicatorMetadata) {
        
        var indicatorMetadata_return = {};
        
        for (var key in indicatorMetadata) {
            var ind_id = indicatorMetadata[key].indID; // !!!!! change indID to ind_id in database table
            var metadata = indicatorMetadata[key];
            indicatorMetadata_return[ind_id] = metadata;
        }
        
        return indicatorMetadata_return;
    }
    
    
    // PUBLIC: Returns "instanceMetadata" object
    function getMetadata() {
        return instanceMetadata;
    }
    
    
    // PRIVATE: Configures the "report model" (i.e. a single report within the data portal)
    //          Input object comes from LMD_REST.php/reportobjects
    //          Must be called AFTER setData and setMetadata
    function configureReportModel(reportObjects) {

        for (var key in reportObjects) {
            
            var ro = reportObjects[key];
            
            // Transform indicator strings into arrays
            ro.indicators_table = ro.indicators_table.split(",");
            ro.territories_table = ro.territories_table.split(",");
            ro.indicators_chart = ro.indicators_chart.split(",");
            ro.territories_chart = ro.territories_chart.split(",");
            ro.indicators_chart_secondary = ro.indicators_chart_secondary ? ro.indicators_chart_secondary.split(",") : null;
            ro.territories_chart_secondary = ro.territories_chart_secondary ? ro.territories_chart_secondary.split(",") : null;
            ro.labels_table = ro.labels_table ? ro.labels_table.split(",") : [];
            ro.labels_chart = ro.labels_chart ? ro.labels_chart.split(",") : [];
            
            // Generate "instance IDs" array (tables)
            ro.instances_table = [];
            for (var key2 in ro.indicators_table) {
                for (var key3 in ro.territories_table) {
                    ro.instances_table.push({inst_id: ro.indicators_table[key2] + "-" + ro.territories_table[key3] + "-" + ro.period_id});
                }
            }
            console.log('ro.instances_table')
            console.log(ro.instances_table)
            
            // Generate "instance IDs" array (charts)
            ro.instances_chart = [];
            for (var key2 in ro.indicators_chart) {
                for (var key3 in ro.territories_chart) {
                    ro.instances_chart.push({inst_id: ro.indicators_chart[key2] + "-" + ro.territories_chart[key3] + "-" + ro.period_id});
                }
            }
            
            // Generate "instance IDs" array (charts; secondary)
            ro.instances_chart_secondary = [];
            for (var key2 in ro.indicators_chart_secondary) {
                for (var key3 in ro.territories_chart_secondary) {
                    ro.instances_chart_secondary.push({inst_id: ro.indicators_chart_secondary[key2] + "-" + ro.territories_chart_secondary[key3] + "-" + ro.period_id});
                }
            }
            
        }

        // Sort by "displayOrder"
        reportObjects.sort(function(a,b){
            if (Number(a.displayOrder) < Number(b.displayOrder)) {
                return -1;
            }
            else if (Number(a.displayOrder) > Number(b.displayOrder)) {
                return 1;
            } else {
                return 0;
            }
        });

        // Clear csvData array
        csvData = [];

        // Merge in data
        for (var key in reportObjects) {

            var ro = reportObjects[key];

            // Add "multiple" property, which denotes whether this report object contains a single indicator or multiple indicators (for data tables; used by knockout)
            ro.multiple = ro.instances_table.length > 1 ? true : false;

            // Add "multiple" property, which denotes whether this report object contains a single indicator or multiple indicators (for charts)
            ro.chartMultiple = ro.instances_chart.length > 1 ? true : false;

            // Add "chart_div" property
            ro.chart_div = "chart_" + ro.id;

            // Add chart_points array (for Dimple charts)
            ro.chart_points = [];

            // If roMetadata fields are not specified, get them from instanceMetadata (only practical for report objects with a single indicator instance)
            var ind_id = ro.indicators_table[0];
            var metadata = indicatorMetadata[ind_id];
            if ( ro.ro_name == null || ro.ro_name == '' ) {
                ro.ro_name = metadata.indName; // !!!!! change in DB to ind_name !!!!!
            }
            if ( ro.indSource == null || ro.indSource == '' ) {
                ro.indSource = metadata.indSource;
            }
            if ( ro.ro_description == null || ro.ro_description == '' ) {
                ro.ro_description = metadata.indDefinition;
            }
            
            // Add labels to ro.instances_table
            for (var key2 in ro.instances_table) {
                if ( ro.labels_table.length !== 0 ) {
                    // If they exist, get labels from ro.labels_table
                    ro.instances_table[key2].label = ro.labels_table[key2];
                } else {
                    // If ro.labels_table is not set, get labels from territory IDs
                    var territory_id_unique = ro.instances_table[key2].inst_id.split('-')[1];
                    ro.instances_table[key2].label = territoryNames[territory_id_unique];
                }
            }
            
            // Add labels to ro.instances_chart
            for (var key2 in ro.instances_chart) {
                if ( ro.labels_chart.length !== 0 ) {
                    // If they exist, get labels from ro.labels_chart
                    ro.instances_chart[key2].label = ro.labels_chart[key2];
                } else {
                    // If ro.labels_chart is not set, get labels from territory IDs
                    var territory_id_unique = ro.instances_chart[key2].inst_id.split('-')[1];
                    ro.instances_chart[key2].label = territoryNames[territory_id_unique];
                }
            }
            
            // Create "dates" array, for CSV data
            var dates = [];
            
            // Populate chart_points array (for Dimple charts)
            for (var key2 in ro.instances_chart) {

                    var inst_id = ro.instances_chart[key2].inst_id;
                    var dataArray = chartData[inst_id];
                    var inst_id_secondary = ro.instances_chart_secondary.length > 0 ? ro.instances_chart_secondary[key2].inst_id : null;
                    var dataArray_secondary = ro.instances_chart_secondary.length > 0 ? chartData[inst_id_secondary] : null;

                    if (dataArray) {
                        for(var i=0; i<dataArray.length; i++) {

                            // Get secondary value (if it exists)
                            var value_secondary = null;
                            if (dataArray_secondary) {
                                for (var key3 in dataArray_secondary) {
                                    if (dataArray[i].date === dataArray_secondary[key3].date) {
                                        var value_secondary = dataArray_secondary[key3].value;
                                    }
                                }
                            }

                            // Add chart point
                            // Chart point only added if its date is not "too new" (a business rule to account for the fact that the Data Portal is "updated" on the 15th of each month with the previous month's data)
                            var data_totalMonth = (12*Number(dataArray[i].date.split('-')[0]))+Number(dataArray[i].date.split('-')[1]);
                            var latestAllowed_date = todayMinus1m = moment().subtract(1 + ( moment().format('D') < 15 ? 1 : 0 ),'months');
                            var latestAllowed_totalMonth = (12*latestAllowed_date.year())+(latestAllowed_date.month()+1);

                            if (ro.chart_only_display_last_month == 1 && data_totalMonth === latestAllowed_totalMonth ||
                                ro.chart_only_display_last_month == 0 && data_totalMonth <=  latestAllowed_totalMonth) {
                            
                                // Primary value
                                ro.chart_points.push({
                                    Month: dataArray[i].date,
                                    Value: dataArray[i].value,
                                    Cut: ro.chartMultiple ? ro.instances_chart[key2].label : '(none)',
                                    Level: 'Actual' // !!!!! Level:'primary'; These labels should be named dynamically !!!!!
                                });

                                // Secondary value
                                if (value_secondary !== null) {
                                    ro.chart_points.push({
                                        Month: dataArray[i].date,
                                        Value: value_secondary,
                                        Cut: ro.chartMultiple ? ro.instances_chart[key2].label : '(none)',
                                        Level: 'Expected' // !!!!! Level:'primary'; These labels should be named dynamically !!!!!
                                    });
                                }

                            }

                            // Add date to date array (for CSV data)
                            dates.push(dataArray[i].date);
                        }
                    }
            }
            
            // Remove duplicates from "dates" array; sort
            ro.uniqueDates = [];
            $.each(dates, function(i, el){
                if($.inArray(el, ro.uniqueDates) === -1) ro.uniqueDates.push(el);
            });
            ro.uniqueDates.sort();
            
            // Populate "CSV" object (for "download data" function)
            var csvFile = '"' + ro.ro_name + '"' + '\n' + 'month,';
            for (var key2 in ro.instances_chart) {
                // Add labels
                csvFile += ro.instances_chart[key2].label + ',';
            }
            csvFile = csvFile.slice(0, -1);
            csvFile += '\n';
            
            // Add data
            for (var key2 in ro.uniqueDates) {
                csvFile += ro.uniqueDates[key2] + ',';
                for (var key3 in ro.instances_chart) {
                    var yearMonth = ro.uniqueDates[key2].slice(0,-3);
                    yearMonth = yearMonth.charAt(5)==='1' ? yearMonth : yearMonth.slice(0, 5) + yearMonth.slice(6);
                    csvFile += tableData['i_' + ro.instances_chart[key3].inst_id + '_m_' + yearMonth] + ',';
                }
                csvFile = csvFile.slice(0, -1);
                csvFile += '\n';
            }
            csvFile = csvFile.slice(0, -1);
            csvFile = csvFile.replace(/undefined/g, "");
            csvData.push(csvFile);
        
        }
        
        // Return transformed report object
        return reportObjects;
        
    };


    // PRIVATE: Dynamically populate instance values into html tables
    //          Table cells must have the class "inst_value" and the following data attributes:
    //               data-inst_id:        indicator ID
    //               data-yearmonth:    A string of the form "yyyy-m" (e.g. "2015-4", for April, 2015)
    //               data-format:       A number format, as specified in LMD_utilities.format_number()
    function populateTableData() {
        $(".value").each(function() {
            var inst_id = $(this).attr("data-inst_id");
            var yearmonth = $(this).attr("data-yearmonth");
            var format = indicatorMetadata[inst_id.split("-")[0]].indFormat || 'integer';
            var value = tableData["i_" + inst_id + "_m_" + yearmonth];
            value = LMD_utilities.format_number(value, format);
            $(this).html(value);
        });
    }


    // PRIVATE: Activate "download data" links, each of which downloads a CSV of all of the data in the Dimple chart
    function setDownloadLinks_data() {
        $('.downloadData').each(function() {
            var roNumber = $(this).attr('id').slice(9);
            var data = 'text;charset=utf-8,' + encodeURIComponent(csvData[roNumber]);
            $(this).attr('href',"data:" + data);
        });
    }


    // PRIVATE: Activate "download chart" links, each of which downloads the Dimple chart as a PNG image
    function setDownloadLinks_charts() {
        
        $('.downloadChart').click(function() {
            
            // Code adapted from: http://techslides.com/save-svg-as-an-image
            
            var chart_id = $(this).closest('.row').find('svg').parent().attr('id');
            var html = d3.select("#" + chart_id + " svg")
                    .attr("version", 1.1)
                    .attr("xmlns", "http://www.w3.org/2000/svg")
                    .attr('style','background:white')
                    .node().parentNode.innerHTML;

            var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
            var img = '<img src="'+imgsrc+'">'; 
            d3.select("#svgdataurl").html(img);

            var canvas = document.querySelector("canvas")
            var context = canvas.getContext("2d");

            var image = new Image;
            image.src = imgsrc;
            image.onload = function() {
                context.drawImage(image, 0, 0);

                var canvasdata = canvas.toDataURL("image/png");

                var pngimg = '<img src="'+canvasdata+'">'; 
                d3.select("#pngdataurl").html(pngimg);

                var a = document.createElement("a");
                a.download = "chart.png";
                a.href = canvasdata;
                a.click();
            };
        });
    }


    // PRIVATE: Render D3/Dimple charts
    //          Parameter is a "report object", as returned by configureReportModel()
    function renderCharts(reportObjects) {
        for(var key in reportObjects) {
            if (key >= 0) {

                var ro = reportObjects[key];

                if (ro.chart_points.length > 0) {
                    LMD_dimpleHelper.createChart({
                        type:ro.chart_type,
                        targetDiv: ro.chart_div,
                        data: ro.chart_points,
                        chart_only_display_last_month: ro.chart_only_display_last_month,
                        colors: ro.chart_colors || "default",
                        timeInterval: Math.ceil(ro.uniqueDates.length/24),
                        size: { x:Number(ro.chart_size_x), y:Number(ro.chart_size_y) },
                        xyVars: { x:"Month", y:"Value" }, // !!!!! This is currently unnecessary !!!!!
                        cut: "Cut", // !!!!! This is currently unnecessary !!!!!
                        legend: ro.chartMultiple ? "right" : "",
                        tickFormat: ro.chart_tickFormat,
                        axisValues: { min:ro.chart_yAxis_min, max:ro.chart_yAxis_max }
                    });
                }
            }
        }
    }


    // PRIVATE: Clear all data and metadata
    function clearData() {
        chartData = {};
        tableData = {};
        instanceMetadata = {};
    }


    // PUBLIC:  Bootstrap the page
    //          This function is called from frag_indicatorReport.php
    function bootstrap(arg_reportObjects, arg_indicatorMetadata, arg_indicatorValues, arg_territoryNames) {
        
        // Clear data
        clearData();
        
        // Set territoryNames object
        territoryNames = setTerritoryNames(arg_territoryNames);
        
        // Set data and metadata
        setData(arg_indicatorValues);
        indicatorMetadata = setMetadata(arg_indicatorMetadata);
        
//        if (reportObjects) {
        // Configure report model
        reportObjects = configureReportModel(arg_reportObjects);

        // Initialize knockout.js; bind model to DIV
        ko.applyBindings({
            reportObjects: reportObjects,
            lastFourMonths: setDates()
        }, $('#reportContent')[0]);
//        }

        // Populate data tables
        populateTableData();
//        populateTableMetadata();

        // Create charts
        if (reportObjects) {
            renderCharts(reportObjects);
        }
        
        // Activate "download data" links
        setDownloadLinks_data();
        setDownloadLinks_charts();
    }


    // LMD_dataPortal API
    return {
        bootstrap: bootstrap,
        setMetadata: setMetadata,
        getMetadata: getMetadata
    };
    

})();
