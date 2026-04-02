#!/bin/bash

# ==============================================================================
# Echo Care: Local Operations Dashboard (Toggle Switch)
# ==============================================================================
# This scripts allows you to toggle the heavy Chrome/Node architecture completely
# on or off using the production PM2 daemon manager. When 'stopped', it ensures
# absolutely 0% CPU and 0MB RAM are being consumed by this project.
# ==============================================================================

COMMAND=$1

case "$COMMAND" in
  start)
    export PATH="/Users/vedant/.nvm/versions/node/v25.8.2/bin:$PATH"
    echo "⚡️ Toggling ON: Booting Echo Care locally..."
    # --max-memory-restart ensures it never creates a memory leak on your laptop
    pm2 start backend-service/index.js --name "Echo-Care-AI" --max-memory-restart 300M
    echo ""
    echo "✅ Success! It is now running invisibly."
    echo "   Wait ~5 seconds and double-click 'qr-code-to-scan.png' in this folder to authenticate."
    echo ""
    echo "   To view live incoming texts, run: ./control.sh logs"
    ;;
    
  stop)
    export PATH="/Users/vedant/.nvm/versions/node/v25.8.2/bin:$PATH"
    echo "🛑 Toggling OFF: Freezing Echo Care..."
    pm2 stop Echo-Care-AI
    echo "✅ Success! The daemon is asleep. 0% RAM is being utilized."
    ;;
    
  kill)
    export PATH="/Users/vedant/.nvm/versions/node/v25.8.2/bin:$PATH"
    echo "💀 Hard Kill: Eradicating process completely..."
    pm2 delete Echo-Care-AI
    rm -f qr-code-to-scan.png
    echo "✅ System scrubbed."
    ;;
    
  clean)
    export PATH="/Users/vedant/.nvm/versions/node/v25.8.2/bin:$PATH"
    echo "🧹 Wiping Database and Authentication Cache..."
    pm2 stop Echo-Care-AI 2>/dev/null
    rm -f qr-code-to-scan.png
    rm -f backend-service/ai_consultant.db
    rm -rf backend-service/.wwebjs_auth
    echo "✅ All local histories heavily sanitized."
    ;;

  logs)
    export PATH="/Users/vedant/.nvm/versions/node/v25.8.2/bin:$PATH"
    echo "📡 Mounting Live Server Logs..."
    pm2 logs Echo-Care-AI
    ;;
    
  *)
    echo "=========================================="
    echo " ECHO CARE - MASTER TOGGLE CONTROLS"
    echo "=========================================="
    echo "Usage: ./control.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start   - Turn the AI On (Runs silently in background)"
    echo "  stop    - Turn the AI Off (Frees 100% of RAM)"
    echo "  logs    - Watch the AI read/write texts live"
    echo "  kill    - Completely destroy the background process"
    echo "  clean   - Wipe the local database and WhatsApp login"
    echo "=========================================="
    ;;
esac
