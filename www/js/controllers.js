angular.module('user.controllers', ['user.services', 'ngCordova'])

.controller('EventCtrl', function($scope, Events){
  $scope.events = Events.all();
})

.controller('EventDetailCtrl', function($scope, $stateParams, Events, Riders, FollowedRiders) {
  $scope.event = Events.get($stateParams.eventId);
  $scope.riders = Riders.all();

  $scope.followClick = function(){
    FollowedRiders.add(Riders.getNumber(document.getElementById('Startnummer').value));
    document.getElementById('Startnummer').value = "";
  }
})

.controller('LandingCtrl', function($scope,$ionicPopup, Events, PopupService){
  $scope.events = Events.all();

  $scope.submitData = function (){
    var id = document.getElementById('event').value;
    var tempId =  id.slice(id.search(/ID:\d{1,4}/g)).slice(3); //Holt sich die Event ID aus der auswahl
    var tempEvent = Events.get(tempId);
    var sNumber = document.getElementById('numberfield').value; //Startnummer

    if(sNumber.match(tempEvent.numberformat).length == 1){   //wenn die eingegebene Zahl dem zum event gehörigem Zahlenformat entspricht, tue folgendes
      console.log("Alles passt, kann weiter gehen");
      window.location.href = '#/tracking/' + tempId;
    }else{
      PopupService.alert('Das eingegebene Zahlenformat passt nicht! Bitte kontrolliere deine Eingabe');
    }
  }
})

.controller('TrackCtrl', function($scope, $stateParams, Events, Tracker, FileHandler, PopupService){
  $scope.event = Events.get($stateParams.eventId);


  $scope.startTrack = function(){
    console.log('start tracking');
    Tracker.startTracking();

  };

  $scope.stopTrack = function(){
    console.log('stop tracking');
    FileHandler.writeGPXFile('testfile.txt', Tracker.getArray());
    Tracker.stopTracking();

  };



})

