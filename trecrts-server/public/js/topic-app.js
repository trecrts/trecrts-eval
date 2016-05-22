var trecapp = angular.module('rtsapp', []);

trecapp.controller('TopicCtrl', ['$scope', '$http', 
  function($scope,$http){
    $scope.validated = false;
    $scope.topics = [];
    $scope.uniqid = ""
    $scope.interested = [];
    $scope.validate = function(){
      $http.get('/topics/'+$scope.uniqid)
      .success(function(data){
        $scope.validated = true;
        $scope.topics = data;
      })
      .fail(function(resp){
        alert("Validation failed: " + resp.message);
      });
    };
    $scope.requestTopics = function(){
      $http.post('/topics/interest/'+$scope.uniqid,JSON.stringify(interested))
      .success(function(resp){
        alert("Topics successfully requested! You can now use the judging app.");
      })
      .fail(function(resp){
        alert("Unable to request topics: " + resp.message);
      });
    };
    $scope.isAvailable = function(topid,checked){
      if(checked){
        $http.get('/topics/available/'+$scope.uniqid+'/'+topid)
        .success(function(){
          $scope.interested.push(topid);
        })
        .fail(function(){
          angular.forEarch(topics,function(idx,topicObj){
            if(topicObj === topid){
              topics[idx].disabled = true;
              topics[idx].checked = false;
            }
          });
        });
      }else{
        var idx = $scope.interested.indexOf(topid);
        $scope.interested.splice(idx,1);
      }
    };
}]);
