import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VaultFileType = "document" | "image" | "video" | "archive" | "key" | "config";
export type EncryptionStatus = "encrypted" | "encrypting" | "decrypting" | "pending";

export interface VaultFile {
  id: string;
  name: string;
  type: VaultFileType;
  sizeBytes: number;
  encryptionStatus: EncryptionStatus;
  algorithm: string;
  checksum: string;
  chunks: number;
  createdAt: string;
  modifiedAt: string;
  tags: string[];
}

interface VaultState {
  files: VaultFile[];
  totalEncryptedBytes: number;
  addFile: (name: string, type: VaultFileType, sizeBytes: number) => void;
  removeFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
}

const VaultContext = createContext<VaultState | null>(null);
const VAULT_KEY = "nexus:vault_files";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateChecksum() {
  const chars = "0123456789abcdef";
  return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * 16)]).join("");
}

const DEMO_FILES: VaultFile[] = [
  {
    id: "f1", name: "ssh_keys.tar.gz", type: "archive", sizeBytes: 4096,
    encryptionStatus: "encrypted", algorithm: "AES-256-GCM", checksum: generateChecksum(),
    chunks: 1, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    modifiedAt: new Date(Date.now() - 86400000 * 3).toISOString(), tags: ["keys"],
  },
  {
    id: "f2", name: "wireguard.conf", type: "config", sizeBytes: 1280,
    encryptionStatus: "encrypted", algorithm: "AES-256-GCM", checksum: generateChecksum(),
    chunks: 1, createdAt: new Date(Date.now() - 86400000).toISOString(),
    modifiedAt: new Date(Date.now() - 86400000).toISOString(), tags: ["network"],
  },
  {
    id: "f3", name: "system_backup.tar", type: "archive", sizeBytes: 1024 * 1024 * 230,
    encryptionStatus: "encrypted", algorithm: "AES-256-GCM", checksum: generateChecksum(),
    chunks: 58, createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(), tags: ["backup"],
  },
];

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<VaultFile[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(VAULT_KEY);
        if (raw) {
          setFiles(JSON.parse(raw));
        } else {
          setFiles(DEMO_FILES);
          await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(DEMO_FILES));
        }
      } catch {}
    })();
  }, []);

  const totalEncryptedBytes = files
    .filter((f) => f.encryptionStatus === "encrypted")
    .reduce((acc, f) => acc + f.sizeBytes, 0);

  const addFile = useCallback(
    async (name: string, type: VaultFileType, sizeBytes: number) => {
      const file: VaultFile = {
        id: generateId(),
        name,
        type,
        sizeBytes,
        encryptionStatus: "encrypting",
        algorithm: "AES-256-GCM",
        checksum: generateChecksum(),
        chunks: Math.ceil(sizeBytes / (4 * 1024 * 1024)),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        tags: [],
      };
      const updated = [file, ...files];
      setFiles(updated);
      await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
      setTimeout(async () => {
        setFiles((prev) => {
          const u = prev.map((f) => (f.id === file.id ? { ...f, encryptionStatus: "encrypted" as EncryptionStatus } : f));
          AsyncStorage.setItem(VAULT_KEY, JSON.stringify(u)).catch(() => {});
          return u;
        });
      }, 1800);
    },
    [files]
  );

  const removeFile = useCallback(
    async (id: string) => {
      const updated = files.filter((f) => f.id !== id);
      setFiles(updated);
      await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
    },
    [files]
  );

  const renameFile = useCallback(
    async (id: string, name: string) => {
      const updated = files.map((f) => (f.id === id ? { ...f, name, modifiedAt: new Date().toISOString() } : f));
      setFiles(updated);
      await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(updated));
    },
    [files]
  );

  return (
    <VaultContext.Provider value={{ files, totalEncryptedBytes, addFile, removeFile, renameFile }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
