//TODO: eventually add number prefixes to server responses so as to alert users to the action taken. slice off number and leave json response as normal.

var map;
var bars = [];
var infowindow = new google.maps.InfoWindow();
var geocoder;
var newbar;

var markers = [];


function initialize() {
  geocoder = new google.maps.Geocoder();
        
  var latlng = makeLatLng(40.714353,-74.005973);

  var mapOptions = {
    center: latlng,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };      
          
  map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);     
}

//takes lat and lng and creates google latlng object

//makes ajax request to a url, sending it content
function makeRequest(url, content) {
  
  if (window.XMLHttpRequest) {  //Mozilla, Safari, ...
    req = new XMLHttpRequest();
  }
  else if (window.ActiveXObject) { // IE
    try {
      req = new ActiveXObject("Msxml2.XMLHTTP");
    }
    catch (e) {
      try {
        req = new ActiveXObject("Microsoft.XMLHTTP");
      }
      catch (e) {}
    }
  }
   
  if (!req) {
    alert('Giving up :  Cannot create an XMLTTP instance');
    return false;
  }
  //if called through make new bar this goes through
  if (content['latlng'] == null){
    content['latlng'] = 'no coords';
  }
  //if sending server a bar this goes through
  if (typeof(content) == 'object'){
    req.open("POST", url, true);
    req.setRequestHeader("Content-type","application/json");
    
    jsoncontent = JSON.stringify(content);    
    req.send(jsoncontent);
  }

  else {
    req.open("GET", url, true);
    req.send();
  }
  //why happens 3 times?
  req.onreadystatechange = function (){
    responseHandler(req, content);
  }
  
}

//handles the server response
function responseHandler(response, content){

   try {
      if (response.readyState === 4) {
        
        if (response.status === 200 || response.status === 304) {

          //geocodes the address if it is not found in database          
          if (response.responseText == 'call codeAddress') {
            codeAddress(content);            
          }
          
          //confirms a new location has been entered in db and centers map on it
          else if (response.responseText == 'entered'){
            makeMarkers();
            
            alert('New location entered in database.');
            map.setCenter(bars[0]['latlng']);
          }
          
          //throws an error message if something fucks up
          else if (response.responseText == 'error') {
            alert('something went wrong');          
          }

          //triggered when no entries in db for that zip
          else if (response.responseText == 'None Found'){
            alert('No happy hours found in your area');
          }
          
          //triggered when it is already in db or by search function         
          else {
            
            //deals with json response appropriately
            jsonHandler(response.responseText);
            makeMarkers();
             
          }
        }
        else {
          alert('There was a problem with the request.');
        }
      }
    }
    catch (e) {}
     
  };



//response should contain only one bar when new one is entered, and multiple when there is a search(if search has multiple)
//create an alert based on this to let user know if it was already in db

//adds all bars from server response into the bars array
function jsonHandler(jsonresponse) {

  jsonresponse = JSON.parse(jsonresponse);


  //adds all bars from json response to bars array
  for(var i = 0; i<jsonresponse.length; i++){
    bars.push(jsonresponse[i]);    
  };
  
  makeMarkers();
  if (bars.length == 1) {
    map.setCenter(bars[0]['latlng']);
  }
  else {
    var bounds = new google.maps.LatLngBounds();
    for (each in bars) {
      bounds.extend(bars[each]['latlng']);
    }
    map.fitBounds(bounds);
  }

}

//called by new bar form. creates a new bar object and calls makerequest to see if it's in db
function checkAddress(){
  $("#myModal").modal("hide"); 
  var myDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var dayString = '';
  var bar = {};

  bar['name'] = document.getElementById('name').value;
  bar['address'] = document.getElementById('address').value;
  bar['city'] = document.getElementById('city').value;
  bar['state'] = document.getElementById('state').value;
  bar['latlng'] = null;
  bar['start'] = document.getElementById('start').value;
  bar['end'] = document.getElementById('end').value;
  bar['days'] = [];
  bar['desc'] = document.getElementById('desc').value;
  
  for (var count=0; count<7; count++){
    if (newloc.daycheck[count].checked){      
      bar['days'].push(myDays[newloc.daycheck[count].value]);      
    }
  }
  for(var i = 0; i < bar['days'].length; i++){
    dayString += myDays[i] + ', ';
  };
  
  dayString = dayString.slice(0, - 2);
  
  
  bar['daystring'] = dayString;

  var newZip = document.getElementById('zip').value;
  
  if (zipCheck(newZip)){
    bar['zip'] = newZip;
    bar['fulladdress'] = bar['address'] + ' ' + bar['city'] + ' ' + bar['state'] + ' ' + bar['zip']
    bar['contentstring'] = " <div id='contentstring'><b>" + bar["name"] + '</b><br/> <b>Start Time:</b> ' + bar["start"] + '<br /> <b>End Time:</b> ' + bar["end"] + '<br/><b>Days:</b> ' + bar["daystring"] + '<br/><b>Description:</b> ' + bar["desc"] + '</div>'
    deleteMarkers();
    makeRequest('/map', bar)
  }
  else {
    alert('you need to enter a valid zip code');
  };

  //should only happen after checking validity of text
  
}

//geocodes an address if it is not found in db
function codeAddress(bar) {
  geocoder.geocode( { 'address': bar['fulladdress']}, function(results, status) {

  if (status == google.maps.GeocoderStatus.OK) {
    var coded_latlng = results[0].geometry.location

    bar['lat'] = coded_latlng.lat()
    bar['lng'] = coded_latlng.lng()
    bar['latlng'] = coded_latlng
    
    //instead of using newbar global var, push the new bar to the bars array
    bars.push(bar);
    makeRequest('/map', bar);

  } 
  else {
    
    alert('Geocode was not successful for the following reason: ' + status);
  }
  });
};


//creates markers and event listeners for every bar in bars array. 
//maybe change to take bars array as paramater instead of using global variable
function makeMarkers() {
  var marker;

  for(var l = 0; l < bars.length; l++) {
    var sentBarLatLng = makeLatLng(parseFloat(bars[l]['lat']), parseFloat(bars[l]['lng']));
    bars[l]['latlng'] = sentBarLatLng;
    
    marker = new google.maps.Marker({
      map: map,
      position: sentBarLatLng
    });
              
    google.maps.event.addListener(marker, 'click', (function(marker, l) {
      return function(){
        infowindow.setContent(bars[l]['contentstring'].slice(1,-1));
        infowindow.setOptions({maxWidth:250});
        infowindow.open(map, marker);
      }
    })(marker, l));
    markers.push(marker);              
  } 
}

function deleteMarkers() {
  if (markers) {
    for (i in markers) {
      markers[i].setMap(null);
    }
    markers.length = 0;
    bars.length = 0;
  }
}

function search(){
  deleteMarkers();  

  searchZip = document.getElementById('search').value;
  if (zipCheck(searchZip)){    
    searchURL = '/search/' + searchZip;
    makeRequest(searchURL, searchZip);
  }
  else {
    alert('You need to enter a valid zip code.')
  }
  
  
}
function zipCheck(zip){
  goodZip = /\d{5}/;
  if (goodZip.test(zip)){
    return true
  }
  else{
    return false
  }
}

function makeLatLng(lat, lng){
  var latlng = new google.maps.LatLng(lat, lng);
  return latlng
}

