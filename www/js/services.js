angular.module('user.services', [])

.factory('Events', function(){
  var events = [
    {
      id: 0,
      name: "Zugspitz Ultratrail",
      date: [21, 7, 2016],
      img: "http://wordpress.planb-event.com/zut/wp-content/uploads/sites/13/2015/11/logo_zut.png",
      races: [0]
    },
    {
      id: 1,
      name: "Rad am Ring",
      date: [7, 8, 2016],
      img: "http://www.aufzumatem.net/aza/wp-content/uploads/2015/07/05_RadAmRing_logo.jpg",
      races: [1]
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
