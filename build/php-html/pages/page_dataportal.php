<?php session_start(); if( !isset($_SESSION['username']) ) { $URL = $_SERVER['PHP_SELF']; Header('Location:/LastMileData/index.php?redirect=' . urlencode($URL)); } ?><!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Last Mile Data</title><link rel="icon" type="image/png" href="/LastMileData/src/images/lmd_icon_v20140916.png"><link rel="stylesheet" href="/LastMileData/build/css/page_dataportal.min.css"><script src="/LastMileData/build/js/page_dataportal.min.js"></script><script>$(document).ready(function(){

        <?php

            // Echo username/usertype (used by access control system)
            echo "sessionStorage.username = '" . $_SESSION['username'] . "';";
            echo "sessionStorage.usertype = '" . $_SESSION['usertype'] . "';";

            // Initiate/configure CURL session
            $ch = curl_init();
            curl_setopt($ch,CURLOPT_RETURNTRANSFER,1);

            // Echo JSON (sidebar contents)
            $url1 = $_SERVER['HTTP_HOST'] . "/LastMileData/src/php-html/scripts/LMD_REST.php/json_objects/1";
            curl_setopt($ch,CURLOPT_URL,$url1);
            $json1 = curl_exec($ch);

            // Close CURL session and echo JSON
            curl_close($ch);
            echo "var model_sidebar = JSON.parse($json1.objectData);". "\n\n";

        ?>
            
            // This variable is set to true if any data changes occur (currently only used by "admin_editData.php" fragment)
            DataPortal_GLOBALS = {
                anyChanges: false
            };
            
            // Configure rivets.js
            rivets.configure({templateDelimiters: ['{{', '}}']});

            // Rivers formatter: numbers (one-way)
            rivets.formatters.format = function(x, format) {
                if (x !== undefined && x !== null) {
                    var type = format.split("-")[0];
                    var num = format.split("-")[1] ? format.split("-")[1] : 1;
                    switch(type) {
                        case 'integer':
                            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            break;
                        case 'percent': // !!!!! Modify for decimal places !!!!!
                            return (x*100).toFixed(1) + "%";
                            break;
                        case 'decimal': // Takes "decimal-1", "decimal-2", etc.
                            return x.toFixed(num);
                            break;
                        case 'dollars': // !!!!! Modify to go with/without cents by using dollars-0 or dollars-2 !!!!!
                            return "$" + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            break;
                        default:
                            return x;
                    }
                }
            };
            
            // Rivers formatter: adds one; mainly for index)
            rivets.formatters.plusOne = function(x) {
                return x + 1;
            };
            
            // Rivers formatter: short date (example: Jan '15)
            rivets.formatters.shortDate = function(x) {
                return moment(x).format("MMM 'YY");
            };

            // Apply access control rules
            var filteredSidebar = model_sidebar;
            for (var i=filteredSidebar.length-1; i>=0; i--) {

                var tabs = filteredSidebar[i].tabs;
                for (var j=tabs.length-1; j>=0; j--) {
                    if (tabs[j].permissions.indexOf(sessionStorage.usertype) === -1) {
                        tabs.splice(j,1);
                    }
                }
                if ( filteredSidebar[i].tabs.length===0 ) {
                    filteredSidebar.splice(i,1);
                }
            }

            // !!!!! Make specific data portal pages "linkable" (with hash anchors); needs to interface with access control system !!!!!

            // Bind sidebar model to accordion DIV
            rivets.bind($('#sidebarDIV'), {model_sidebar: filteredSidebar});

            // Fade in overview pane by default
            $('#mainContainer').load('/LastMileData/src/fragments_portal/dataportal_overview.php',function(){
                // These need to happen AFTER navbar loads
                $(this).scrollTop(0);
                $('#dashboard_iframe').hide();
                $('#mainContainer').fadeIn(1000);
                $('#dp_sidebar').fadeIn(1000);
                $('.dp_frag').first().addClass('dp-active');
            });

            // Handle sidebar clicks
            $('.dp_frag, .dp_iframe').click(function(){
                
                // If "DataPortal_GLOBALS.anyChanges" has been set to true, warn user before he/she navigates to another page
                var preventNavigation = false;
                if(DataPortal_GLOBALS.anyChanges) {
                    var confirm = window.confirm("You have unsaved changes to data. If you leave this page, all changes will be lost. Are you sure you want to leave this page?");
                    if (!confirm) {
                        preventNavigation = true;
                    }
                }
                
                // If "DataPortal_GLOBALS.anyChanges" is false or user confirms navigation, proceed
                if (!preventNavigation) {
                    
                    DataPortal_GLOBALS.anyChanges = false;
                    
                    // Get link URL
                    var myLink = $(this).attr('data-link');
                    var fragOrFrame = $(this).hasClass('dp_frag') ? "frag" : "frame";

                        // Fade out current mainContainer
                        $('#whitespaceContainer').slideDown(500, function(){

                            $('#mainContainer').scrollTop(0);

                            // Handle fragment loads
                            if (fragOrFrame === "frag") {
                                    $('#dashboard_iframe').hide();
                                    $('#mainContainer').show();
                                    $('#mainContainer').load(myLink, function(responseText, textStatus, jqXHR){
                                        if (textStatus === "error") {
                                            $('#mainContainer').html("<h1>Error.</h1><h3>Please check your internet connection and try again later.</h3>");
                                        }
                                    setTimeout(function(){
                                            $('#whitespaceContainer').slideUp(1000);
                                        },500);
                                    });

                            // Handle iframe loads
                            } else if (fragOrFrame === "frame") {
                                    $('#mainContainer').hide();
                                    $('#dashboard_iframe').show();
                                    $('#dashboard_iframe').prop('src',myLink);
                            }

                        });

                    // Switch active sidebar element
                    $('.dp_frag, .dp_iframe').each(function(){
                        $(this).removeClass('dp-active');
                    });
                    $(this).addClass('dp-active');
                    
                }

            });

            // Fade out whitespaceContainer when iFrame is done loading
            document.getElementById("dashboard_iframe").onload = function() {
                $('#whitespaceContainer').slideUp(1000);
            };

            // jQueryUI Accordion on sidebar
            $("#sidebarDIV").accordion({
                header: "h3",
                heightStyle: "content",
                collapsible: true
            });
            
            // If "DataPortal_GLOBALS.anyChanges" has been set to true, warn user before he/she leaves page
            window.onbeforeunload = function() {
                if(DataPortal_GLOBALS.anyChanges) {
                    return "You have unsaved changes to data. If you leave or reload this page, all changes will be lost.";
                }
            };
            
        });</script></head><body><div id="load_navbar"></div><div class="container-fluid"><div class="row" style="height:100vh"><div id="dp_sidebar" class="col-md-2" style="display:none; position:relative"><div style="height:51px"></div><div class="nav nav-sidebar" id="sidebarDIV"><div rv-each-sidebar="model_sidebar"><h3 rv-id="sidebar.id" id="{{sidebar.id}}">{{sidebar.name}}</h3><div><div rv-id="tabs.id" rv-class="tabs.type" rv-data-link="tabs.link" rv-each-tabs="sidebar.tabs"><a>&bull;&nbsp;{{tabs.name}}</a></div></div></div></div></div><div id="outerContainer" class="pane col-md-10"><div style="height:51px"></div><div id="whitespaceContainer"><br><div style="position:relative; width:100px; left:20px"><img src="/LastMileData/src/images/ajax-loader_v20140916.gif"><br><img src="/LastMileData/src/images/ajax-loader_v20140916.gif"><br><img src="/LastMileData/src/images/ajax-loader_v20140916.gif"><br></div></div><div id="mainContainer"></div><iframe id="dashboard_iframe"></iframe></div></div></div></body></html>