# AsyncG
A debugger for asynchronous executions in Node.js

## Benchmark Dependencies:
To run the AcmeAir benchmark, the following tools are required:

* git
* curl
* gnuplot
* mongodb

With Ubuntu (LTS versions 16.04 and 18.04) the above dependencies can be installed with the following command:

```console
sudo apt-get install git curl mongodb gnuplot
```

Note that packages ```mongodb``` and ```gnuplot``` are included in the ```universe``` repository, which is enabled by default in Ubuntu Desktop but not in Ubuntu Server. ```universe``` repository can be enabled with the following commands:

```console 
sudo add-apt-repository universe

sudo apt-get update
```

## Installation:
AsyncG provides an installation script which downloads the binary files together with the ```AcmeAir``` application and its driver program using ```JMeter``` for benchmarking.
The installation script can be run with the command:
```console
./setup.sh
```

## How to run the experiments:
Provided experiments runs the ```AcmeAir``` application and collect performance information using ```JMeter```. The experiments can be run with the command:
```console
./scripts/figure6.sh
```

The experiments usually require about half an hour to complete, once completed the performance results are saved as ```eps``` files in the ```figures``` folder.


## How to debug custom Node.js code with AsyncG:
AsyncG can be used to debug arbitrary Node.js files with the following command:

```console
./scripts/runAsyncG.sh <file.js>
```
Running the command above will generate logs as output, which can be used to visualuze the Async Graph using the graphs generator tool available at our website: <https://asyncgraph.github.io/>.

The async graphs generator source code is publicly available at <https://github.com/asyncgraph/asyncgraph.github.io>.

