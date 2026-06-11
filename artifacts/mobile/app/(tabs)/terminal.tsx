import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Platform, Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/GlassCard";

interface TerminalLine {
  id: string;
  type: "output" | "command" | "error" | "info";
  text: string;
}

const MONOSPACE = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const MOTD = `Last login: ${new Date().toDateString()} from 192.168.1.1
Linux homeserver 6.5.0-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux

██╗███╗   ██╗███████╗██╗  ██╗
██║████╗  ██║██╔════╝╚██╗██╔╝
██║██╔██╗ ██║█████╗   ╚███╔╝ 
██║██║╚██╗██║██╔══╝   ██╔██╗ 
██║██║ ╚████║███████╗██╔╝ ██╗
╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝

System resources are just a suggestion.`;

const RESPONSES: Record<string, string[]> = {
  ls: ["bin  boot  dev  etc  home  lib  lost+found  media  mnt", "opt  proc  root  run  sbin  srv  sys  tmp  usr  var"],
  "ls -la": [
    "total 84",
    "drwxr-xr-x  18 root root  4096 Jun 11 03:00 .",
    "drwxr-xr-x  18 root root  4096 Jun 11 03:00 ..",
    "drwxr-xr-x   2 root root  4096 Jun  8 12:14 bin",
    "drwxr-xr-x   4 root root  4096 Jun 11 02:58 boot",
    "drwxr-xr-x  20 root root  4380 Jun 11 03:01 dev",
  ],
  pwd: ["/home/operator"],
  whoami: ["operator"],
  "uname -a": ["Linux homeserver 6.5.0-arch1-1 #1 SMP PREEMPT_DYNAMIC Fri Jun 11 00:00:00 UTC 2025 x86_64 GNU/Linux"],
  "df -h": [
    "Filesystem      Size  Used Avail Use% Mounted on",
    "/dev/sda1        50G   18G   30G  38% /",
    "tmpfs           7.8G     0  7.8G   0% /dev/shm",
    "/dev/sdb1       2.0T  680G  1.3T  34% /data",
  ],
  top: [
    "top - 03:00:07 up  4:01,  2 users,  load average: 0.42, 0.38, 0.31",
    "Tasks: 187 total,   1 running, 186 sleeping",
    "%Cpu(s):  4.2 us,  1.1 sy,  0.0 ni, 94.2 id",
    "MiB Mem :  15928.5 total,   9432.1 free,   3819.2 used",
    "PID   USER   PR  NI  VIRT  RES  SHR S %CPU %MEM  TIME+ COMMAND",
    " 1204 root   20   0  712M  48M  18M S  2.3  0.3   0:12.44 node",
    "  892 www    20   0  324M  22M   8M S  0.7  0.1   0:03.18 nginx",
  ],
  "ps aux": [
    "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
    "root         1  0.0  0.0  10528  1632 ?        Ss   02:59   0:00 /sbin/init",
    "root       892  0.0  0.0  10240   876 ?        S    03:00   0:00 nginx: master",
    "operator  1204  0.7  0.3 712440 48392 ?        Ssl  03:00   0:12 node server.js",
  ],
  "ip addr": [
    "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536",
    "    inet 127.0.0.1/8 scope host lo",
    "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500",
    "    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0",
  ],
  ifconfig: [
    "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
    "        inet 192.168.1.10  netmask 255.255.255.0",
    "        ether 00:1a:2b:3c:4d:5e  txqueuelen 1000",
    "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536",
    "        inet 127.0.0.1  netmask 255.0.0.0",
  ],
  free: ["              total        used        free      shared", "Mem:        16311060     3910772     9431028      102440"],
  uptime: [" 03:00:07 up  4:01,  2 users,  load average: 0.42, 0.38, 0.31"],
  date: [new Date().toString()],
  env: ["PATH=/usr/local/bin:/usr/bin:/bin", "HOME=/home/operator", "SHELL=/bin/bash", "TERM=xterm-256color"],
  help: [
    "Available: ls, pwd, whoami, uname, df, top, ps, ip addr, ifconfig, free, uptime, date, env, clear, exit",
    "Commands are mocked. This is a simulated SSH session.",
  ],
};

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getResponse(cmd: string): TerminalLine[] {
  const trimmed = cmd.trim().toLowerCase();
  if (trimmed === "") return [];
  if (trimmed === "clear") return [{ id: generateId(), type: "info", text: "CLEAR" }];
  if (trimmed === "exit" || trimmed === "logout") return [{ id: generateId(), type: "info", text: "Session closed." }];
  if (trimmed.startsWith("cd ")) return [{ id: generateId(), type: "output", text: "" }];
  if (trimmed.startsWith("ping ")) {
    const host = cmd.split(" ")[1] ?? "8.8.8.8";
    return [
      { id: generateId(), type: "output", text: `PING ${host}: 56 bytes of data` },
      { id: generateId(), type: "output", text: `64 bytes from ${host}: icmp_seq=0 ttl=64 time=2.4 ms` },
      { id: generateId(), type: "output", text: `64 bytes from ${host}: icmp_seq=1 ttl=64 time=1.9 ms` },
    ];
  }
  const lines = RESPONSES[trimmed] ?? RESPONSES[cmd.trim()] ?? null;
  if (lines) return lines.map((text) => ({ id: generateId(), type: "output" as const, text }));
  return [{ id: generateId(), type: "error", text: `bash: ${cmd.trim()}: command not found` }];
}

