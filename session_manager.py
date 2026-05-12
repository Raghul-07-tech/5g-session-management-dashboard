import os
import subprocess
import random

BASE_DIR = "/home/osboxes/UERANSIM"
LOG_FILE = "logs/ue.log"

# ------------------ EXECUTE SCRIPT ------------------
def run_script(script):
    try:
        subprocess.Popen(["bash", script])
    except Exception as e:
        write_log("ERROR", str(e))

# ------------------ LOGGING ------------------
def write_log(level, msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"{level}: {msg}\n")

def read_logs():
    try:
        with open(LOG_FILE, "r") as f:
            lines = f.readlines()[-10:]
            return [{"level": "INFO", "message": l.strip()} for l in lines]
    except:
        return ["No logs"]

# ------------------ GNB ------------------
def start_gnb():
    run_script("start_scripts/start_gnb.sh")
    write_log("INFO", "gNB started")

def stop_gnb():
    run_script("start_scripts/stop_gnb.sh")
    write_log("WARN", "gNB stopped")

# ------------------ UE ------------------
def start_ue():
    run_script("start_scripts/start_ue.sh")
    write_log("INFO", "UE started")

def stop_ue():
    run_script("start_scripts/stop_ue.sh")
    write_log("WARN", "UE stopped")

# ------------------ NODES ------------------
def get_nodes():
    return [
        {"name": "gNB", "type": "antenna", "status": "ONLINE"},
        {"name": "AMF", "type": "server", "status": "ONLINE"},
        {"name": "SMF", "type": "cpu", "status": "ONLINE"},
        {"name": "UPF", "type": "network", "status": "ONLINE"},
        {"name": "UE", "type": "phone", "status": "IDLE"},
    ]

# ------------------ TRUST ------------------
def get_trust_score():
    score = random.randint(75, 95)
    status = "SECURE" if score > 85 else "WARNING"
    return {"score": score, "status": status}

