#!/usr/bin/env node
// Adapated from http://www.kdmooreconsulting.com/blogs/build-a-cordova-hook-to-setup-environment-specific-constants/

var fs = require("fs")
var path = require("path")
var root = process.argv[2]
function replace_string_in_file(filename, placeholder, realval){
  var data = fs.readFileSync(filename,'utf8')
  var rew = new RegExp(placeholder,'g')
  var result = data.replace(re,realval)  
  fs.writeFileSync(filename,result,'utf8')
}

var srcfile = path.join(rootdir,"server-details.js")
var params=require(srcfile)

var pathToReplace = {
  "android" : "platforms/android/assets/www",
  "ios" : "platforms/ios/www"
}

var platforms = process.enc.CORDOVA_PLATFORMS.split(',')

for(var i =0; i < platforms.length; i++){
  var platformPath = pathToReplace[platforms[i]]
  replace_string_in_file(path.join(rootdir,platformPath,'index.html'),'APISERVER',params.server)
  replace_string_in_file(path.join(rootdir,platformPath,'js/index.js'),'APISERVER',params.server)
  replace_string_in_file(path.join(rootdir,platformPath,'js/index.js'),'GCMNUMBER',params.gcm)
}
