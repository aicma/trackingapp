angular.module('user.services', [])

.factory('Events', function(){
  var events = [
    {
      id: 0,
      name: "Zugspitz Ultratrail",
      date: new Date("2016-06-23"),
      img: "",
      numberformat: /\d{4}/
    },
    {
      id: 1,
      name: "Rad am Ring",
      date: new Date("2016-07-23"),
      img: "",
      numberformat: /[A-B]{1}\s*\d{1,4}/i
    },
    {
      id: 2,
      name: "TestEvent",
      date: new Date("2016-02-23"),
      img: "",
      numberformat: /\d{1,4}\s*[A-B]/i
    }
  ];

  return{
    all: function(){
      return events;
    },
    get: function(eventId){
      for(var i=0; i< events.length; i++){
        if(events[i].id === parseInt(eventId)){
          return events[i];
        }
      }
      return null;
    }
  };
})//TODO:  Serverabfrage

.factory('Riders', function(){
  var riders = [
    {
      id:0,
      number: 12345,
      name: ["Alex", "Mersdorf"]
    },
    {
      id:1,
      number: 54321,
      name: ["Guido", "Holz"]
    }
  ];

  return {
    all: function(){
      return riders;
    },
    get: function(riderId){
      for(var i = 0; i<riders.length; i++){
        if(riders[i].id === parseInt(riderId))
          {return riders[i];}
        return null
      }
    },
    getNumber: function(riderNumber){
      console.log(riderNumber);   /////////////////LOG
      for(var i = 0; i <riders.length; i++){
        if(riders[i].number === parseInt(riderNumber))
        {return riders[i];}
        console.log('Number not registered');
        return null;
      }
    }
  }

})  //TESTDATA //TODO: Serverabfrage

.factory('FollowedRiders', function(Riders){
  var followedRiders = [];      //TODO: Server verbindung

  return {
    all: function(){
      return followedRiders;
    },
    add: function(rider){
      //console.log(rider); ///////////////////LOG

      followedRiders.push(rider);
      console.log('Rider '+ rider.number + ' added');
      console.log(followedRiders);
      return null;
    }
  }
})

.factory('Cameras', function(){
  var cams =[
    {
      lat: 23.3576,
      long: 47.1345
    },
    {
      lat: 23.6578,
      long: 47.3267
    }
  ]; // TESTDATA TODO: Serverabfrage

  return {
    all: function(){
      return cams;
    }
  }

})

.factory('FileHandler', function(GPXCreator){

  var errorHandler = function (fileName, e) {
    var msg = '';

    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'Storage quota exceeded';
        break;
      case FileError.NOT_FOUND_ERR:
        msg = 'File not found';
        break;
      case FileError.SECURITY_ERR:
        msg = 'Security error';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        msg = 'Invalid modification';
        break;
      case FileError.INVALID_STATE_ERR:
        msg = 'Invalid state';
        break;
      default:
        msg = 'Unknown error';
        break;
    }


    console.log('Error (' + fileName + '): ' + msg);
  };

  return {
    /**
     * Accepts a filename and data Array with trackpoints. Writes out a header and an trkpt for every array element.
     * @param fileName
     * @param data
       */
    writeGPXFile: function(fileName, data) {
      console.log('writing file...');

      return new Promise(function (resolve, reject) {
        var trkString = GPXCreator.createHeader(GPXCreator.createUTCtimestamp(new Date()));

        for(var i=0;i<data.length;i++){
          if(i==0){trkString+= '<trk> \n <name>  </name> \n <trkseg>\n'} //GET EVENT NAME HERE?
          if(data[i][0] == 999){
            trkString += '</trkseg> \n <trkseg>\n';
          }else {
            trkString += GPXCreator.createTrkPt(data[i]);
          }
          if(i==data.length-1){trkString += '</trkseg> \n </trk> \n </gpx>';}
        }

        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (directoryEntry) {
          directoryEntry.getFile(fileName, {create: true}, function (fileEntry) {
            fileEntry.createWriter(function (fileWriter) {
              //CALLBACKS
              fileWriter.onwriteend = function (e) {
                // for real-world usage, you might consider passing a success callback
                console.log('Write of file "' + fileName + '"" completed.'+ e);
                resolve();
              };
              fileWriter.onerror = function (e) {
                // you could hook this up with our global error handler, or pass in an error callback
                console.log('Write failed: ' + e.toString());
                reject();
              };

              //ACTUAL MAGIC HAPPENING
              var blob = new Blob([trkString], {type: 'text/plain'});
              fileWriter.write(blob);
            }, errorHandler.bind(null, fileName));
          }, errorHandler.bind(null, fileName));
        }, errorHandler.bind(null, fileName));
      })
    }
  }
})

