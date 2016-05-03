angular.module('user.services', [])

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

.factory('Events', function(){
  var events = [
    {
      id: 0,
      name: "Zugspitz Ultratrail",
      date: new Date("2016-06-23"),
      img: "",
      numberformat: /^\d{4}$/
    },
    {
      id: 1,
      name: "Rad am Ring",
      date: new Date("2016-07-23"),
      img: "",
      numberformat: /^[A-B]{1}\s*\d{1,4}$/i
    },
    {
      id: 2,
      name: "TestEvent",
      date: new Date("2016-02-23"),
      img: "",
      numberformat: /^\d{1,4}\s*[A-B]$/i
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

/*.factory('Riders', function(){
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

})  //TESTDATA //TODO: Serverabfrage */

/*.factory('FollowedRiders', function(Riders){
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
})*/

.factory('Cameras', function($http){
  var cams;

  function initcams(){
    console.log('function called, so thats not the porblem');
    $http({
      method: 'GET',
      url: 'https://testserver-ontrack.herokuapp.com/' //TODO: eventspezifisch incl datenbank
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
    init: function(){
      console.log('called the init');
      initcams();
      return null;
    }
  }

})

.factory('FileHandler', function($q, GPXCreator, Numbers){

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
          if(i==0){trkString+= '<trk> \n <name>' + Numbers.getSN() + 'at Event#' + Numbers.getEvent() + '</name> \n <trkseg>\n'} //GET EVENT NAME HERE?
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

                console.log('Write of file "' + fileName + '" completed.');
                resolve();
              };
              fileWriter.onerror = function (e) {
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
    }
  }
})

.factory('Tracker', function($http, Cameras, PopupService, Numbers){
  var watch = null;
  var trackArray = [];

  var map, currentPositionMarker;
  var mapCenter = new google.maps.LatLng(48.3584,10.9062); //Default map Position (HS AUGSBURG)

  /**
   * Takes a Posistion Object and compares the position to the Positions from the "Cameras"-Factory
   * If true it does something
   * @param position
     */
  function compareToCams(position){
    var cams = Cameras.all();
    console.log(cams);
    var deltaDistance = 10 * 90/10000000; // 10 Meter in Dezimalgrad

    // x1-x2 y1-y2 < delta
    for(var cam in cams){
      var bool1 = Math.abs(Math.abs(position.coords.longitude) - Math.abs(cams[cam].long)) < deltaDistance;
      var bool2 = Math.abs(Math.abs(position.coords.latitude) - Math.abs(cams[cam].lat)) < deltaDistance;

      if(bool1 && bool2) {
        console.log("YOU ARE CLOSE TO A CAMERA!!!! DO SOMETHING!"); //TODO: send position to server
        var req = {
          method: 'POST',
          url: 'https://testserver-ontrack.herokuapp.com/change',
          data: {
            rider: Numbers.getSN() ,
            event: Numbers.getEvent() ,
            camera: i
            }
        };

        $http(req).then(function(success){console.log('post success');}, function(error){console.log(error);})
        //PopupService.alert('close to cam!');
        //PSEUDOCODE HTTP.POST(Numbers.Startnummer, cams[i].id, position.timestamp)

      }
    }
  }

  /**
   * Initializes the Map Element
   * @param
   */
  function initMap()
  {
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

  // current position of the user
  function setCurrentMapPosition(pos) {

    map.panTo(new google.maps.LatLng(
      pos.coords.latitude,
      pos.coords.longitude
    ));
  }

  function onTrackSuccess(position){
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

  function onTrackError(error){
    trackArray.push([999, error.code]); //Mark lost connection in the Array
    console.log(error.code +'\n'+ error.message);
    switch(error.code) {
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
    startTracking : function() {
      ionic.Platform.ready(function () {
        cordova.plugins.backgroundMode.setDefaults({
          title: 'GPS logging active',
          ticker: 'tickertext',
          text: 'touch to return to App'
        });
        cordova.plugins.backgroundMode.enable();
        watch = navigator.geolocation.watchPosition(onTrackSuccess, onTrackError,
          {timeout: 10000, enableHighAccuracy: true, maximumAge: 3000});

      })
    },
    stopTracking : function() {
      ionic.Platform.ready(function(){
        cordova.plugins.backgroundMode.disable();
        navigator.geolocation.clearWatch(watch);
        clearInterval(watch); // TIMEDTRACKING
        console.log(trackArray);
      })
    },
    getArray: function(){
      return trackArray;
    },
    initializeMap: function() {
      initMap();
      return null;
    }
  }
})

.factory('PopupService',function($ionicPopup, $ionicActionSheet) {

  return{
    alert: function(message){
      var alertPopup;
      alertPopup = $ionicPopup.alert({
        title: 'Warnung',
        template: message
      });
      return alertPopup; //returns Promise
    },
    choice: function(){ //FUNKTIONIERT FAST
      var choiceSheet;
      choiceSheet = $ionicActionSheet.show({
        titleText: 'GPX File',
        buttons: [
          {text: 'Upload to Strava'},
          {text: 'Upload to Sportograf'},
        ],
        cancelText: 'Show in Browser',
        destructiveText: '<b>Dont Save</b>',
        cancel: function(){
          console.log('canceled');
          window.location.href = '#/files';
        },
        buttonClicked: function(index){
          switch (index){
            case 0:
                  console.log('He wants to Upload to Strava');//UploadFileto to Strava
                  return true;
                  break;
            case 1:
                  console.log('He wants to Upload to Sportograf');//UploadFileTo Sportograf
                  return true;
                  break;
          }
        }
      });
      return choiceSheet;
    },
    customPop: function(){ //NOT FUNCTIONAL
      var myPopup = $ionicPopup.show({
        template: '',
        title: 'What now?',
        subTitle: 'select what to do with your Track',
        scope: $scope,
        buttons: [
          { text: 'Cancel' },
          {
            text: '<b>Save</b>',
            type: 'button-positive',
            onTap: function() {

            }
          }
        ]
      });
      return myPopup;
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
      finalStr = '<trkpt lat=\"' + arrayPoint[0] + '\" lon=\"' + arrayPoint[1] + '\"> \n ';
      if(arrayPoint[2]){
        finalStr += '  <ele>' + arrayPoint[2] + '</ele> \n';
      }
      finalStr += '  <time>' + dateStringUTC + '</time> \n' +
                  '  <cmt> accuracy'+ arrayPoint[4] +'</cmt> \n' +
                  '</trkpt>\n';

      return finalStr;
    },
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
