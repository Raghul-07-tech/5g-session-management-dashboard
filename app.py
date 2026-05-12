from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import subprocess
import os
import random
import re

app = Flask(__name__)
CORS(app)

# ------------------------------------------------
# CONFIG
# ------------------------------------------------
BASE_DIR = "/home/osboxes"
UERANSIM_DIR = "/home/osboxes/UERANSIM"
LOG_FILE = BASE_DIR + "/5g1/logs/ue.log"

blocked_imsi = set()

# ------------------------------------------------
# UI
# ------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')

# ------------------------------------------------
# START gNB
# ------------------------------------------------
@app.route('/start_gnb')
def start_gnb():

    cmd = f"""
    cd {UERANSIM_DIR} &&
    sudo ./build/nr-gnb -c config/open5gs-gnb.yaml
    > {BASE_DIR}/5g1/logs/gnb.log 2>&1 &
    """

    os.system(cmd)

    return jsonify({
        "status": "gNB started"
    })

# ------------------------------------------------
# STOP gNB
# ------------------------------------------------
@app.route('/stop_gnb')
def stop_gnb():

    os.system("pkill nr-gnb")

    return jsonify({
        "status": "gNB stopped"
    })

# ------------------------------------------------
# START UE
# ------------------------------------------------
@app.route('/start_ue')
def start_ue():

    cmd = f"""
    cd {UERANSIM_DIR} &&
    sudo ./build/nr-ue -c config/open5gs-ue.yaml
    > {LOG_FILE} 2>&1 &
    """

    os.system(cmd)

    return jsonify({
        "status": "UE started"
    })

# ------------------------------------------------
# STOP UE
# ------------------------------------------------
@app.route('/stop_ue')
def stop_ue():

    os.system("pkill nr-ue")

    return jsonify({
        "status": "UE stopped"
    })

# ------------------------------------------------
# REAL NODE STATUS
# ------------------------------------------------
@app.route('/nodes')
def nodes():

    def process_running(name):
        return "ONLINE" if subprocess.getoutput(f"pgrep {name}") else "OFFLINE"

    def service_running(name):
        status = subprocess.getoutput(f"systemctl is-active {name}")
        return "ONLINE" if "active" in status else "OFFLINE"

    data = [
        {
            "name": "gNB",
            "status": process_running("nr-gnb")
        },
        {
            "name": "AMF",
            "status": service_running("open5gs-amfd")
        },
        {
            "name": "SMF",
            "status": service_running("open5gs-smfd")
        },
        {
            "name": "UPF",
            "status": service_running("open5gs-upfd")
        },
        {
            "name": "UE",
            "status": process_running("nr-ue")
        }
    ]

    return jsonify(data)

# ------------------------------------------------
# REAL IMSI + CONNECTED UE COUNT
# ------------------------------------------------
@app.route('/ue_info')
def ue_info():

    imsi = "Disconnected"
    connected = 0

    try:
        logs = subprocess.getoutput(f"tail -n 50 {LOG_FILE}")

        match = re.search(r'imsi-\d+', logs)

        if match:
            imsi = match.group(0)
            connected = 1

    except:
        pass

    return jsonify({
        "imsi": imsi,
        "connected_ues": connected
    })

# ------------------------------------------------
# TRUST SCORE
# ------------------------------------------------
@app.route('/trust')
def trust():

    score = 0

    # gNB
    if subprocess.getoutput("pgrep nr-gnb"):
        score += 30

    # UE
    if subprocess.getoutput("pgrep nr-ue"):
        score += 30

    # Core
    amf = subprocess.getoutput(
        "systemctl is-active open5gs-amfd"
    )

    smf = subprocess.getoutput(
        "systemctl is-active open5gs-smfd"
    )

    upf = subprocess.getoutput(
        "systemctl is-active open5gs-upfd"
    )

    if (
        "active" in amf and
        "active" in smf and
        "active" in upf
    ):
        score += 30

    # Error Detection
    try:

        logs = subprocess.getoutput(
            f"tail -n 20 {LOG_FILE}"
        )

        if "error" in logs.lower():
            score -= 10

    except:
        pass

    # IMSI BLOCK IMPACT
    if len(blocked_imsi) > 0:
        score -= 10

    # STATUS
    if score >= 80:
        status = "SECURE"

    elif score >= 50:
        status = "WARNING"

    else:
        status = "BREACH"

    return jsonify({
        "score": score,
        "status": status
    })

# ------------------------------------------------
# LOGS
# ------------------------------------------------
@app.route('/logs')
def logs():

    try:

        output = subprocess.getoutput(
            f"tail -n 20 {LOG_FILE}"
        )

        return jsonify(output.split("\n"))

    except:
        return jsonify(["No logs available"])

# ------------------------------------------------
# BLOCK IMSI
# ------------------------------------------------
@app.route('/block_imsi', methods=['POST'])
def block_imsi():

    data = request.json

    imsi = data.get("imsi")

    if not imsi:

        return jsonify({
            "error": "IMSI required"
        }), 400

    blocked_imsi.add(imsi)

    return jsonify({
        "status": "blocked",
        "imsi": imsi
    })

# ------------------------------------------------
# UNBLOCK IMSI
# ------------------------------------------------
@app.route('/unblock_imsi', methods=['POST'])
def unblock_imsi():

    data = request.json

    imsi = data.get("imsi")

    blocked_imsi.discard(imsi)

    return jsonify({
        "status": "unblocked",
        "imsi": imsi
    })

# ------------------------------------------------
# GET BLOCKED IMSI
# ------------------------------------------------
@app.route('/blocked_imsi')
def get_blocked():

    return jsonify(list(blocked_imsi))

# ------------------------------------------------
# RUN SERVER
# ------------------------------------------------
if __name__ == '__main__':

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
