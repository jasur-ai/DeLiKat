#!/bin/bash
cd /opt/goinfre/donnellg/kali-linux-2026.1-virtualbox-amd64/Startup/DeLiKet-web
source venv/bin/activate
export PYTHONPATH="$PWD:$PYTHONPATH"
cd /opt/goinfre/donnellg/kali-linux-2026.1-virtualbox-amd64/Startup/DeLiKet-web
python3 -c "
import os
os.chdir('/opt/goinfre/donnellg/kali-linux-2026.1-virtualbox-amd64/Startup/DeLiKet-web')
from dotenv import load_dotenv
load_dotenv()
from bot.main import main
main()
"