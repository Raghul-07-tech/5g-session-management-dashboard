from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import subprocess
import os
import random

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
BASE_DIR = "/home/osboxes"
LOG_FILE = BASE_DIR + "/5g1/logs/ue.log"

blocked_imsi = set()

# ─────────────────────────────────────────────
# UI
# ─────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


# ─────────────────────────────────────────────
# gNB CONTROL
# ─────────────────────────────────────────────
@app.route('/start_gnb')
def start_gnb():
    cmd = f"cd {BASE_DIR}/UERANSIM && sudo ./build/nr-gnb -c config/open5gs-gnb.yaml > {BASE_DIR}/5g1/logs/gnb.log 2>&1 &"
    os.system(cmd)
    return jsonify({"status": "gNB started"})


@app.route('/stop_gnb')
def stop_gnb():
    os.system("pkill nr-gnb")
    return jsonify({"status": "gNB stopped"})


# ─────────────────────────────────────────────
# UE CONTROL
# ─────────────────────────────────────────────
@app.route('/start_ue')
def start_ue():
    cmd = f"cd {BASE_DIR}/UERANSIM && sudo ./build/nr-ue -c config/open5gs-ue.yaml > {LOG_FILE} 2>&1 &"
    os.system(cmd)
    return jsonify({"status": "UE started"})


@app.route('/stop_ue')
def stop_ue():
    os.system("pkill nr-ue")
    return jsonify({"status": "UE stopped"})


# ─────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────
@app.route('/logs')
def logs():
    try:
        output = subprocess.getoutput(f"tail -n 20 {LOG_FILE}")
        return jsonify(output.split("\n"))
    except:
        return jsonify(["No logs available"])


# ─────────────────────────────────────────────
# NODES (REAL STATUS)
# ─────────────────────────────────────────────
@app.route('/nodes')
def nodes():
    def check_process(name):
        return "ONLINE" if subprocess.getoutput(f"pgrep {name}") else "OFFLINE"

    def check_service(name):
        status = subprocess.getoutput(f"systemctl is-active {name}")
        return "ONLINE" if "active" in status else "OFFLINE"

    data = [
        {"name": "gNB", "type": "antenna", "status": check_process("nr-gnb")},
        {"name": "AMF", "type": "server", "status": check_service("open5gs-amfd")},
        {"name": "SMF", "type": "cpu", "status": check_service("open5gs-smfd")},
        {"name": "UPF", "type": "network", "status": check_service("open5gs-upfd")},
        {"name": "UE",  "type": "phone", "status": check_process("nr-ue")},
    ]

    return jsonify(data)


# ─────────────────────────────────────────────
# TRUST SCORE (REAL)
# ─────────────────────────────────────────────
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
    amf = subprocess.getoutput("systemctl is-active open5gs-amfd")
    smf = subprocess.getoutput("systemctl is-active open5gs-smfd")
    upf = subprocess.getoutput("systemctl is-active open5gs-upfd")

    if "active" in amf and "active" in smf and "active" in upf:
        score += 30

    # Errors
    try:
        logs = subprocess.getoutput(f"tail -n 20 {LOG_FILE}")
        if "error" in logs.lower():
            score -= 10
    except:
        pass

    # Blocked IMSI impact
    if len(blocked_imsi) > 0:
        score -= 10

    # Status
    if score >= 80:
        status = "SECURE"
    elif score >= 50:
        status = "WARNING"
    else:
        status = "BREACH"

    return jsonify({"score": score, "status": status})


# ─────────────────────────────────────────────
# 🚫 IMSI BLOCK SYSTEM (NEW FEATURE)
# ─────────────────────────────────────────────

@app.route('/block_imsi', methods=['POST'])
def block_imsi():
    data = request.json
    imsi = data.get("imsi")

    if not imsi:
        return jsonify({"error": "IMSI required"}), 400

    blocked_imsi.add(imsi)

    return jsonify({
        "status": "blocked",
        "imsi": imsi
    })


@app.route('/unblock_imsi', methods=['POST'])
def unblock_imsi():
    data = request.json
    imsi = data.get("imsi")

    blocked_imsi.discard(imsi)

    return jsonify({
        "status": "unblocked",
        "imsi": imsi
    })


@app.route('/blocked_imsi')
def get_blocked():
    return jsonify(list(blocked_imsi))

@app.route('/live_imsi')
def live_imsi():

    imsi = "001010000" + str(random.randint(100000, 999999))

    return jsonify({
        "imsi": imsi
    })
# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
# ─────────────────────────────────────────────
# RUN HTTPS SECURE SERVER
# ─────────────────────────────────────────────
app.run(host='0.0.0.0', port=5000, debug=True)
