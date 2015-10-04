var LMD_dataPortal = (function(){


    // PRIVATE VARS
    var chartData = {};             // Used for Dimple charts
    var tableData = {};             // Used for data tables
    var indicatorMetadata = {};     // Used for both
    
    
    // Set "lastFourMonths"
//    var todayYear = moment().format('YYYY'),
//        todayMonth = moment().format('M'),
//        todayDay = moment().format('D'),
//        latestTotalMonthAllowed = Number(todayMonth) + (12*Number(todayYear)) - 1;
//    if (todayDay < 12) {
//        latestTotalMonthAllowed--;
//    }
    
    
    var lastFourMonths = [          // Months to display for data tables (!!!!! Set this manually for now !!!!!)
        { yearMonth: "2015-5", shortMonth: "May '15" },
        { yearMonth: "2015-6", shortMonth: "Jun '15" },
        { yearMonth: "2015-7", shortMonth: "Jul '15" },
        { yearMonth: "2015-8", shortMonth: "Aug '15" }
    ];


    // PUBLIC:  Stores indicator data (in "chartData" and "tableData" objects), to be used in charts and tables
    //          The single parameter comes from LMD_REST.php/indicatorvalues
    //          For chartData, keys are indicator IDs and values are objects containing two properties, a MySQL-formatted date and the indicator value
    //          For tableData, keys are "indID-monthyear" hashes (e.g. "i_33_m_2015-4", for indID "33" on April, 2015) and values are indicator values
    function setData(dataObject) {
        for (var key in dataObject) {
            
            var d = dataObject[key];
            
            // Set chart data
            chartData[d.indID] = chartData[d.indID] || [];
            chartData[d.indID].push({
                date: d.year + "-" + LMD_utilities.twoDigits(d.month) + "-01",
                value: Number(d.indValue)
            });
            
            // Set table data
            tableData["i_" + d.indID + "_m_" + d.year + "-" + d.month] = d.indValue;
        }
    }


    // PUBLIC:  Stores indicator metadata (in "indicatorMetaata" object)
    //          Input object comes from LMD_REST.php/indicators
    //          Keys are indicator IDs, values are objects containing metadata for a given indicator
    function setMetadata(dataObject) {
        for (var key in dataObject) {
            var indID = dataObject[key].indID;
            var metadata = dataObject[key];
            indicatorMetadata[indID] = metadata;
        }
    }


    // PUBLIC:  Configures the "report model" (i.e. a single report within the data portal)
    //          Input object comes from LMD_REST.php/reportobjects
    //          Must be called AFTER setData and setMetadata
    function configureReportModel(dataObject) {
        
        // 1. Transform indicator strings into arrays
        for (var key in dataObject) {
            dataObject[key].indicators = dataObject[key].indicators.split(",");
        }

        // 2. Sort by "displayOrder"
        dataObject.sort(function(a,b){
            if (Number(a.displayOrder) < Number(b.displayOrder)) {
                return -1;
            }
            else if (Number(a.displayOrder) > Number(b.displayOrder)) {
                return 1;
            } else {
                return 0;
            }
        });

        // 3. Merge in data
        for (var key in dataObject) {

            var d = dataObject[key];

            // Add "multiple" property, which denotes whether this report object contains a single indicator or multiple indicators
            d.multiple = d.indicators.length > 1 ? true : false;

            // Add "chart_div" property
            d.chart_div = "chart_" + d.id;

            // Add chart_points array (for Dimple charts)
            d.chart_points = [];

            // If roMetadata fields are not specified, get them from getIndicatorMetadata()
            var indID = d.indicators[0];
            var metadata = getMetadata(indID);
            if ( d.roMetadata_name == null || d.roMetadata_name == '' ) {
                d.roMetadata_name = metadata.indName;
            }
            if ( d.roMetadata_format == null || d.roMetadata_format == '' ) {
                d.roMetadata_format = metadata.indFormat;
            }
            if ( d.roMetadata_description == null || d.roMetadata_description == '' ) {
                d.roMetadata_description = metadata.indDefinition;
            }
            if ( d.roMetadata_target == null || d.roMetadata_target == '' ) {
                d.roMetadata_target = metadata.indTarget;
            }
            if ( d.roMetadata_narrative == null || d.roMetadata_narrative == '' ) {
                d.roMetadata_narrative = metadata.indNarrative;
            }

            // Populate chart_points array (for Dimple charts)
            for (var key2 in d.indicators) {

                var indID = d.indicators[key2];
                var dataArray = getChartData(indID);
                
                for(var i=0; i<dataArray.length; i++) {
                    d.chart_points.push({
                        Month:dataArray[i].date,
                        Value:dataArray[i].value,
                        Cut: d.multiple ? getMetadata(indID).indShortName : 1
                    });
                }
            }
        }
        
        // 4. Return transformed report object
        return dataObject;
        
    };


    // PRIVATE: Returns data array for a single indicator, based on indicator ID
    // Example: getIndicatorData(16) might return the following...
    //              [
    //                  { date:"2014-12-01", value:33 },
    //                  { date:"2015-01-01", value:44 },
    //                  { date:"2015-02-01", value:55 }
    //              ]
    function getChartData(indID) {
        return chartData[indID];
    }


    // PRIVATE: Returns metadata object for a single indicator, based on indicator ID
    // Example: getMetadata(16) might return the following...
    //              { indName:"Number of CHWs", indDefinition:"A deployed CHW is...", ... },
    function getMetadata(indID) {
        return indicatorMetadata[indID];
    }


    // PUBLIC:  Dynamically populate indicator values into html tables
    //          Table cells must have the class "indValue" and the following data attributes:
    //               data-indid:        indicator ID
    //               data-yearmonth:    A string of the form "yyyy-m" (e.g. "2015-4", for April, 2015)
    //               data-format:       A number format, as specified in LMD_utilities.format_number()
    function populateTableData() {
        $(".indValue").each(function(){
            var indID = $(this).attr("data-indid");
            var yearmonth = $(this).attr("data-yearmonth");
            var format = $(this).attr("data-format");
            var indValue = tableData["i_" + indID + "_m_" + yearmonth];
            indValue = LMD_utilities.format_number(indValue, format);
            $(this).html(indValue);
        });
    }


    // PUBLIC:  Dynamically populate indicator short names into html tables
    //          Table cells must have the class "indShortName" and the "data-indid" data attribute:
    //          !!!!! Potentially modify this in the future to populate other metadata
    function populateTableMetadata() {
        $(".indShortName").each(function(){
            var indID = $(this).attr("data-indid");
            var shortName = indicatorMetadata[indID].indShortName;
            $(this).html(shortName);
        });
    }


    // PUBLIC:  Render D3/Dimple charts
    //          Parameter is a "report object", as returned by configureReportModel()
    function renderCharts(dataObject) {
        for(var key in dataObject) {
            if (key>=0) {

                var d = dataObject[key];

                LMD_dimpleHelper.createChart({
                    type:d.chart_type,
                    targetDiv: d.chart_div,
                    data: d.chart_points,
                    colors: d.chart_colors || "default",
                    timeInterval: d.chart_timeInterval || 1, // !!!!! calculate this automatically
                    size: { x:d.chart_size_x, y:d.chart_size_y },
                    xyVars: { x:"Month", y:"Value" },
    //                axisTitles: d.chartSpecs.axisTitles, // !!!!! use indNameShort !!!!!
                    cut: "Cut",
                    legend: d.chart_legend || "",
                    tickFormat: { y:d.chart_tickFormat }
                });
                
            }
        }
    }


    // PRIVATE: Clear all data and metadata
    function clearData() {
        chartData = {};
        tableData = {};
        indicatorMetadata = {};
    }


    // PUBLIC:  Render D3/Dimple charts
    //          Parameter is a "report object", as returned by configureReportModel()
    function bootstrap(data_rawValues, data_indicators, model_report) {
        
        // Clear data
        clearData();
        
        // Set data and metadata
        setData(data_rawValues);
        setMetadata(data_indicators);

        // Configure report model
        model_report = configureReportModel(model_report);

        // Bind model to DIV
        rivets.bind($('#reportContent'), {
            model_report: model_report,
            lastFourMonths: lastFourMonths
        });

        // Populate data tables
        populateTableData();
        populateTableMetadata();

        // Create charts
        renderCharts(model_report);
    }


    // LMD_dataPortal API
    return {
//        setData: setData,
//        setMetadata: setMetadata,
//        configureReportModel: configureReportModel,
//        populateTableData: populateTableData,
//        populateTableMetadata: populateTableMetadata,
//        renderCharts: renderCharts,
        bootstrap: bootstrap
    };
    

})();
