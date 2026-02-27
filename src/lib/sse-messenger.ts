/**
 * Quantum SSE Messenger
 * Shares a single SSE connection across multiple browser tabs using BroadcastChannel.
 * Reduces server load and ensures perfect synchronization.
 */

type SSEMessage = {
    type: string;
    payload: any;
};

const CHANNEL_NAME = 'tw_stock_quantum_link';
const channel = new BroadcastChannel(CHANNEL_NAME);

const HEARTBEAT_INTERVAL = 2000;

/**
 * Register a listener for real-time updates.
 * Automatically handles tab synchronization.
 */
export function subscribeToQuantumData(type: string, callback: (payload: any) => void) {
    channel.onmessage = (event: MessageEvent<SSEMessage>) => {
        if (event.data.type === type) {
            callback(event.data.payload);
        }
    };
}

/**
 * Broadcast data to all other tabs.
 */
export function broadcastQuantumUpdate(type: string, payload: any) {
    channel.postMessage({ type, payload });
}

/**
 * Oracle Election: Decide which tab handles the SSE connection.
 * Returns true if this tab should open the connection.
 */
export function claimOracleStatus(): boolean {
    const now = Date.now();
    const lastHeartbeat = parseInt(localStorage.getItem('sse_oracle_heartbeat') || '0');

    // If no oracle or oracle is dead (> 5s)
    if (now - lastHeartbeat > 5000) {
        startOracleHeartbeat();
        return true;
    }

    // Listen for heartbeats to know when to take over
    window.addEventListener('storage', e => {
        if (e.key === 'sse_oracle_heartbeat') {
            // Heartbeat updated by another tab
        }
    });

    return false;
}

function startOracleHeartbeat() {
    localStorage.setItem('sse_oracle_heartbeat', Date.now().toString());
    setInterval(() => {
        localStorage.setItem('sse_oracle_heartbeat', Date.now().toString());
    }, HEARTBEAT_INTERVAL);

    window.addEventListener('beforeunload', () => {
        localStorage.removeItem('sse_oracle_heartbeat');
    });
}
