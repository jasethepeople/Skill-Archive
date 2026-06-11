import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NodeProtocol = "WebRTC" | "WireGuard" | "SSH";
export type NodeStatus = "connected" | "connecting" | "offline";
export type NodeOS = "linux" | "windows" | "macos" | "ios" | "android";

export interface Node {
  id: string;
  name: string;
  host: string;
  port: number;
  os: NodeOS;
  protocol: NodeProtocol;
  status: NodeStatus;
  latencyMs: number;
  lastSeen: string;
  tags: string[];
}

interface AppState {
  nodes: Node[];
  addNode: (node: Omit<Node, "id" | "status" | "latencyMs" | "lastSeen">) => void;
  removeNode: (id: string) => void;
  updateNodeStatus: (id: string, status: NodeStatus, latencyMs?: number) => void;
  ollamaEndpoint: string;
  setOllamaEndpoint: (url: string) => void;
  ollamaModel: string;
  setOllamaModel: (m: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const NODES_KEY = "nexus:nodes";
const OLLAMA_ENDPOINT_KEY = "nexus:ollama_endpoint";
const OLLAMA_MODEL_KEY = "nexus:ollama_model";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const DEMO_NODES: Node[] = [
  {
    id: "demo1",
    name: "Home Server",
    host: "192.168.1.10",
    port: 22,
    os: "linux",
    protocol: "SSH",
    status: "connected",
    latencyMs: 4,
    lastSeen: new Date().toISOString(),
    tags: ["home", "server"],
  },
  {
    id: "demo2",
    name: "Dev Workstation",
    host: "192.168.1.20",
    port: 51820,
    os: "linux",
    protocol: "WireGuard",
    status: "offline",
    latencyMs: 0,
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    tags: ["dev"],
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [ollamaEndpoint, setOllamaEndpointState] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModelState] = useState("llama3.2");

  useEffect(() => {
    (async () => {
      try {
        const [nodesRaw, endpoint, model] = await Promise.all([
          AsyncStorage.getItem(NODES_KEY),
          AsyncStorage.getItem(OLLAMA_ENDPOINT_KEY),
          AsyncStorage.getItem(OLLAMA_MODEL_KEY),
        ]);
        if (nodesRaw) {
          setNodes(JSON.parse(nodesRaw));
        } else {
          setNodes(DEMO_NODES);
          await AsyncStorage.setItem(NODES_KEY, JSON.stringify(DEMO_NODES));
        }
        if (endpoint) setOllamaEndpointState(endpoint);
        if (model) setOllamaModelState(model);
      } catch {}
    })();
  }, []);

  const addNode = useCallback(
    async (node: Omit<Node, "id" | "status" | "latencyMs" | "lastSeen">) => {
      const newNode: Node = {
        ...node,
        id: generateId(),
        status: "connecting",
        latencyMs: 0,
        lastSeen: new Date().toISOString(),
      };
      const updated = [...nodes, newNode];
      setNodes(updated);
      await AsyncStorage.setItem(NODES_KEY, JSON.stringify(updated));
      setTimeout(() => {
        updateNodeStatus(newNode.id, "connected", Math.floor(Math.random() * 20 + 2));
      }, 1500);
    },
    [nodes]
  );

  const removeNode = useCallback(
    async (id: string) => {
      const updated = nodes.filter((n) => n.id !== id);
      setNodes(updated);
      await AsyncStorage.setItem(NODES_KEY, JSON.stringify(updated));
    },
    [nodes]
  );

  const updateNodeStatus = useCallback(
    async (id: string, status: NodeStatus, latencyMs?: number) => {
      setNodes((prev) => {
        const updated = prev.map((n) =>
          n.id === id
            ? { ...n, status, latencyMs: latencyMs ?? n.latencyMs, lastSeen: new Date().toISOString() }
            : n
        );
        AsyncStorage.setItem(NODES_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  const setOllamaEndpoint = useCallback(async (url: string) => {
    setOllamaEndpointState(url);
    await AsyncStorage.setItem(OLLAMA_ENDPOINT_KEY, url);
  }, []);

  const setOllamaModel = useCallback(async (m: string) => {
    setOllamaModelState(m);
    await AsyncStorage.setItem(OLLAMA_MODEL_KEY, m);
  }, []);

  return (
    <AppContext.Provider
      value={{ nodes, addNode, removeNode, updateNodeStatus, ollamaEndpoint, setOllamaEndpoint, ollamaModel, setOllamaModel }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
