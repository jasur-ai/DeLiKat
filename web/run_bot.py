"""Start DeLiKet Bot"""
import os
import sys

# Add project root to path
project_root = os.path.dirname(os.path.abspath(__file__))
os.chdir(project_root)
sys.path.insert(0, project_root)

from dotenv import load_dotenv
load_dotenv()

from bot.main import main
main()
