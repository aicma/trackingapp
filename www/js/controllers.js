angular.module('user.controllers', ['user.services', 'ionic', 'ngCordova', 'ngCordovaOauth'])

.controller('FileCtrl', function($scope, FileHandler) {
  $scope.cloudState = "icon ion-android-cloud";

  $scope.upload = function(file){
  };

  FileHandler.readDirectory(cordova.file.dataDirectory).then(function(result){
    if(result){$scope.files = result;}
    else{$scope.files = [];}
  },function(err){
    console.log(err.code);
  });

})

.controller('LandingCtrl', function($state, $scope, $http, $ionicLoading, $cordovaOauth, Events, Numbers, PopupService){
  $scope.$on('$ionicView.beforeEnter', function(){
    Events.loadEvents().then(function(){
      $scope.events = Events.all();

    });
    //console.log('loading done');
  });

  $scope.show = function() {
    $ionicLoading.show({
      template: '<p>Loading...</p><ion-spinner></ion-spinner>'
    });
  };
  $scope.hide = function(){
    $ionicLoading.hide();
  };

  $scope.submitData = function (){
    var id = document.getElementById('event').value;
    var tempId =  id.slice(id.search(/ID:\d{1,4}/g)).slice(3).trim(); //Holt sich die Event ID aus der auswahl
    var tempEvent = Events.get(tempId);
    var sNumber = document.getElementById('numberfield').value; //Startnummer

    if(tempEvent.numberformat.test(sNumber)){   //wenn die eingegebene Zahl dem zum event gehörigem Zahlenformat entspricht, tue folgendes
      //console.log("Numbercheck successful");
      //console.log(tempId);
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
      console.log("ReturnObjekt " +JSON.stringify(result));
    },function(error){
      console.error(error);
    });
  }
})

.controller('TrackCtrl', function($scope, $http, $stateParams, Cameras, Events, Tracker, FileHandler, Numbers, PopupService){

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
      FileHandler.writeGPXFile(Numbers.getSN() +"at"+Numbers.getEvent() + ".gpx", Tracker.getArray());

    }else if(navigator.geolocation){
      $scope.buttonStyle = "button button-assertive";
      $scope.buttonText = "Stop Tracking";
      //console.log('start tracking');
      Tracker.startTracking();
      tracking = true;
    }else{
      PopupService.alert('your Device does not support Geolocation');
    }
  };
  ionic.Platform.ready(function(){
    Cameras.init();
    Tracker.initializeMap();
  });

})

;
