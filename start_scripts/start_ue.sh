#!/bin/bash
cd /home/osboxes/UERANSIM
sudo ./build/nr-ue -c config/open5gs-ue.yaml > ~/5g1/logs/ue.log 2>&1 &
