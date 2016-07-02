angular.module('user.controllers', ['user.services', 'ionic', 'ngCordova', 'ngCordovaOauth'])

.controller('FileCtrl', function($scope, FileHandler) {
  $scope.cloudState = "icon ion-android-cloud";

  $scope.upload = function(file){
    //PSEUDOCODE: OPEN POPOVER ->Select Service -> Oauth Service -> Upload(file)
  };

  FileHandler.readDirectory(cordova.file.externalDataDirectory).then(function(result){
    if(result){$scope.files = result;}
    else{$scope.files = [];}
  },function(err){
    console.log(err.code);
  });

})

.controller('LandingCtrl', function($timeout, $state, $scope, $http, $ionicLoading, $cordovaOauth, Events, Numbers, PopupService){

  function loadingFailed(){
    $ionicLoading.hide();
    PopupService.alert('Event-Loading timed out! \n Please check your Internet-Connection and try again');
    $scope.$broadcast('scroll.refreshComplete');
  }

  function loadEvents(){
    $ionicLoading.show({template: '<p>Loading Events ... </p><ion-spinner></ion-spinner>'});
    var timer = $timeout(loadingFailed, 10000);
    Events.loadEvents().then(function (events) {
      $timeout.cancel(timer);
      $scope.events = events;
      $scope.$apply();
      $ionicLoading.hide();
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

  $scope.$on('$ionicView.enter', function(){
    loadEvents();
  });

  $scope.refresh = function(){
    loadEvents();
  };

  $scope.submitData = function (){
    var id = document.getElementById('event').value;
    var tempId =  id.slice(id.search(/ID:\d{1,4}/g)).slice(3).trim(); //Holt sich die Event ID aus der auswahl
    var tempEvent = Events.get(tempId);
    var sNumber = document.getElementById('numberfield').value; //Startnummer

    var regex = new RegExp(tempEvent.numberformat, 'i');


    if(regex.test(sNumber)){   //wenn die eingegebene Zahl dem zum event gehörigem Zahlenformat entspricht, tue folgendes
      //console.log("Numbercheck successful");
      //console.log(tempId);
      Numbers.setSN(sNumber);
      Numbers.setEvent(tempId);
      window.location.href = '#/tracking/' + tempId;
    }else{
      PopupService.alert('Das eingegebene Zahlenformat passt nicht! Bitte kontrolliere deine Eingabe');
    }
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
  $scope.buttonStyle = "button button-block button-balanced";
  $scope.buttonText = "Start Tracking";

  ionic.Platform.ready(function(){
    //document.addEventListener("online", onOnline(), false);
    //document.addEventListener("offline", onDisco(), false);
  });

  function onDisco(){
    console.log('DISCOnnect!');
    console.log(navigator.connection.type);
  }

  function onOnline(){
    //DEVICE got connection again, try to upload the camlog!
      console.log('connected via: '+ navigator.connection.type);
      var logs = Tracker.getCamLog();
      console.log('current logs:' +logs);

      for(var i = logs.length-1; i >= 0; i--){
        $http.post('https://testserver-ontrack.herokuapp.com/rider', JSON.parse(logs[i]), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-cache"
          }
        }).then(function (success) {
          console.log(logs.length);
          console.log('Camlog element post success');
          console.log('we popped: ' + logs.pop());
        }, function (error) {
          console.log(error);
        }
        )
      }
  }
  var tracking = false;

  $scope.tracking = function(){
    if(tracking){
      $scope.buttonStyle = "button button-block button-balanced";
      $scope.buttonText = "Start Tracking";
      //console.log('stop tracking');
      Tracker.stopTracking();
      tracking = false;
      //FileHandler.write(Numbers.getEvent() +"Camlog.json", Tracker.getCamLog()); //Not really necessary since after the race its rather pointless
      FileHandler.writeGPXFile(Numbers.getSN() +"at"+Numbers.getEvent() + ".gpx", Tracker.getArray());

    }else if(navigator.geolocation){
      $scope.buttonStyle = "button button-block button-assertive";
      $scope.buttonText = "Stop Tracking";
      //console.log('start tracking');
      Tracker.startTracking();
      tracking = true;
    }else{
      PopupService.alert('your Device does not support Geolocation');
    }
  };
  $scope.$on('$ionicView.enter', function(){
    Cameras.init($stateParams.eventId);
    Tracker.initializeMap();
  });

})

;
