"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTRACT_ADDRESSES, PredictionPoolABI } from "../../lib/contracts";
import CATEGORIES from "../../../backend/src/data/categories.json";
import { BACKEND_URL, WS_URL as RUNTIME_WS_URL } from "@/lib/runtime";

// ── ABI helpers ───────────────────────────────────────────────────────────────

type AbiInput = { name: string; type: string };
type AbiEntry = {
  type: string;
  name?: string;
  inputs?: AbiInput[];
  outputs?: AbiInput[];
  stateMutability?: string;
};

const CONTRACT_ABI = (PredictionPoolABI as { abi: AbiEntry[] }).abi as AbiEntry[];

function fnSignature(fn: AbiEntry): string {
  const params = (fn.inputs ?? []).map((i) => i.type).join(",");
  return `${fn.name ?? ""}(${params})`;
}

const MUTABILITY_COLOR: Record<string, string> = {
  view: "text-sky-400",
  pure: "text-sky-400",
  nonpayable: "text-emerald-400",
  payable: "text-amber-400",
};

// ── types ─────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

type Status = "idle" | "loading" | "ok" | "error";

type LogEntry = {
  ts: string;
  dir: "in" | "out" | "sys";
  payload: string;
};

type MatchState = {
  id: string;
  phase: string;
  players: { id: string; address: string; username: string }[];
};

// ── categories reference ──────────────────────────────────────────────────────
// Source of truth: backend/src/data/categories.json — edit there to add/remove.
// Imported directly; no copy needed.

// ── constants ───────────────────────────────────────────────────────────────

const BACKEND = BACKEND_URL;
const WS_URL = RUNTIME_WS_URL;

const MONAD_TESTNET = {
  chainId: "0x279f",        // 10143
  chainName: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadexplorer.com"],
};

// ── tiny helpers ─────────────────────────────────────────────────────────────

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function StatusDot({ s }: { s: Status }) {
  const c =
    s === "ok"
      ? "bg-emerald-400"
      : s === "error"
      ? "bg-red-400"
      : s === "loading"
      ? "bg-yellow-400 animate-pulse"
      : "bg-zinc-600";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} />;
}