const INITIAL_LINES: TerminalLine[] = MOTD.split("\n").map((text) => ({
  id: generateId(),
  type: "info" as const,
  text,
}));

export default function TerminalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<TerminalLine[]>(INITIAL_LINES);
  const [input, setInput] = useState("");
  const [host] = useState("192.168.1.10");
  const [user] = useState("operator");
  const [showConfig, setShowConfig] = useState(false);
  const listRef = useRef<FlatList>(null);
  const webTop = Platform.OS === "web" ? 67 : insets.top;

  const execCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const cmdLine: TerminalLine = { id: generateId(), type: "command", text: trimmed };
    const responses = getResponse(trimmed);

    if (responses[0]?.text === "CLEAR") {
      setLines([]);
      setInput("");
      return;
    }

    setLines((prev) => [...prev, cmdLine, ...responses]);
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const lineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "command": return colors.primary;
      case "error": return colors.destructive;
      case "info": return `${colors.primary}70`;
      default: return `${colors.foreground}CC`;
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.container, { backgroundColor: "#050507" }]}>
        <View style={[styles.header, { paddingTop: webTop + 10, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.sessionLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {user}@{host}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowConfig(true)}>
            <Feather name="settings" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={lines}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <Text style={[styles.line, { color: lineColor(item.type), fontFamily: MONOSPACE }]}>
              {item.type === "command" ? `$ ${item.text}` : item.text}
            </Text>
          )}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={[styles.inputRow, { borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8) }]}>
          <Text style={[styles.prompt, { color: colors.primary, fontFamily: MONOSPACE }]}>$</Text>
          <TextInput
            style={[styles.inputField, { color: colors.primary, fontFamily: MONOSPACE }]}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => execCommand(input)}
            returnKeyType="send"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholderTextColor={`${colors.primary}40`}
            placeholder="enter command…"
          />
          <TouchableOpacity onPress={() => execCommand(input)} style={styles.sendBtn}>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Modal visible={showConfig} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard style={[styles.modalCard, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>SESSION CONFIG</Text>
              <Text style={[styles.configRow, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Host: {host}</Text>
              <Text style={[styles.configRow, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>User: {user}</Text>
              <Text style={[styles.configRow, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Auth: RSA-4096 key-pair</Text>
              <Text style={[styles.configRow, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Cipher: chacha20-poly1305</Text>
              <TouchableOpacity onPress={() => setShowConfig(false)} style={[styles.closeBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.closeBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Close</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sessionLabel: { fontSize: 13, letterSpacing: 1 },
  line: { fontSize: 12, lineHeight: 20, letterSpacing: 0.2 },
  inputRow: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  prompt: { fontSize: 14, lineHeight: 20 },
  inputField: { flex: 1, fontSize: 13, lineHeight: 20, paddingVertical: 6 },
  sendBtn: { padding: 4 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalCard: { margin: 16, marginBottom: 32, padding: 20 },
  modalTitle: { fontSize: 13, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" },
  configRow: { fontSize: 13, marginBottom: 10 },
  closeBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  closeBtnText: { fontSize: 14 },
});
