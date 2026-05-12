#!/bin/bash
cd /home/osboxes/UERANSIM
sudo ./build/nr-gnb -c config/open5gs-gnb.yaml > ~/5g1/logs/gnb.log 2>&1 &
