angular.module('user.controllers', ['user.services'])

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

