var trecapp = angular.module('rtsapp', []);

trecapp.controller('TopicCtrl', ['$scope', '$http', 
  function($scope,$http){
    $scope.validated = false;
    $scope.topics = [];
    $scope.uniqid = ""
    $scope.interested = [];
    $scope.validate = function(){
      console.log('Clicked')
      $http.get('/topics/'+$scope.uniqid)
      .success(function(data){

        $scope.validated = true;
        $scope.topics = data;
      })
      .error(function(resp){
        alert("Validation failed: " + resp.message);
      });
    };
    $scope.requestTopics = function(){
      $http.post('/topics/interest/'+$scope.uniqid,JSON.stringify($scope.interested))
      .success(function(resp){
        alert("Topics successfully requested! You can now use the judging app.");
      })
      .error(function(resp){
        alert("Unable to request topics: " + resp.message);
      });
    };
    $scope.isAvailable = function(topid,checked){
      if(checked){
        $http.get('/topics/available/'+$scope.uniqid+'/'+topid)
        .success(function(){
          $scope.interested.push(topid);
        })
        .error(function(resp){
          console.log(resp);
          angular.forEarch($scope.topics,function(idx,topicObj){
            if(topicObj === topid){
              $scope.topics[idx].disabled = true;
              $scope.topics[idx].checked = false;
            }
          });
        });
      }else{
        var idx = $scope.interested.indexOf(topid);
        $scope.interested.splice(idx,1);
      }
    };
}]);
