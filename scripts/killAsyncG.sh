#!/bin/bash

ps aux | grep graalvm | grep node | grep -v "grep" | awk '{print "kill -9 "$2}' | bash
