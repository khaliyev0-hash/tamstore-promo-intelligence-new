import subprocess
import sys
import os
import time

# Ensure stdout and stderr handle utf-8 safely on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def free_port(port: int):
    """Ensure port is not held by a stale process from a previous run."""
    if sys.platform != "win32":
        return
    try:
        cmd = f'netstat -ano | findstr LISTENING | findstr :{port}'
        output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in output.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and f":{port}" in parts[1]:
                pid = parts[-1]
                if pid and pid.isdigit() and int(pid) != os.getpid() and int(pid) != 0:
                    print(f"  -> Port {port} tutulub (PID: {pid}). Azad edilir...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                    time.sleep(0.5)
    except Exception:
        pass

def kill_proc_tree(proc):
    """Safely terminate a process and all its child processes."""
    if proc is None:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True)
        else:
            proc.terminate()
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass

def main():
    print("=" * 65)
    print("  TAMSTORE PROMO INTELLIGENCE - PLATFORM STARTER")
    print("=" * 65)
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # Check and free ports 8000 and 5173 if needed
    free_port(8000)
    free_port(5173)

    env = os.environ.copy()
    env["PYTHONPATH"] = backend_dir

    # Add portable node if present
    portable_node = os.path.expandvars(r"%LOCALAPPDATA%\Temp\node-portable\node-v20.18.0-win-x64")
    if os.path.exists(portable_node) and portable_node not in env.get("PATH", ""):
        env["PATH"] = portable_node + os.pathsep + env.get("PATH", "")

    print("\n[1/2] Starting FastAPI Backend on http://localhost:8000...")
    app_dir = os.path.join(backend_dir, "app")
    backend_cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", "8000",
        "--reload",
        "--reload-dir", app_dir
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=backend_dir, env=env)

    # Wait for backend health check before launching frontend
    print("Waiting for backend API to be ready...")
    import urllib.request
    backend_ready = False
    for attempt in range(25):
        try:
            with urllib.request.urlopen("http://localhost:8000/api/health", timeout=1) as resp:
                if resp.status == 200:
                    backend_ready = True
                    print(f"[OK] Backend API is ready in {attempt * 0.4:.1f}s!")
                    break
        except Exception:
            time.sleep(0.4)

    if not backend_ready:
        print("[INFO] Backend took longer than expected to start, launching frontend anyway...")

    print("\n[2/2] Starting Vite Frontend on http://localhost:5173...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir, env=env)

    # Automatically open browser window
    try:
        import webbrowser
        time.sleep(1.5)
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    print("\n" + "=" * 65)
    print("  [OK] Platform running successfully!")
    print("  * Frontend URL: http://localhost:5173")
    print("  * Backend API:  http://localhost:8000")
    print("  * API Docs:     http://localhost:8000/docs")
    print("=" * 65)
    print("\nPress Ctrl+C to terminate both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping TAMSTORE PROMO INTELLIGENCE servers...")
        kill_proc_tree(backend_proc)
        kill_proc_tree(frontend_proc)
        print("Servers stopped cleanly.")
        sys.exit(0)

if __name__ == "__main__":
    main()
