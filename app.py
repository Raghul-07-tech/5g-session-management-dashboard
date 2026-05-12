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
BASE_DIR = os.getcwd()

LOG_DIR = os.path.join(BASE_DIR, "logs")

if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

LOG_FILE = os.path.join(LOG_DIR, "ue.log")

blocked_imsi = set()

gnb_status = "OFFLINE"
ue_status = "OFFLINE"

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

    global gnb_status

    gnb_status = "ONLINE"

    with open(LOG_FILE, "a") as f:
        f.write("[INFO] gNB Started Successfully\n")

    return jsonify({
        "status": "gNB started"
    })

# ------------------------------------------------
# STOP gNB
# ------------------------------------------------
@app.route('/stop_gnb')
def stop_gnb():

    global gnb_status

    gnb_status = "OFFLINE"

    with open(LOG_FILE, "a") as f:
        f.write("[INFO] gNB Powered Down\n")

    return jsonify({
        "status": "gNB stopped"
    })

# ------------------------------------------------
# START UE
# ------------------------------------------------
@app.route('/start_ue')
def start_ue():

    global ue_status

    ue_status = "ONLINE"

    sample_imsi = "imsi-001010000225008"

    with open(LOG_FILE, "a") as f:

        f.write(f"[INFO] UE Connected : {sample_imsi}\n")
        f.write("[INFO] Authentication Accepted\n")
        f.write("[INFO] PDU Session Established\n")
        f.write("[INFO] Signal Stable (-70 dBm)\n")

    return jsonify({
        "status": "UE started"
    })

# ------------------------------------------------
# STOP UE
# ------------------------------------------------
@app.route('/stop_ue')
def stop_ue():

    global ue_status

    ue_status = "OFFLINE"

    with open(LOG_FILE, "a") as f:
        f.write("[INFO] UE Disconnected\n")

    return jsonify({
        "status": "UE stopped"
    })

# ------------------------------------------------
# NODE STATUS
# ------------------------------------------------
@app.route('/nodes')
def nodes():

    data = [

        {
            "name": "gNB",
            "status": gnb_status
        },

        {
            "name": "AMF",
            "status": "ONLINE"
        },

        {
            "name": "SMF",
            "status": "ONLINE"
        },

        {
            "name": "UPF",
            "status": "ONLINE"
        },

        {
            "name": "UE",
            "status": ue_status
        }
    ]

    return jsonify(data)

# ------------------------------------------------
# UE INFO
# ------------------------------------------------
@app.route('/ue_info')
def ue_info():

    imsi = "Disconnected"
    connected = 0

    try:

        logs = subprocess.getoutput(
            f"tail -n 50 {LOG_FILE}"
        )

        match = re.search(r'imsi-\d+', logs)

        if match:

            imsi = match.group(0)

            if ue_status == "ONLINE":
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

    if gnb_status == "ONLINE":
        score += 30

    if ue_status == "ONLINE":
        score += 30

    score += 30

    if len(blocked_imsi) > 0:
        score -= 10

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

    if not os.path.exists(LOG_FILE):

        sample_logs = [

            "[INFO] CoreControl Pro initialized",
            "[INFO] gNB Ready",
            "[INFO] UE Authentication Accepted",
            "[INFO] PDU Session Established",
            "[INFO] Signal Stable (-70 dBm)"
        ]

        return jsonify(sample_logs)

    output = subprocess.getoutput(
        f"tail -n 20 {LOG_FILE}"
    )

    return jsonify(output.split("\n"))

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

    with open(LOG_FILE, "a") as f:
        f.write(f"[SECURITY] IMSI Blocked : {imsi}\n")

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

    with open(LOG_FILE, "a") as f:
        f.write(f"[SECURITY] IMSI Unblocked : {imsi}\n")

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
# LIVE IMSI
# ------------------------------------------------
@app.route('/live_imsi')
def live_imsi():

    imsi = "001010000" + str(
        random.randint(100000, 999999)
    )

    return jsonify({
        "imsi": imsi
    })

# ------------------------------------------------
# RUN SERVER
# ------------------------------------------------
if __name__ == '__main__':

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
