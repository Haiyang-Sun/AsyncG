var fs = require("fs");
var timeInterval = 30;
var testTime = 0;

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
			testTime = time;
		var report = getReport(time);
		report.requests += 1;
	}
	return reports;
}

var reportss = [];
for (let i = 2; i < process.argv.length; i++) {
	reportss.push(processLog(process.argv[i]));
}

var entries = testTime/timeInterval;

var reports = [];
for(var i = 0; i < entries; i++){
	let line = (i+1)*timeInterval;
	for (let j = 0; j < reportss.length; j++) {
		if (reportss[j][i])
			line += ' ' + (reportss[j][i].requests/timeInterval).toFixed(2);
		else 
			line += ' ' + 0;
	}
	console.log(line);
}

