#!/bin/bash
cd /home/z/my-project
while true; do
  npx next start -p 3000
  echo "Server died, restarting in 2s..."
  sleep 2
done
