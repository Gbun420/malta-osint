import WebSocket from 'ws';
import { createHealthServer } from './health.js';
import { AIS_CONFIG } from './config.js';
class AISWorker {
    ws = null;
    healthServer = null;
    state;
    batchBuffer = [];
    batchTimer = null;
    reconnectTimer = null;
    shutdownRequested = false;
    supabase = null;
    constructor() {
        this.state = {
            connected: false,
            reconnecting: false,
            reconnectDelay: AIS_CONFIG.reconnectDelayMs,
            totalReceived: 0,
            totalStored: 0,
            totalErrors: 0,
            lastMessageAt: 0,
            batchesSent: 0,
            uptime: 0,
            startedAt: Date.now(),
        };
    }
    async init() {
        process.title = 'ais-ingestion-worker';
        this.healthServer = createHealthServer(AIS_CONFIG.healthPort);
        console.log(`[AIS Worker] Health endpoint on :${AIS_CONFIG.healthPort}/health`);
        if (AIS_CONFIG.mockMode) {
            console.log('[AIS Worker] Running in MOCK mode');
            this.startMockMode();
            return;
        }
        if (!AIS_CONFIG.apiKey) {
            console.error('[AIS Worker] AIS_API_KEY not set. Set AIS_MOCK_MODE=true for development.');
            process.exit(1);
        }
        await this.connectToAISStream();
        this.startBatchTimer();
        this.setupGracefulShutdown();
        this.startStatusReporter();
    }
    async connectToAISStream() {
        if (this.shutdownRequested)
            return;
        try {
            console.log(`[AIS Worker] Connecting to AISStream...`);
            this.ws = new WebSocket(AIS_CONFIG.wsUrl, {
                headers: {
                    'Authorization': `Bearer ${AIS_CONFIG.apiKey}`,
                },
            });
            this.ws.on('open', () => {
                this.state.connected = true;
                this.state.reconnecting = false;
                this.state.reconnectDelay = AIS_CONFIG.reconnectDelayMs;
                const subMsg = JSON.stringify({
                    type: 'subscribe',
                    bbox: [
                        AIS_CONFIG.worldBbox.minLon,
                        AIS_CONFIG.worldBbox.minLat,
                        AIS_CONFIG.worldBbox.maxLon,
                        AIS_CONFIG.worldBbox.maxLat,
                    ],
                });
                this.ws.send(subMsg);
                console.log('[AIS Worker] Connected and subscribed to world-wide bbox');
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            this.ws.on('error', (err) => {
                this.state.totalErrors++;
                console.error('[AIS Worker] WebSocket error:', err.message);
            });
            this.ws.on('close', (code, reason) => {
                this.state.connected = false;
                console.log(`[AIS Worker] WebSocket closed: ${code} ${reason.toString()}`);
                this.scheduleReconnect();
            });
            this.ws.on('ping', () => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.pong();
                }
            });
        }
        catch (err) {
            this.state.totalErrors++;
            console.error('[AIS Worker] Connection error:', err.message);
            this.scheduleReconnect();
        }
    }
    handleMessage(data) {
        this.state.totalReceived++;
        this.state.lastMessageAt = Date.now();
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'position') {
                const position = {
                    mmsi: msg.mmsi || '',
                    lat: parseFloat(msg.lat) || 0,
                    lon: parseFloat(msg.lon) || 0,
                    sog: parseFloat(msg.sog) || 0,
                    cog: parseFloat(msg.cog) || 0,
                    heading: parseFloat(msg.heading) || 0,
                    status: msg.navStatus || 'under-5-knots',
                    length: parseFloat(msg.length) || 0,
                    type: msg.shipType || 'unknown',
                    imo: msg.imo || undefined,
                    callsign: msg.callsign || undefined,
                    name: msg.name || undefined,
                    lastUpdate: Date.now(),
                };
                if (position.mmsi && position.lat !== 0 && position.lon !== 0) {
                    this.batchBuffer.push(position);
                }
            }
        }
        catch (err) {
            this.state.totalErrors++;
        }
    }
    startBatchTimer() {
        this.batchTimer = setInterval(() => {
            this.flushBatch();
        }, AIS_CONFIG.batchIntervalMs);
    }
    async flushBatch() {
        if (this.batchBuffer.length === 0)
            return;
        const batch = this.batchBuffer.splice(0, AIS_CONFIG.batchSize);
        this.state.batchesSent++;
        try {
            await this.persistToSupabase(batch);
            this.state.totalStored += batch.length;
        }
        catch (err) {
            this.state.totalErrors++;
            console.error('[AIS Worker] Persist error:', err.message);
            this.batchBuffer.unshift(...batch);
        }
    }
    async persistToSupabase(batch) {
        if (!AIS_CONFIG.supabaseUrl || !AIS_CONFIG.supabaseKey) {
            return;
        }
        const { createClient } = await import('@supabase/supabase-js');
        if (!this.supabase) {
            this.supabase = createClient(AIS_CONFIG.supabaseUrl, AIS_CONFIG.supabaseKey);
        }
        const now = new Date().toISOString();
        const rows = batch.map((v) => ({
            mmsi: v.mmsi,
            lat: v.lat,
            lon: v.lon,
            sog: v.sog,
            cog: v.cog,
            heading: v.heading,
            status: v.status,
            length: v.length,
            type: v.type,
            imo: v.imo ?? null,
            callsign: v.callsign ?? null,
            name: v.name ?? null,
            ingested_at: now,
        }));
        const { error } = await this.supabase
            .from(AIS_CONFIG.supabaseTable)
            .upsert(rows, { onConflict: 'mmsi' });
        if (error) {
            throw new Error(`Supabase upsert failed: ${error.message}`);
        }
    }
    startMockMode() {
        console.log('[AIS Worker] Mock mode: generating simulated vessel positions');
        const mockVessels = this.generateMockVessels();
        setInterval(() => {
            if (this.shutdownRequested)
                return;
            for (const vessel of mockVessels) {
                vessel.lat += (Math.random() - 0.5) * 0.0003;
                vessel.lon += (Math.random() - 0.5) * 0.0003;
                vessel.sog = Math.max(0, vessel.sog + (Math.random() - 0.5) * 0.5);
                vessel.cog = (vessel.cog + (Math.random() - 0.5) * 5 + 360) % 360;
                vessel.lastUpdate = Date.now();
                this.batchBuffer.push(vessel);
            }
            this.state.totalReceived += mockVessels.length;
            this.state.lastMessageAt = Date.now();
        }, 2000);
        this.startBatchTimer();
        this.healthServer = createHealthServer(AIS_CONFIG.healthPort);
        console.log(`[AIS Worker] Mock health on :${AIS_CONFIG.healthPort}/health`);
        this.setupGracefulShutdown();
        this.startStatusReporter();
    }
    generateMockVessels() {
        const vessels = [];
        const names = [
            'MALTA STAR', 'VALLETTA', 'GOZO QUEEN', 'MEDITERRANEAN', 'SEA WATCH',
            'HOPPER', 'TUG MASTER', 'FERRY NORD', 'CARGO PLUS', 'TANKER ALPHA',
            'RESEARCH BUOY', 'FISHING 1', 'PASSENGER 7', 'NAVIGATOR', 'PIONEER',
            'DAMAVAND', 'ALABAMA', 'SANTORINI', 'CORFU PRIDE', 'EASY FERRY',
            'GRAND HARBOR', 'BLUE MARLIN', 'REDFIN', 'SILVER PELICAN', 'GOLDEN ARROW',
        ];
        for (let i = 0; i < 30; i++) {
            vessels.push({
                mmsi: `${900000000 + i}`,
                lat: AIS_CONFIG.maltaBbox.minLat + Math.random() * (AIS_CONFIG.maltaBbox.maxLat - AIS_CONFIG.maltaBbox.minLat),
                lon: AIS_CONFIG.maltaBbox.minLon + Math.random() * (AIS_CONFIG.maltaBbox.maxLon - AIS_CONFIG.maltaBbox.minLon),
                sog: 2 + Math.random() * 18,
                cog: Math.random() * 360,
                heading: Math.random() * 360,
                status: ['under-5-knots', 'at-anchor', 'not-under-command', 'restricted-manoeuvrability'][Math.floor(Math.random() * 4)],
                length: 10 + Math.random() * 200,
                type: ['cargo', 'passenger', 'tanker', 'fishing', 'tug'][Math.floor(Math.random() * 5)],
                callsign: `9HA${10000 + i}`,
                name: names[i % names.length],
                lastUpdate: Date.now(),
            });
        }
        return vessels;
    }
    scheduleReconnect() {
        if (this.shutdownRequested)
            return;
        if (this.state.reconnectDelay > AIS_CONFIG.maxReconnectDelayMs) {
            this.state.reconnectDelay = AIS_CONFIG.reconnectDelayMs;
        }
        console.log(`[AIS Worker] Reconnecting in ${this.state.reconnectDelay}ms...`);
        this.reconnectTimer = setTimeout(() => {
            this.connectToAISStream();
            this.state.reconnectDelay = Math.min(this.state.reconnectDelay * 2, AIS_CONFIG.maxReconnectDelayMs);
        }, this.state.reconnectDelay);
    }
    startStatusReporter() {
        setInterval(() => {
            const now = Date.now();
            this.state.uptime = now - this.state.startedAt;
            const minutes = Math.floor(this.state.uptime / 60000);
            const seconds = Math.floor((this.state.uptime % 60000) / 1000);
            console.log(`[AIS Worker] Status: ${this.state.connected ? 'LIVE' : 'DISCONNECTED'} | ` +
                `Received: ${this.state.totalReceived} | Stored: ${this.state.totalStored} | ` +
                `Errors: ${this.state.totalErrors} | Buffer: ${this.batchBuffer.length} | ` +
                `Uptime: ${minutes}m ${seconds}s`);
        }, 30000);
    }
    setupGracefulShutdown() {
        const shutdown = (signal) => {
            console.log(`\n[AIS Worker] Received ${signal}, shutting down gracefully...`);
            this.shutdownRequested = true;
            if (this.reconnectTimer)
                clearTimeout(this.reconnectTimer);
            if (this.batchTimer)
                clearInterval(this.batchTimer);
            this.flushBatch().then(() => {
                console.log(`[AIS Worker] Final stats - Total received: ${this.state.totalReceived}, Stored: ${this.state.totalStored}, Errors: ${this.state.totalErrors}`);
                this.healthServer?.close();
                console.log('[AIS Worker] Shutdown complete');
                process.exit(0);
            });
            setTimeout(() => {
                console.error('[AIS Worker] Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}
const worker = new AISWorker();
worker.init().catch((err) => {
    console.error('[AIS Worker] Failed to start:', err);
    process.exit(1);
});