function Card({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3`}>
      <h2
        className={`text-xs font-bold uppercase tracking-widest ${
          accent ?? "text-zinc-400"
        }`}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Btn({
  onClick,
  disabled,
  children,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "danger" | "success";
}) {
  const base =
    "px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";
  const v = {
    default: "bg-zinc-700 hover:bg-zinc-600 text-zinc-100",
    danger: "bg-red-900 hover:bg-red-800 text-red-200",
    success: "bg-emerald-900 hover:bg-emerald-800 text-emerald-200",
  }[variant];
  return (
    <button className={`${base} ${v}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Pre({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-zinc-300 max-h-48">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs border-b border-zinc-800 py-1 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-mono">{value}</span>
    </div>
  );
}

// ── Backend REST panel ────────────────────────────────────────────────────────

function BackendPanel() {
  const [health, setHealth] = useState<Status>("idle");
  const [healthData, setHealthData] = useState<{ status: string; timestamp: number } | null>(null);

  const [createStatus, setCreateStatus] = useState<Status>("idle");
  const [createdMatch, setCreatedMatch] = useState<string | null>(null);

  const [listStatus, setListStatus] = useState<Status>("idle");
  const [matches, setMatches] = useState<MatchState[] | null>(null);

  const [lookupId, setLookupId] = useState("");
  const [lookupStatus, setLookupStatus] = useState<Status>("idle");
  const [lookupData, setLookupData] = useState<Record<string, unknown> | string | null>(null);

  const checkHealth = async () => {
    setHealth("loading");
    setHealthData(null);
    try {
      const r = await fetch(`${BACKEND}/health`);
      const d = await r.json() as { status: string; timestamp: number };
      setHealthData(d);
      setHealth(r.ok ? "ok" : "error");
    } catch {
      setHealthData(null);
      setHealth("error");
    }
  };

  const createMatch = async () => {
    setCreateStatus("loading");
    try {
      const r = await fetch(`${BACKEND}/api/matches`, { method: "POST" });
      const d = await r.json() as { matchId: string };
      setCreatedMatch(d.matchId);
      setLookupId(d.matchId);
      setCreateStatus(r.ok ? "ok" : "error");
    } catch (e) {
      setCreatedMatch(String(e));
      setCreateStatus("error");
    }
  };

  const listMatches = async () => {
    setListStatus("loading");
    try {
      const r = await fetch(`${BACKEND}/api/matches`);
      const d = await r.json() as { matches: MatchState[] };
      setMatches(d.matches);
      setListStatus(r.ok ? "ok" : "error");
    } catch (e) {
      setMatches(null);
      setListStatus("error");
    }
  };

  const lookupMatch = async () => {
    if (!lookupId.trim()) return;
    setLookupStatus("loading");
    setLookupData(null);
    try {
      const r = await fetch(`${BACKEND}/api/matches/${lookupId.trim()}`);
      const d = await r.json() as Record<string, unknown>;
      setLookupData(d);
      setLookupStatus(r.ok ? "ok" : "error");
    } catch (e) {
      setLookupData(String(e));
      setLookupStatus("error");
    }
  };

  return (
    <Card title="Backend REST" accent="text-sky-400">
      {/* health */}
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={checkHealth} disabled={health === "loading"}>
          GET /health
        </Btn>
        <StatusDot s={health} />
        {healthData != null ? (
          <span className="text-xs text-zinc-400">
            {healthData.status}
          </span>
        ) : null}
      </div>

      {/* create match */}
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={createMatch} disabled={createStatus === "loading"} variant="success">
          POST /api/matches
        </Btn>
        <StatusDot s={createStatus} />
        {createdMatch && (
          <span className="text-xs text-emerald-300 break-all">{createdMatch}</span>
        )}
      </div>

      {/* list matches */}
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={listMatches} disabled={listStatus === "loading"}>
          GET /api/matches
        </Btn>
        <StatusDot s={listStatus} />
        <span className="text-xs text-zinc-400">
          {matches != null ? `${(matches as MatchState[]).length} active` : ""}
        </span>
      </div>
      {matches && matches.length > 0 && (
        <Pre value={matches.map((m) => ({ id: m.id, phase: m.phase, players: m.players?.length ?? 0 }))} />
      )}

      {/* get by id */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
          placeholder="match ID"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
        />
        <Btn onClick={lookupMatch} disabled={lookupStatus === "loading" || !lookupId.trim()}>
          GET /api/matches/:id
        </Btn>
        <StatusDot s={lookupStatus} />
      </div>
      {lookupData != null ? <Pre value={lookupData} /> : null}
    </Card>
  );
}

// ── WebSocket panel ───────────────────────────────────────────────────────────

function WebSocketPanel() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerAddress, setPlayerAddress] = useState("");
  const [username, setUsername] = useState("dev-player");
  const [answer, setAnswer] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((dir: LogEntry["dir"], payload: string) => {
    setLog((prev) => [...prev.slice(-99), { ts: ts(), dir, payload }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const connect = () => {
    if (wsRef.current) wsRef.current.close();
    addLog("sys", `Connecting to ${WS_URL}…`);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addLog("sys", "Connected");
    };
    ws.onmessage = (e) => {
      addLog("in", typeof e.data === "string" ? e.data : JSON.stringify(e.data));
    };
    ws.onerror = () => addLog("sys", "Error");
    ws.onclose = () => {
      setConnected(false);
      addLog("sys", "Disconnected");
    };
  };

  const disconnect = () => wsRef.current?.close();

  const send = (payload: unknown) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const str = JSON.stringify(payload);
    wsRef.current.send(str);
    addLog("out", str);
  };

  const joinMatch = () => {
    if (!matchId || !playerId) return;
    send({
      event: "JOIN_MATCH",
      payload: {
        matchId,
        player: { id: playerId, address: playerAddress, username },
      },
    });
  };

  const submitPrediction = () => {
    if (!matchId || !playerId) return;
    send({
      event: "SUBMIT_PREDICTION",
      payload: {
        matchId,
        prediction: {
          playerId,
          predictedWinner: playerId,
          predictedFirstElimination: playerId,
        },
      },
    });
  };

  const submitAnswer = () => {
    if (!matchId || !playerId || !answer) return;
    send({
      event: "SUBMIT_ANSWER",
      payload: { matchId, playerId, answer },
    });
    setAnswer("");
  };

  const dirColor: Record<LogEntry["dir"], string> = {
    in: "text-emerald-400",
    out: "text-sky-400",
    sys: "text-yellow-400",
  };
  const dirLabel: Record<LogEntry["dir"], string> = {
    in: "←",
    out: "→",
    sys: "·",
  };

  return (
    <Card title="WebSocket" accent="text-violet-400">
      {/* connection */}
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={connect} disabled={connected}>
          Connect
        </Btn>
        <Btn onClick={disconnect} disabled={!connected} variant="danger">
          Disconnect
        </Btn>
        <StatusDot s={connected ? "ok" : "idle"} />
        <span className="text-xs text-zinc-500">{WS_URL}</span>
      </div>

      {/* params */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { ph: "match ID", val: matchId, set: setMatchId },
          { ph: "player ID (address or uuid)", val: playerId, set: setPlayerId },
          { ph: "wallet address", val: playerAddress, set: setPlayerAddress },
          { ph: "username", val: username, set: setUsername },
        ].map((f) => (
          <input
            key={f.ph}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            placeholder={f.ph}
            value={f.val}
            onChange={(e) => f.set(e.target.value)}
          />
        ))}
      </div>

      {/* actions */}
      <div className="flex gap-2 flex-wrap">
        <Btn onClick={joinMatch} disabled={!connected || !matchId || !playerId} variant="success">
          JOIN_MATCH
        </Btn>
        <Btn onClick={submitPrediction} disabled={!connected || !matchId || !playerId}>
          SUBMIT_PREDICTION (self-predict)
        </Btn>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
          placeholder="answer (during your turn)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
        />
        <Btn onClick={submitAnswer} disabled={!connected || !answer} variant="success">
          SUBMIT_ANSWER
        </Btn>
      </div>

      {/* log */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 h-48 overflow-y-auto text-xs font-mono">
        {log.length === 0 && (
          <span className="text-zinc-600">No messages yet.</span>
        )}
        {log.map((l, i) => (
          <div key={i} className="leading-5">
            <span className="text-zinc-600">[{l.ts}]</span>{" "}
            <span className={dirColor[l.dir]}>{dirLabel[l.dir]}</span>{" "}
            <span className="text-zinc-300 break-all">{l.payload}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </Card>
  );
}

// ── Wallet + Monad Testnet panel ──────────────────────────────────────────────

function WalletPanel({ onAddress }: { onAddress: (a: string) => void }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [netStatus, setNetStatus] = useState<Status>("idle");
  const [signStatus, setSignStatus] = useState<Status>("idle");
  const [signResult, setSignResult] = useState<string | null>(null);
  const [hasEthereum, setHasEthereum] = useState(false);

  const isMonad = chainId === MONAD_TESTNET.chainId;

  const connect = async () => {
    if (!window.ethereum) {
      alert("No wallet detected. Install MetaMask.");
      return;
    }
    setStatus("loading");
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = accounts[0];
      setAddress(addr);
      onAddress(addr);

      const cid = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(cid);

      const bal = (await window.ethereum.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      })) as string;
      const balEth = (parseInt(bal, 16) / 1e18).toFixed(4);
      setBalance(`${balEth} MON`);

      setStatus("ok");
    } catch (e) {
      setStatus("error");
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    setNetStatus("loading");
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [MONAD_TESTNET],
      });
      const cid = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
      setNetStatus("ok");
    } catch (e) {
      setNetStatus("error");
    }
  };

  const signMessage = async () => {
    if (!window.ethereum || !address) return;
    setSignStatus("loading");
    setSignResult(null);
    try {
      const msg = `Category Bomb Arena — connection test @ ${ts()}`;
      const sig = (await window.ethereum.request({
        method: "personal_sign",
        params: [msg, address],
      })) as string;
      setSignResult(sig.slice(0, 20) + "…");
      setSignStatus("ok");
    } catch {
      setSignStatus("error");
    }
  };

  // Sync chain changes + detect wallet on client
  useEffect(() => {
    setHasEthereum(typeof window !== "undefined" && !!window.ethereum);
    if (!window.ethereum) return;
    const handler = (cid: unknown) => setChainId(cid as string);
    window.ethereum.on("chainChanged", handler);
    return () => window.ethereum!.removeListener("chainChanged", handler);
  }, []);

  return (
    <Card title="Wallet + Monad Testnet" accent="text-amber-400">
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={connect} disabled={status === "loading"}>
          {address ? "Re-connect" : "Connect Wallet"}
        </Btn>
        <StatusDot s={status} />
      </div>

      {address && (
        <div className="rounded-lg border border-zinc-800 p-2">
          <Row label="Address" value={`${address.slice(0, 6)}…${address.slice(-4)}`} />
          <Row label="Full address" value={address} />
          <Row label="Chain ID" value={chainId ?? "—"} />
          <Row label="Balance" value={balance ?? "—"} />
          <Row
            label="Network"
            value={isMonad ? "Monad Testnet ✓" : `Wrong network (need ${MONAD_TESTNET.chainId})`}
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Btn
          onClick={switchNetwork}
          disabled={!hasEthereum || netStatus === "loading"}
          variant={isMonad ? "success" : "default"}
        >
          {isMonad ? "On Monad Testnet ✓" : "Switch to Monad Testnet"}
        </Btn>
        <StatusDot s={netStatus} />
      </div>

      {address && (
        <div className="flex items-center gap-2 flex-wrap">
          <Btn onClick={signMessage} disabled={signStatus === "loading"}>
            Sign test message
          </Btn>
          <StatusDot s={signStatus} />
          {signResult && <span className="text-xs text-zinc-400">{signResult}</span>}
        </div>
      )}

      <p className="text-xs text-zinc-600 border-t border-zinc-800 pt-2">
        For contract calls: open Remix IDE → Deploy &amp; Run → Environment: Injected Provider —
        MetaMask. Your wallet above is the signer Remix will use.
      </p>
    </Card>
  );
}

// ── Contract Probe panel ──────────────────────────────────────────────────────

function ContractPanel({ walletAddress }: { walletAddress: string }) {
  const [contractAddr, setContractAddr] = useState<string>(
    CONTRACT_ADDRESSES.PredictionPool !== "0x0000000000000000000000000000000000000000"
      ? CONTRACT_ADDRESSES.PredictionPool
      : ""
  );
  const [deployStatus, setDeployStatus] = useState<Status>("idle");
  const [deployResult, setDeployResult] = useState<string | null>(null);

  const [calldata, setCalldata] = useState("");
  const [ethValue, setEthValue] = useState("");
  const [callStatus, setCallStatus] = useState<Status>("idle");
  const [callResult, setCallResult] = useState<string | null>(null);

  const [sendStatus, setSendStatus] = useState<Status>("idle");
  const [sendTx, setSendTx] = useState<string | null>(null);

  const [copiedSig, setCopiedSig] = useState<string | null>(null);

  const abiFunctions = CONTRACT_ABI.filter((e) => e.type === "function");
  const hasAbi = abiFunctions.length > 0;

  const probeContract = async () => {
    if (!window.ethereum || !contractAddr.match(/^0x[0-9a-fA-F]{40}$/)) {
      alert("Enter a valid 0x address.");
      return;
    }
    setDeployStatus("loading");
    setDeployResult(null);
    try {
      const code = (await window.ethereum.request({
        method: "eth_getCode",
        params: [contractAddr, "latest"],
      })) as string;
      if (code === "0x" || code === "0x0") {
        setDeployResult("No bytecode — not deployed on this network.");
        setDeployStatus("error");
      } else {
        setDeployResult(`Deployed ✓  (${Math.floor((code.length - 2) / 2)} bytes)`);
        setDeployStatus("ok");
      }
    } catch (e) {
      setDeployResult(String(e));
      setDeployStatus("error");
    }
  };

  const ethCall = async () => {
    if (!window.ethereum || !contractAddr || !calldata) return;
    setCallStatus("loading");
    setCallResult(null);
    try {
      const result = (await window.ethereum.request({
        method: "eth_call",
        params: [{ to: contractAddr, data: calldata }, "latest"],
      })) as string;
      setCallResult(result);
      setCallStatus("ok");
    } catch (e) {
      setCallResult(String(e));
      setCallStatus("error");
    }
  };

  const sendTxFn = async () => {
    if (!window.ethereum || !contractAddr || !calldata || !walletAddress) return;
    setSendStatus("loading");
    setSendTx(null);
    try {
      const txParams: Record<string, string> = {
        from: walletAddress,
        to: contractAddr,
        data: calldata,
      };
      if (ethValue.trim()) txParams.value = "0x" + BigInt(ethValue.trim()).toString(16);
      const tx = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [txParams],
      })) as string;
      setSendTx(tx);
      setSendStatus("ok");
    } catch (e) {
      setSendTx(String(e));
      setSendStatus("error");
    }
  };

  return (
    <Card title="Contract Probe — PredictionPool" accent="text-rose-400">
      <p className="text-xs text-zinc-500">
        Address and ABI loaded from{" "}
        <code className="text-zinc-300">lib/contracts.ts</code> ·{" "}
        <code className="text-zinc-300">lib/abi/PredictionPool.json</code>. Use{" "}
        <a href="https://abi.hashex.org" target="_blank" rel="noreferrer" className="underline text-rose-400">
          abi.hashex.org
        </a>{" "}
        to encode calldata from the ABI JSON.
      </p>

      {/* address */}
      <div className="flex gap-2 flex-wrap">
        <input
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
          placeholder="0x contract address"
          value={contractAddr}
          onChange={(e) => setContractAddr(e.target.value)}
        />
        <Btn onClick={probeContract} disabled={deployStatus === "loading"}>
          Check deployed
        </Btn>
        <StatusDot s={deployStatus} />
      </div>
      {deployResult && (
        <p className={`text-xs font-mono ${
          deployStatus === "ok" ? "text-emerald-400" : "text-red-400"
        }`}>
          {deployResult}
        </p>
      )}

      {/* ABI function browser */}
      {hasAbi ? (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <p className="text-xs text-zinc-500 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
            ABI functions — click signature to copy
          </p>
          <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
            {abiFunctions.map((fn) => {
              const sig = fnSignature(fn);
              const mut = fn.stateMutability ?? "nonpayable";
              return (
                <button
                  key={sig}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 transition text-xs flex items-start gap-2 group"
                  onClick={() => {
                    navigator.clipboard.writeText(sig).catch(() => {});
                    setCopiedSig(sig);
                    setTimeout(() => setCopiedSig(null), 1500);
                  }}
                >
                  <span className={`shrink-0 font-semibold w-20 ${MUTABILITY_COLOR[mut] ?? "text-zinc-400"}`}>
                    {mut}
                  </span>
                  <span className="text-zinc-200 font-mono break-all">{sig}</span>
                  <span className="ml-auto shrink-0 text-zinc-600 group-hover:text-zinc-400">
                    {copiedSig === sig ? "copied" : "copy"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-center">
          <p className="text-xs text-zinc-500">
            No ABI loaded yet — paste your ABI array into{" "}
            <code className="text-zinc-300">lib/abi/PredictionPool.json</code>
          </p>
        </div>
      )}

      {/* calldata + value */}
      <div className="grid grid-cols-1 gap-2">
        <textarea
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 resize-none h-16 font-mono"
          placeholder="Raw calldata hex — e.g. 0x12345678..."
          value={calldata}
          onChange={(e) => setCalldata(e.target.value)}
        />
        <input
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
          placeholder="ETH value in wei (only for payable calls, leave blank otherwise)"
          value={ethValue}
          onChange={(e) => setEthValue(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={ethCall} disabled={callStatus === "loading" || !contractAddr || !calldata}>
            eth_call (read)
          </Btn>
          <StatusDot s={callStatus} />
          <Btn
            onClick={sendTxFn}
            disabled={sendStatus === "loading" || !contractAddr || !calldata || !walletAddress}
            variant="danger"
          >
            eth_sendTransaction (write)
          </Btn>
          <StatusDot s={sendStatus} />
        </div>
      </div>

      {callResult != null ? <Pre value={callResult} /> : null}
      {sendTx && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Tx hash:</p>
          <a
            href={`${MONAD_TESTNET.blockExplorerUrls[0]}/tx/${sendTx}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-rose-400 underline break-all"
          >
            {sendTx}
          </a>
        </div>
      )}
    </Card>
  );
}

// ── Summary header ────────────────────────────────────────────────────────────

function ServicesBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {[
        { label: "Frontend", value: "localhost:3000", note: "this page", color: "text-sky-400" },
        { label: "Backend REST", value: BACKEND, note: "Bun + Hono", color: "text-emerald-400" },
        { label: "WebSocket", value: WS_URL, note: "game engine", color: "text-violet-400" },
        { label: "Monad Testnet", value: "chain 10143", note: "0x279f", color: "text-amber-400" },
      ].map((s) => (
        <div key={s.label} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
          <p className={`text-xs font-bold ${s.color}`}>{s.label}</p>
          <p className="text-xs text-zinc-200 font-mono">{s.value}</p>
          <p className="text-xs text-zinc-600">{s.note}</p>
        </div>
      ))}
    </div>
  );
}

// ── Game Simulator ────────────────────────────────────────────────────────────
// Runs 2 WS connections needed because minPlayers = 2 to start prediction phase.

type LiveMatch = {
  id: string;
  phase: string;
  currentPlayerId: string;
  currentCategory: { id: string; name: string };
  players: { id: string; username: string; status: string }[];
  roundNumber: number;
  constraints: { bannedLetters: string[] };
  usedAnswers: string[];
  eliminationOrder: string[];
};

function GameSimPanel({ walletAddress }: { walletAddress: string }) {
  const ws1 = useRef<WebSocket | null>(null);
  const ws2 = useRef<WebSocket | null>(null);
  const [matchId, setMatchId] = useState("");
  const [createStatus, setCreateStatus] = useState<Status>("idle");
  const [p1Connected, setP1Connected] = useState(false);
  const [p2Connected, setP2Connected] = useState(false);
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [answer, setAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState<string | null>(null);
  const [p1PredWinner, setP1PredWinner] = useState("");
  const [p1PredElim, setP1PredElim] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const p1Id = walletAddress || "player-1";
  const p2Id = "bot-player-2";

  const addLog = useCallback((dir: LogEntry["dir"], msg: string) => {
    setLog((prev) => [...prev.slice(-149), { ts: ts(), dir, payload: msg }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const createMatch = async () => {
    setCreateStatus("loading");
    try {
      const r = await fetch(`${BACKEND}/api/matches`, { method: "POST" });
      const d = await r.json() as { matchId: string };
      setMatchId(d.matchId);
      setCreateStatus("ok");
      addLog("sys", `Match created: ${d.matchId}`);
    } catch (e) {
      setCreateStatus("error");
      addLog("sys", `Create failed: ${String(e)}`);
    }
  };

  const openWs = (
    ref: React.MutableRefObject<WebSocket | null>,
    playerId: string,
    username: string,
    setConnected: (v: boolean) => void
  ) => {
    if (ref.current) ref.current.close();
    const ws = new WebSocket(WS_URL);
    ref.current = ws;
    ws.onopen = () => {
      setConnected(true);
      addLog("sys", `${username} WS open`);
      ws.send(JSON.stringify({
        event: "JOIN_MATCH",
        payload: {
          matchId,
          player: { id: playerId, address: playerId, username },
        },
      }));
      addLog("out", `${username} → JOIN_MATCH`);
    };
    ws.onmessage = (e) => {
      const raw = typeof e.data === "string" ? e.data : JSON.stringify(e.data);
      try {
        const msg = JSON.parse(raw) as { event: string; payload: { match?: LiveMatch; [k: string]: unknown } };
        if (msg.event === "MATCH_UPDATED" && msg.payload.match) {
          setLiveMatch(msg.payload.match as LiveMatch);
        }
        addLog("in", `${username} ← ${msg.event}`);
        if (msg.event === "ANSWER_SUBMITTED") {
          const p = msg.payload as { playerId?: string; answer?: string; isValid?: boolean };
          setAnswerResult(`${p.answer} — ${p.isValid ? "valid" : "invalid"}`);
          setTimeout(() => setAnswerResult(null), 3000);
        }
      } catch {
        addLog("in", raw.slice(0, 120));
      }
    };
    ws.onerror = () => addLog("sys", `${username} WS error`);
    ws.onclose = () => { setConnected(false); addLog("sys", `${username} WS closed`); };
  };

  const bothJoin = () => {
    if (!matchId) return;
    openWs(ws1, p1Id, walletAddress ? `${walletAddress.slice(0, 6)}` : "Player1", setP1Connected);
    openWs(ws2, p2Id, "Bot2", setP2Connected);
  };

  const submitAnswer = () => {
    if (!answer.trim() || !ws1.current || ws1.current.readyState !== WebSocket.OPEN) return;
    ws1.current.send(JSON.stringify({
      event: "SUBMIT_ANSWER",
      payload: { matchId, playerId: p1Id, answer: answer.trim() },
    }));
    addLog("out", `Player1 → SUBMIT_ANSWER: ${answer.trim()}`);
    setAnswer("");
  };

  const submitBotAnswer = () => {
    if (!ws2.current || ws2.current.readyState !== WebSocket.OPEN) return;
    const catExamples = CATEGORIES.find((c) => c.id === liveMatch?.currentCategory?.id)?.examples ?? ["test"];
    const used = new Set((liveMatch?.usedAnswers ?? []).map((a) => a.toLowerCase()));
    const pick = catExamples.find((ex) => !used.has(ex.toLowerCase())) ?? `auto-${Date.now()}`;
    ws2.current.send(JSON.stringify({
      event: "SUBMIT_ANSWER",
      payload: { matchId, playerId: p2Id, answer: pick },
    }));
    addLog("out", `Bot2 → SUBMIT_ANSWER: ${pick}`);
  };

  const submitP1Prediction = () => {
    if (!ws1.current || ws1.current.readyState !== WebSocket.OPEN) return;
    ws1.current.send(JSON.stringify({
      event: "SUBMIT_PREDICTION",
      payload: {
        matchId,
        prediction: {
          playerId: p1Id,
          predictedWinner: p1PredWinner || p1Id,
          predictedFirstElimination: p1PredElim || p2Id,
        },
      },
    }));
    addLog("out", `Player1 → SUBMIT_PREDICTION`);
  };

  const isP1Turn = liveMatch?.currentPlayerId === p1Id;
  const isP2Turn = liveMatch?.currentPlayerId === p2Id;
  const phase = liveMatch?.phase ?? "—";
  const phaseColor: Record<string, string> = {
    PREDICTION: "text-amber-400",
    NORMAL: "text-emerald-400",
    ACCELERATION: "text-orange-400",
    BLITZ: "text-red-400",
    ENDED: "text-zinc-500",
  };

  const dirColor: Record<LogEntry["dir"], string> = {
    in: "text-emerald-400",
    out: "text-sky-400",
    sys: "text-yellow-400",
  };
  const dirLabel: Record<LogEntry["dir"], string> = { in: "←", out: "→", sys: "·" };

  return (
    <Card title="Game Simulator — 2 Player Flow" accent="text-orange-400">
      <p className="text-xs text-zinc-500">
        Runs two WS connections. <strong className="text-zinc-300">minPlayers = 2</strong> — both must
        join before prediction phase starts. Player 1 = your wallet. Bot2 is auto-managed.
      </p>

      {/* step 1: create */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-600 w-16">Step 1</span>
        <Btn onClick={createMatch} disabled={createStatus === "loading"} variant="success">
          POST /api/matches
        </Btn>
        <StatusDot s={createStatus} />
        {matchId && <span className="text-xs text-emerald-300 font-mono break-all">{matchId}</span>}
      </div>

      {/* step 2: join */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-600 w-16">Step 2</span>
        <Btn onClick={bothJoin} disabled={!matchId}>
          Both Join Match
        </Btn>
        <span className="text-xs">
          <span className={p1Connected ? "text-emerald-400" : "text-zinc-600"}>P1 {p1Connected ? "●" : "○"}</span>
          {" "}
          <span className={p2Connected ? "text-emerald-400" : "text-zinc-600"}>Bot2 {p2Connected ? "●" : "○"}</span>
        </span>
      </div>

      {/* live state */}
      {liveMatch && (
        <div className="rounded-lg border border-zinc-800 p-2 text-xs">
          <div className="flex gap-4 flex-wrap mb-1">
            <span>Phase: <strong className={phaseColor[phase] ?? "text-zinc-300"}>{phase}</strong></span>
            <span>Round: <strong className="text-zinc-300">{liveMatch.roundNumber}</strong></span>
            <span>Category: <strong className="text-zinc-300">{liveMatch.currentCategory?.name ?? "—"}</strong></span>
            {liveMatch.constraints.bannedLetters.length > 0 && (
              <span>Banned: <strong className="text-red-400">{liveMatch.constraints.bannedLetters.join(", ").toUpperCase()}</strong></span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {liveMatch.players.map((p) => (
              <span
                key={p.id}
                className={`px-2 py-0.5 rounded ${
                  liveMatch.currentPlayerId === p.id
                    ? "bg-amber-900 text-amber-200"
                    : p.status === "ELIMINATED"
                    ? "bg-zinc-800 text-zinc-600 line-through"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {p.username} {liveMatch.currentPlayerId === p.id ? "← TURN" : ""}
              </span>
            ))}
          </div>
          {liveMatch.usedAnswers.length > 0 && (
            <p className="text-zinc-600 mt-1">Used: {liveMatch.usedAnswers.join(", ")}</p>
          )}
        </div>
      )}

      {/* prediction phase */}
      {phase === "PREDICTION" && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 flex flex-col gap-2">
          <p className="text-xs text-amber-400 font-semibold">Prediction Phase — 30s window</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              placeholder={`predicted winner (default: ${p1Id.slice(0, 10)})`}
              value={p1PredWinner}
              onChange={(e) => setP1PredWinner(e.target.value)}
            />
            <input
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              placeholder={`predicted 1st elim (default: ${p2Id})`}
              value={p1PredElim}
              onChange={(e) => setP1PredElim(e.target.value)}
            />
          </div>
          <Btn onClick={submitP1Prediction} disabled={!p1Connected}>
            Player1 → SUBMIT_PREDICTION
          </Btn>
        </div>
      )}

      {/* answer phase */}
      {(phase === "NORMAL" || phase === "ACCELERATION" || phase === "BLITZ") && (
        <div className="flex flex-col gap-2">
          {isP2Turn && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">It&apos;s Bot2&apos;s turn</span>
              <Btn onClick={submitBotAnswer} variant="default">Auto-answer Bot2</Btn>
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={`flex-1 bg-zinc-800 border rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none ${
                isP1Turn ? "border-emerald-600 focus:border-emerald-400" : "border-zinc-700"
              }`}
              placeholder={isP1Turn ? `Your turn — category: ${liveMatch?.currentCategory?.name}` : "Waiting for your turn…"}
              value={answer}
              disabled={!isP1Turn}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            />
            <Btn onClick={submitAnswer} disabled={!isP1Turn || !answer} variant="success">
              Answer
            </Btn>
          </div>
          {answerResult && (
            <p className={`text-xs font-mono ${
              answerResult.includes("valid") && !answerResult.includes("invalid") ? "text-emerald-400" : "text-red-400"
            }`}>{answerResult}</p>
          )}
        </div>
      )}

      {phase === "ENDED" && liveMatch && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs">
          <p className="text-zinc-300 font-semibold mb-1">Game Over</p>
          <p className="text-zinc-500">Elimination order: {liveMatch.eliminationOrder.join(" → ") || "—"}</p>
        </div>
      )}

      {/* log */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 h-36 overflow-y-auto text-xs font-mono">
        {log.length === 0 && <span className="text-zinc-600">Events appear here.</span>}
        {log.map((l, i) => (
          <div key={i} className="leading-5">
            <span className="text-zinc-600">[{l.ts}]</span>{" "}
            <span className={dirColor[l.dir]}>{dirLabel[l.dir]}</span>{" "}
            <span className="text-zinc-300">{l.payload}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </Card>
  );
}

// ── Categories Reference ──────────────────────────────────────────────────────

function CategoriesPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Card title="Categories Reference" accent="text-teal-400">
      <p className="text-xs text-zinc-500">
        Source of truth:{" "}
        <code className="text-zinc-300">backend/src/data/categories.json</code> —
        add new entries there in the same format. Currently{" "}
        <strong className="text-zinc-300">{CATEGORIES.length}</strong> categories.
        Validator accepts any answer ≥ 2 chars that passes banned-letter + duplicate checks.
      </p>
      <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden max-h-80 overflow-y-auto">
        {CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <button
              className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition flex items-center justify-between"
              onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
            >
              <div>
                <span className="text-xs text-zinc-200 font-semibold">{cat.name}</span>
                <span className="text-xs text-zinc-600 ml-2 font-mono">{cat.id}</span>
              </div>
              <span className="text-xs text-zinc-600">{expanded === cat.id ? "▲" : "▼"}</span>
            </button>
            {expanded === cat.id && (
              <div className="px-3 pb-3 bg-zinc-950">
                <p className="text-xs text-zinc-500 mb-1">{cat.description}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.examples.map((ex) => (
                    <span key={ex} className="text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-0.5">{ex}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-600 border-t border-zinc-800 pt-2">
        Add a category: append to the JSON array with <code className="text-zinc-400">id</code>,{" "}
        <code className="text-zinc-400">name</code>, <code className="text-zinc-400">description</code>,{" "}
        <code className="text-zinc-400">examples</code> fields. Restart the backend after editing.
      </p>
    </Card>
  );
}

// ── Summary header ────────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="border-b border-zinc-800 pb-4 mb-4">
      <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
        Blitz Quiz Arena{" "}
        <span className="text-zinc-500 font-normal text-sm">— dev dashboard</span>
      </h1>
      <p className="text-xs text-zinc-600 mt-0.5">
        backend REST · WebSocket · game simulator · wallet · contracts · categories
      </p>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DevDashboard() {
  const [walletAddress, setWalletAddress] = useState("");

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Header />
      <ServicesBar />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BackendPanel />
        <WebSocketPanel />
        <GameSimPanel walletAddress={walletAddress} />
        <CategoriesPanel />
        <WalletPanel onAddress={setWalletAddress} />
        <ContractPanel walletAddress={walletAddress} />
      </div>
    </main>
  );
}
