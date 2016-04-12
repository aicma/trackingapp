angular.module('user.controllers', ['user.services', 'ionic', 'ngCordova', 'ngCordovaOauth'])

.controller('EventCtrl', function($scope, Events){
  $scope.events = Events.all();
})

.controller('FileCtrl', function($scope, FileHandler) {

  FileHandler.readDirectory(cordova.file.dataDirectory).then(function(result){
    if(result){$scope.files = result;}
    else{$scope.files = [];}
  },function(err){
    console.log(err.code);
  });

})

.controller('LandingCtrl', function($scope,$ionicPopup, $http, Events, Numbers, PopupService){
  $scope.events = Events.all();

  $scope.submitData = function (){
    var id = document.getElementById('event').value;
    var tempId =  id.slice(id.search(/ID:\d{1,4}/g)).slice(3); //Holt sich die Event ID aus der auswahl
    var tempEvent = Events.get(tempId);
    var sNumber = document.getElementById('numberfield').value; //Startnummer

    if(tempEvent.numberformat.test(sNumber)){   //wenn die eingegebene Zahl dem zum event gehörigem Zahlenformat entspricht, tue folgendes
      console.log("Numbercheck successful");
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
    //$cordovaOauth.strava('11064','', [write]);
  }
})

.controller('TrackCtrl', function($scope, $stateParams, Events, Tracker, FileHandler, Numbers, PopupService){

  $scope.event = Events.get($stateParams.eventId);
  $scope.buttonStyle = "button button-block button-balanced";
  $scope.buttonText = "Start Tracking";

  var tracking = false;

  $scope.tracking = function(){
    if(tracking){
      $scope.buttonStyle = "button button-block button-balanced";
      $scope.buttonText = "Start Tracking";
      console.log('stop tracking');
      Tracker.stopTracking();
      tracking = false;
      FileHandler.writeGPXFile(Numbers.getEvent()+ "\.gpx", Tracker.getArray()).then(PopupService.choice());

    }else{
      $scope.buttonStyle = "button button-block button-assertive";
      $scope.buttonText = "Stop Tracking";
      console.log('start tracking');
      Tracker.startTracking();
      tracking = true;
    }
  }

});

