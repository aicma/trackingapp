angular.module('user.controllers', ['user.services', 'ionic', 'ngCordova', 'ngCordovaOauth'])

.controller('EventCtrl', function($scope, Events){
  $scope.events = Events.all();
})

.controller('FileCtrl', function($scope, FileHandler) {
  $scope.cloudState

  FileHandler.readDirectory(cordova.file.dataDirectory).then(function(result){
    if(result){$scope.files = result;}
    else{$scope.files = [];}
  },function(err){
    console.log(err.code);
  });

})

.controller('LandingCtrl', function($scope, $http , $cordovaOauth, Events, Numbers, PopupService){
  $scope.events = Events.all();

  $scope.submitData = function (){
    var id = document.getElementById('event').value;
    var tempId =  id.slice(id.search(/ID:\d{1,4}/g)).slice(3).trim(); //Holt sich die Event ID aus der auswahl
    var tempEvent = Events.get(tempId);
    var sNumber = document.getElementById('numberfield').value; //Startnummer

    if(tempEvent.numberformat.test(sNumber)){   //wenn die eingegebene Zahl dem zum event gehörigem Zahlenformat entspricht, tue folgendes
      console.log("Numbercheck successful");
      console.log("a"+tempId + "o");
      Numbers.setSN(sNumber);
      Numbers.setEvent(tempId);
      window.location.href = '#/tracking/' + tempId;
    }else{
      PopupService.alert('Das eingegebene Zahlenformat passt nicht! Bitte kontrolliere deine Eingabe');
    }
  };
  $scope.goToFiles = function(){
    window.location.href = '#/files';
  };
  $scope.connectStrava = function(){
    $cordovaOauth.strava('11064','4fcd0f8ab6306d68ee7d78af9b18b29e4180512d', ['write']).then(function(result){
      console.log("ReturnObjekt" +JSON.stringify(result));
    },function(error){
      console.error(error);
    });
  }
})

.controller('TrackCtrl', function($scope, $http, $stateParams, Events, Tracker, FileHandler, Numbers, PopupService){

  $scope.event = Events.get($stateParams.eventId);
  $scope.buttonStyle = "button button-balanced";
  $scope.buttonText = "Start Tracking";

  var tracking = false;

  $scope.tracking = function(){
    if(tracking){
      $scope.buttonStyle = "button button-balanced";
      $scope.buttonText = "Start Tracking";
      //console.log('stop tracking');
      Tracker.stopTracking();
      tracking = false;
      FileHandler.writeGPXFile(Numbers.getEvent() + ".gpx", Tracker.getArray());

    }else if(navigator.geolocation){
      $scope.buttonStyle = "button button-assertive";
      $scope.buttonText = "Stop Tracking";
      console.log('start tracking');
      Tracker.startTracking();
      tracking = true;
    }else{
      PopupService.alert('your Device does not support Geolocation');
    }
  };
  ionic.Platform.ready(Tracker.initializeMap())
  /*
  ionic.Platform.ready( function(){
    var myLatlng = new google.maps.LatLng(48.3584,10.9062);

    var mapOptions = {
      center: myLatlng,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("mapHolder"),
      mapOptions);
    $scope.map = map;
  })
  */
});

