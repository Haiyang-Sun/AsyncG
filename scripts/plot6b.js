var fs = require("fs");
const lines = fs.readFileSync(process.argv[3]).toString().split("\n");
const lines2 = fs.readFileSync(process.argv[2]).toString().split("\n");

var header = lines.shift().split(",");
var header2 = lines2.shift().split(",");

var timeInterval = 30;
var testTime = 600;

var reports = [];

function Report (index){
  this.index= index;
  this.nextTick = 0;
  this.emitter = 0;
  this.promise = 0;
  this.requests = 0;
}

function getReport(time) {
  var index = Math.floor(time / timeInterval);
  if(!reports[index]){
    reports[index] = new Report(index);
  }
  return reports[index];
}

for(var line of lines){
  var row = line.split(",");
  if(row.length < 10)
    break;
  var time = parseFloat(row[1])-timeInterval-30;
  if(time < 0)
    continue;
  if(time >= testTime)
    break;
  var report = getReport(time);
  report.nextTick += parseInt(row[3]);
  report.emitter += parseInt(row[11]);
  report.promise += parseInt(row[13]);
}

var start = undefined;
for(var line of lines2){
  var row = line.split(",");
  if(row.length < 10)
    break;
  var time = parseFloat(row[0])/1000;
  if(!start)
    start = time;
  time = time - start;
  if(time >= testTime)
    break;
  var report = getReport(time);
  report.requests += 1;
}

console.log("time", "promise/request", "emitter/request", "nextTick/request");
function toFixed(f){
  return Math.floor(f*1000)/1000;
}
var sumP=0, sumE=0, sumT = 0;
var cnt = 0;
for(var report of reports){
  console.log(toFixed((report.index+1)*timeInterval), toFixed(report.promise / report.requests), toFixed(report.emitter / report.requests), toFixed(report.nextTick / report.requests));
  if(report.requests>0){
    cnt++;
    sumP+=report.promise/report.requests;
    sumE+=report.emitter/report.requests;
    sumT+=report.nextTick/report.requests;
  }
}

//console.log("avg", sumP/cnt, sumE/cnt, sumT/cnt);


