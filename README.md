# AsyncG
A debugger for asynchronous executions in Node.js

## Dependencies:
AsyncG requires the following commands to be installed in your system:

* git
* curl
* java (version 8)
* gnuplot
* mongodb

With Ubuntu (LTS versions 16.04 and 18.04) the above dependencies can be installed with the following command:

```console
sudo apt-get install git curl mongodb openjdk-8-jdk gnuplot
```

Note that packages ```openjdk-8-jdk```, ```mongodb``` and ```gnuplot``` are included in the ```universe``` repository, which is enabled by default in Ubuntu Desktop but not in Ubuntu Server. ```universe``` repository can be enabled with the following commands:

```console 
sudo add-apt-repository universe

sudo apt-get update
```

## Installation:
Note that if you do not already have the Java JDK version 8 installed or if ```JAVA_HOME``` is not set, the AsyncG installation will not be successful.
AsyncG provides an installation script which downloads the binary files together with the ```AcmeAir``` application and the performance profiler tool ```JMeter```, that are used as experimental setting.
The installation script can be run with the command:
```console
./setup.sh
```

## How to run the experiments:
Provided experiments runs the ```AcmeAir``` application and collect performance information using ```JMeter```. The experiments can be run with the command:
```console
./script/figure6.sh
```

The experiments usually require about 1 hour to complete, once completed the performance results are saved as ```eps``` files in the ```figures``` folder.


## How to debug custom Node.js code with AsyncG:
AsyncG can be used to debug arbitrary Node.js files with the following command:

```console
./script/runAsyncG.sh <file.js>
```

Running the command above will generate logs as output, which can be used to visualuze the Async Graph using the graphs generator tool available at our website: <https://eventloopgraph.github.io/>.

The async graphs generator source code is publicly available at <https://github.com/asyncgraph/asyncgraph.github.io>.