.factory('Tracker', function(Cameras, PopupService){
  var watchId = null;
  var trackArray = [];

  /**
   * Takes a Posistion Object and compares the position to the Positions from the "Cameras"-Factory
   * If true it does something
   * @param position
     */
  function compareToCams(position){
    var cams = Cameras.all();
    var deltaDistance = 50 * 90/10000000; // 10 Meter in Dezimalgrad

    for(i = 0; i< cams.length; i++){
      var bool1 = Math.abs(position.coords.longitude) >= Math.abs(cams[i].long) - deltaDistance; // left of cam
      var bool2 = Math.abs(position.coords.longitude) <= Math.abs(cams[i].long) + deltaDistance; // right of cam
      var bool3 = Math.abs(position.coords.latitude) >= Math.abs(cams[i].lat) - deltaDistance; // below cam
      var bool4 = Math.abs(position.coords.latitude) <= Math.abs(cams[i].lat) + deltaDistance; // above cam

      if(bool1 && bool2 && bool3 && bool4) {
        console.log("YOU ARE CLOSE TO A CAMERA!!!! DO SOMETHING!"); //TODO: send position to server
      }
    }
  }

  function onTrackSuccess(position){

    var lat = position.coords.latitude;
    var lon = position.coords.longitude;
    var alt = position.coords.altitude;
    if(!alt){
      alt = 0;
    }

    var latElement = document.getElementById('lat');
    var longElement = document.getElementById('long');
    latElement.innerHTML = position.coords.latitude;
    longElement.innerHTML = position.coords.longitude;

    trackArray.push([lat, lon, alt, position.timestamp]);

    compareToCams(position);
  }

  function onTrackError(error){
    trackArray.push([999,999, 999, 999]); //Mark lost connection in the Array
    console.log(error.code +'\n'+ error.message);
    switch(error.code) {
      case 1:
            PopupService.alert('GPS Zugriff nicht möglich. Vermutlich hat die App keine Zugriffsrechte');
            break;
      case 2:
            PopupService.alert('GPS Position nicht verfügbar. Vermutlich keine Satelliten- oder Netzverbindung');
            break;
      case 3:
            PopupService.alert('Timeout');
            break;
    }
  }

  return {
    startTracking : function() {
      ionic.Platform.ready(function () {
        cordova.plugins.backgroundMode.setDefaults({
          title:  'GPS logging active',
          ticker: 'tickertext',
          text:   'touch to return to App'
        });
        cordova.plugins.backgroundMode.enable();
        watchId = navigator.geolocation.watchPosition(onTrackSuccess,
          onTrackError,
          {timeout: 5000, enableHighAccuracy: true, maximumAge: 3000});
      })
    },
    stopTracking : function() {
      ionic.Platform.ready(function(){
        cordova.plugins.backgroundMode.disable();
        navigator.geolocation.clearWatch(watchId);
        console.log(trackArray);
      })
    },
    getArray: function(){
      return trackArray;
    }
  }

})

.factory('PopupService',function($ionicPopup) {

  return{
    alert: function(message){
      var alertPopup;
      alertPopup = $ionicPopup.alert({
        title: 'Warnung',
        template: message
      });
      return alertPopup; //returns Promise
    }
  }
})

.factory('GPXCreator', function(){

  return{
    createUTCtimestamp: function(timestamp){
      var date = new Date(timestamp);
      var resultDate;
      resultDate = date.getUTCFullYear() + '-'
        + ("0" + date.getUTCMonth()).slice(-2) + '-'
        + ("0" + date.getUTCDate()).slice(-2) + 'T'
        + ("0" + date.getUTCHours()).slice(-2) + ':'
        + ("0" + date.getUTCMinutes()).slice(-2) + ':'
        + ("0" + date.getUTCSeconds()).slice(-2) + 'Z';
    return resultDate;
    },
    createTrkPt: function(arrayPoint){
      var dateStringUTC = this.createUTCtimestamp(arrayPoint[3]);
      var finalStr;
      finalStr = '<trkpt lat=\"' + arrayPoint[0] + '\" lon=\"' + arrayPoint[1] + '\"> \n ' +
        '  <ele>' + arrayPoint[2] + '</ele> \n' +
        '  <time>' + dateStringUTC + '</time> \n' +
        '</trkpt>\n';

      return finalStr;
    },
    createHeader: function(UTCtimestamp){
      var er;
      er = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n ' +
        '\n' +
        '<gpx creator=\"SportografApp\" version=\"1.1\" \n' +
        '  <metadata> \n' +
        '    <link href=\"http://www.sportograf.com.com\"> \n' +
        '    <text>Sportograf</text>\n' +
        '    </link>\n' +
        '    <time>' + UTCtimestamp + '</time>\n' +
        '  </metadata>\n';

      return er;
    }
  }
});
