angular.module('user.services', [])

.constant('SERVER',{
  "URL": "https://testserver-ontrack.herokuapp.com"
})
.factory('Numbers', function(){
  var Startnummer;
  var EventId;

  return{
    getSN: function(){
      return Startnummer;
    },
    setSN: function(num){
      Startnummer = num;
      return Startnummer;
    },
    getEvent: function(){
      return EventId;
    },
    setEvent: function(num){
      EventId = num;
      return EventId;
    }
  }
})

.factory('Events', function($http, SERVER){
  var events;


  return{
    loadEvents: function() {
      return new Promise(function(resolve, reject){
        $http({
          headers:{
            "Access-Control-Allow-Origin":"*"
          },
          method: 'GET',
          url: SERVER.URL + '/events'
        }).then(function (response) {
            events = response.data;
            console.log('load-events ' + events);
            resolve(events);
          },
          function (error) {
            console.log(error);
            reject();
          }
        );
      })
    },
    all: function(){
      console.log('loading all events ' + events);
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
})

.factory('Cameras', function($http, SERVER){
  var cams;

  function getcams(eventId){
    $http({
      method: 'GET',
      url: SERVER.URL + '/cameras?id='+ eventId //TODO: eventspezifisch incl datenbank
    }).then(function(response){
        cams = response.data;
        console.log(cams);
      },
      function(error){console.log(error)}
    );
  }
  return {
    all: function(){
      if(cams) {
        return cams;
      }else{
        console.error('no cams found');
      }
    },
    init: function(eventId){
      getcams(eventId);
      return null;
    }
  }

})

.factory('FileHandler', function(GPXCreator, Numbers){

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

  function writeFile(fileName, data){
    return new Promise(function(resolve, reject)
    {
      window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (directoryEntry) {
        directoryEntry.getFile(fileName, {create: true}, function (fileEntry) {
          fileEntry.createWriter(function (fileWriter) {
            //CALLBACKS
            fileWriter.onwriteend = function (e) {

              console.log('Write of file "' + fileName + '" completed.');
              resolve();
            };
            fileWriter.onerror = function (e) {
              console.log('Write failed: ' + e.toString());
              reject();
            };

            //ACTUAL MAGIC HAPPENING
            var blob = new Blob(data, {type: 'text/plain'});
            fileWriter.write(blob);
          }, errorHandler.bind(null, fileName));
        }, errorHandler.bind(null, fileName));
      }, errorHandler.bind(null, fileName));
    })
  }

  return {
    /**
     * Accepts a filename and data Array with trackpoints. Writes out a header and an trkpt for every array element.
     * @param fileName
     * @param data
       */
    writeGPXFile: function(fileName, data) {
      console.log('writing file...');

      return new Promise(function (resolve, reject) {
        //create GPX1.1 header with the time the recording started
        var trkString = GPXCreator.createHeader(GPXCreator.createUTCtimestamp(data[0][3]));

        for(var i=0;i<data.length;i++){
          //if its the first element, name the track with the IDs and open the first trkSegment
          if(i==0){trkString+= '<trk> \n <name>' + Numbers.getSN() + 'at EventID#' + Numbers.getEvent() + '</name> \n <trkseg>\n'}
          if(data[i][0] == 999){
            //if there was an error, close current trksegment and open a new one
            trkString += '</trkseg> \n <trkseg>\n';
          }else {
            //for any other point, create a trkpoint and add it to the string
            trkString += GPXCreator.createTrkPt(data[i]);
          }
          //if its the last element, close the file
          if(i==data.length-1){trkString += '</trkseg> \n </trk> \n </gpx>';}
        }

        writeFile(fileName,[trkString]).then(resolve(),reject());
        //window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (directoryEntry) {
        //  directoryEntry.getFile(fileName, {create: true}, function (fileEntry) {
        //    fileEntry.createWriter(function (fileWriter) {
        //      //CALLBACKS
        //      fileWriter.onwriteend = function (e) {
        //
        //        console.log('Write of file "' + fileName + '" completed.');
        //        resolve();
        //      };
        //      fileWriter.onerror = function (e) {
        //        console.log('Write failed: ' + e.toString());
        //        reject();
        //      };
        //
        //      //ACTUAL MAGIC HAPPENING
        //      var blob = new Blob([trkString], {type: 'text/plain'});
        //      fileWriter.write(blob);
        //    }, errorHandler.bind(null, fileName));
        //  }, errorHandler.bind(null, fileName));
        //}, errorHandler.bind(null, fileName));
      })
    },

    readDirectory: function(pathToDir){
     console.log('reading directory...');
      return new Promise(function(resolve, reject){
          ionic.Platform.ready(function () {
            window.resolveLocalFileSystemURL(pathToDir, function (fileSystem) {
            var directoryReader = fileSystem.createReader();
            directoryReader.readEntries(function (entries) {

              resolve(entries);
            }, function(error) {
              reject(error);
            });
            }, function (error) {
            reject(error);
            });
          })
      })
    },
    write: function(fileName, data) {
      writeFile(fileName, data);
    }
  }
})

.factory('Tracker', function($http, $cordovaGeolocation, Cameras, PopupService, Numbers, FileHandler) {
  var watch = null;
  var trackArray = [];
  var camLog = [];

  var map, currentPositionMarker;
  var mapCenter = new google.maps.LatLng(48.3584, 10.9062); //Default map Position (HS AUGSBURG)

  function checkConnection(){
    if(navigator.connection.type != Connection.NONE) {
      console.log('connected via: '+ navigator.connection.type);
      console.log('current logs:' + camLog.length);

      for (var i = camLog.length - 1; i >= 0; i--) {
        $http.post('https://testserver-ontrack.herokuapp.com/rider', JSON.parse(camLog[i]), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-cache"
          }
        }).then(function (success) {
            console.log(camLog.length);
            console.log('Camlog elmnt post success');
            console.log('we popped: ' + camLog.pop());
          }, function (error) {
            console.log(error);
          }
        )
      }
    }else{console.log(navigator.connection.type);}
  }

  /**
   * Takes a Posistion Object and compares the position to the Positions from the "Cameras"-Factory
   * If true it does something TODO: check connection save localy if false, upload everthing asap.
   * @param position
   */
  function compareToCams(position) {
    var cams = Cameras.all();
    var deltaDistance = 50 * 90 / 10000000; // 50 Meter in Dezimalgrad

    // x1-x2 y1-y2 < delta
    for (var cam in cams) {
      var bool1 = Math.abs(Math.abs(position.coords.longitude) - Math.abs(cams[cam].long)) < deltaDistance;
      var bool2 = Math.abs(Math.abs(position.coords.latitude) - Math.abs(cams[cam].lat)) < deltaDistance;
      console.log(cam + " : " + bool1 + "&" + bool2);
      if (bool1 && bool2) {
        //CLOSE TO A CAM
        var config = {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-cache"
          }
        }; //write Header
        var data = {
          rider: Numbers.getSN(),
          event: Numbers.getEvent(),
          camera: cam,
          time: position.timestamp
        }; //set up data to transfer
        //TRY UPLOAD
        if(navigator.connection.type != Connection.NONE) {
          console.log('App is connected via: '+ navigator.connection.type +', will upload now');
          $http.post('https://testserver-ontrack.herokuapp.com/rider', data, config).then(function (success) {
            console.log('post success');
          }, function (error) {
            console.log(error);
          })
        }else{
          console.log('no connection, will cache');
          camLog.unshift(JSON.stringify(data)); //add the MOST RECENT element to the BEGINNING of the array
        }
      }
    }
  }

  /**
   * Initializes the Map Element
   * @param
   */
  function initMap() {
    map = new google.maps.Map(document.getElementById('mapHolder'), {
      zoom: 18,
      center: mapCenter,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    currentPositionMarker = new google.maps.Marker({
      map: map,
      position: mapCenter,
      title: "Current Position"
    });
    currentPositionMarker.setVisible(false);
  }

  /**
   * pans the Map element to the current position of the user
   * @param pos
     */
  function setCurrentMapPosition(pos) {

    map.panTo(new google.maps.LatLng(
      pos.coords.latitude,
      pos.coords.longitude
    ));
  }

  /**
   * Success callback of the watchPosition function. fires every time the device sends a new position element
   * @param position
     */
  function onTrackSuccess(position) {
    checkConnection();
    var lat = position.coords.latitude;
    var lon = position.coords.longitude;
    var alt = position.coords.altitude;
    var acc = position.coords.accuracy;
    setCurrentMapPosition(position);
    currentPositionMarker.setPosition(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
    currentPositionMarker.setVisible(true);

    var latElement = document.getElementById('lat');
    var longElement = document.getElementById('long');
    latElement.innerHTML = position.coords.latitude;
    longElement.innerHTML = position.coords.longitude;

    trackArray.push([lat, lon, alt, position.timestamp, acc]);

    compareToCams(position);
  }

  /**
   * Error callback of watchPosition function. fires whenever the device is unable to return a position within the timeout
   * @param error
     */
  function onTrackError(error) {
    trackArray.push([999, error.code]); //Mark lost connection in the Array
    console.log(error.code + '\n' + error.message);
    switch (error.code) {
      case error.PERMISSION_DENIED:
        PopupService.alert('GPS Zugriff nicht möglich. Vermutlich hat die App keine Zugriffsrechte');
        break;
      case error.POSITION_UNAVAILABLE:
        PopupService.alert('GPS Position nicht verfügbar. Vermutlich keine Satelliten- oder Netzverbindung');
        break;
      case error.TIMEOUT:
        PopupService.alert('Timeout');
        break;
    }
  }

  return {
    startTracking: function () {
      ionic.Platform.ready(function () {
        cordova.plugins.backgroundMode.setDefaults({
          title: 'GPS logging active',
          ticker: 'tickertext',
          text: 'touch to return to App'
        });
        cordova.plugins.backgroundMode.enable();
        watch = navigator.geolocation.watchPosition(onTrackSuccess, onTrackError,
          {timeout: 10*1000, enableHighAccuracy: true, maximumAge: 3*1000});

      })
    },
    stopTracking: function () {
      ionic.Platform.ready(function () {
        cordova.plugins.backgroundMode.disable();
        navigator.geolocation.clearWatch(watch);
        console.log(trackArray);
      })
    },
    getArray: function () {
      return trackArray;
    },
    getCamLog: function(){
      return camLog;
    },
    initializeMap: function () {
      initMap();
      return null;
    }
  }

})

.factory('PopupService',function($ionicPopup) {

  return{
    /**
     * Just a Alert-PopUp Wrapper
     * @param message
     * @returns {*}
       */
    alert: function(message){
      var alertPopup;
      alertPopup = $ionicPopup.alert({
        title: 'Warning',
        template: message
      });
      return alertPopup; //returns Promise
    }
  }
})

.factory('GPXCreator', function(){

  return{
    /**
     * takes any sort of timestamp format and returns it in UTC-Form
     * @param timestamp
     * @returns {string|*}
       */
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
    /**
     * takes an array of [Latitude, Longitude, (elevation), timestamp, accuracy]
     * returns GPX-compatible <trkpt> Element as String
     * @param arrayPoint
     * @returns {string|*}
       */
    createTrkPt: function(arrayPoint){
      var dateStringUTC = this.createUTCtimestamp(arrayPoint[3]);
      var finalStr;
      finalStr = '<trkpt lat=\"' + arrayPoint[0] + '\" lon=\"' + arrayPoint[1] + '\"> \n ';
      if(arrayPoint[2]){
        finalStr += '  <ele>' + arrayPoint[2] + '</ele> \n';
      }
      finalStr += '  <time>' + dateStringUTC + '</time> \n' +
                  '  <cmt> accuracy'+ arrayPoint[4] +'</cmt> \n' +
                  '</trkpt>\n';

      return finalStr;
    },
    /**
     * Takes an UTC-formatted timestamp and returns a GPX-compatible header as String
     * @param UTCtimestamp
     * @returns {string|*}
       */
    createHeader: function(UTCtimestamp){
      var it;
      it = '<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n ' +
        '\n' +
        '<gpx creator=\"SportografApp\" version=\"1.1\" \n' +
        'xmlns=\"http://www.topografix.com/GPX/1/1\" \n' +
        'xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" \n' +
        'xsi:schemaLocation=\"http://www.topografix.com/GPX/1/1 \n' +
        'http://www.topografix.com/GPX/1/1/gpx.xsd\"> \n' +
        '  <metadata> \n' +
        '    <link href=\"http://www.sportograf.com\"> \n' +
        '    <text>Sportograf</text>\n' +
        '    </link>\n' +
        '    <time>' + UTCtimestamp + '</time>\n' +
        '  </metadata>\n';

      return it;
    }
  }
});
