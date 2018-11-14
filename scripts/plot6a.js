var fs = require("fs");
var timeInterval = 30;
var testTime = 600;

function processLog(file) {
  const lines = fs.readFileSync(file).toString().split("\n");

  var header = lines.shift().split(",");


  var reports = [];

  function Report (index){
    this.index= index;
    this.requests = 0;
  }

  function getReport(time) {
    var index = Math.floor(time / timeInterval);
    if(!reports[index]){
      reports[index] = new Report(index);
    }
    return reports[index];
  }

  var start = undefined;
  for(var line of lines){
    var row = line.split(",");
    if(row.length < 10)
      break;
    var time = parseFloat(row[0])/1000;
    if(!start)
      start = time;
    time = time - start ;
    if(time >= testTime)
      break;
    var report = getReport(time);
    report.requests += 1;
  }
  return reports;
}

var reportss = [
processLog(process.argv[2]),
processLog(process.argv[3]),
processLog(process.argv[4]),
];

var entries = testTime/timeInterval;

var reports = [];
console.log("time baseline nopromise promise")
for(var i = 0; i < entries; i++){
  if(reportss[0][i] && reportss[1][i] && reportss[2][i]) {
    console.log((i+1)*timeInterval, reportss[0][i].requests/timeInterval, reportss[1][i].requests/timeInterval, reportss[2][i].requests/timeInterval);
  }
}

