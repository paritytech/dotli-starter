import {
  injectSpektrExtension,
  createAccountsProvider,
  metaProvider,
  hostApi,
  hostLocalStorage,
  createPapiProvider,
} from "@novasamatech/product-sdk";

import { Binary, createClient } from "polkadot-api";
import { toHex } from "polkadot-api/utils";

const CHAIN = {
  name: "Paseo Asset Hub",
  genesis: "0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2",
};

const STORAGE_KEY = "starter_message";

const $identityName = document.getElementById("identity-name");
const $identityAddress = document.getElementById("identity-address");
const $transportBadge = document.getElementById("transport-badge");
const $statusText = document.getElementById("status-text");
const $accountCount = document.getElementById("account-count");
const $messageInput = document.getElementById("message-input");
const $btnRemark = document.getElementById("btn-remark");
const $btnSignRaw = document.getElementById("btn-sign-raw");
const $btnStorageSave = document.getElementById("btn-storage-save");
const $btnStorageLoad = document.getElementById("btn-storage-load");
const $btnStorageClear = document.getElementById("btn-storage-clear");
const $btnChainRead = document.getElementById("btn-chain-read");
const $btnClear = document.getElementById("btn-clear");
const $log = document.getElementById("log");

const actionButtons = [
  $btnRemark,
  $btnSignRaw,
  $btnStorageSave,
  $btnStorageLoad,
  $btnStorageClear,
  $btnChainRead,
];

let accountsProvider = null;
let accounts = [];
let providerAccounts = [];

function log(message, level = "info") {
  const ts = new Date().toLocaleTimeString();
  const klass = level === "ok" ? "ok" : level === "err" ? "err" : "info";
  $log.innerHTML += `<span class="ts">[${ts}]</span> <span class="${klass}">${message}</span>\n`;
  $log.scrollTop = $log.scrollHeight;
}

function truncateAddress(address) {
  if (!address) return "No address";
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function setBadge(text, variant) {
  $transportBadge.textContent = text;
  $transportBadge.className = `badge ${variant}`;
}

function setActionsEnabled(enabled) {
  for (const button of actionButtons) button.disabled = !enabled;
}

function renderAccountState() {
  const primary = accounts[0];
  const loggedIn = accounts.length > 0;

  $identityName.textContent = loggedIn
    ? primary.name || "Unnamed account"
    : "Not signed in";
  $identityAddress.textContent = loggedIn
    ? primary.address
    : "Open this page inside the host and sign in.";
  $accountCount.textContent = `${accounts.length} account${accounts.length === 1 ? "" : "s"}`;

  if (loggedIn) {
    $statusText.textContent = `Connected to ${CHAIN.name}`;
    setBadge("Connected", "ok");
  } else {
    $statusText.textContent = "Waiting for login";
    setBadge("Waiting", "warn");
  }

  setActionsEnabled(loggedIn);
}

async function refreshAccounts() {
  const result = await accountsProvider.getNonProductAccounts();
  providerAccounts = result.match((value) => value, () => []);
  accounts = providerAccounts.map((account) => ({
    name: account.name,
    address: toHex(account.publicKey),
  }));

  renderAccountState();
  log(
    `Accounts refreshed: ${accounts.length} available`,
    accounts.length ? "ok" : "info",
  );
}

async function withBusy(button, busyText, fn) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = busyText;

  try {
    await fn();
  } finally {
    button.textContent = originalText;
    renderAccountState();
  }
}

function getMessage() {
  return $messageInput.value.trim() || "Hello from dotli starter";
}

function getSigner() {
  if (!accountsProvider || providerAccounts.length === 0) return null;

  return accountsProvider.getNonProductAccountSigner({
    dotNsIdentifier: "",
    derivationIndex: 0,
    publicKey: providerAccounts[0].publicKey,
  });
}

$btnClear.addEventListener("click", () => {
  $log.innerHTML = "";
});

$btnRemark.addEventListener("click", async () => {
  const signer = getSigner();
  if (!signer) return;

  await withBusy($btnRemark, "Submitting...", async () => {
    const client = createClient(createPapiProvider(CHAIN.genesis));

    try {
      log(`Connecting to ${CHAIN.name} via host provider...`);
      await client.getFinalizedBlock();

      const api = client.getUnsafeApi();
      const tx = api.tx.System.remark({
        remark: Binary.fromBytes(new TextEncoder().encode(getMessage())),
      });

      log("Signing and submitting remark...");

      await new Promise((resolve, reject) => {
        tx.signSubmitAndWatch(signer).subscribe({
          next(event) {
            if (event.type === "txBestBlocksState" && event.found) {
              log("Remark included in best block");
            } else if (event.type === "finalized") {
              log(
                `Remark finalized in ${event.block.hash.slice(0, 18)}...`,
                "ok",
              );
              resolve();
            }
          },
          error(error) {
            reject(error);
          },
        });
      });
    } catch (error) {
      log(`Remark failed: ${error.message}`, "err");
    } finally {
      client.destroy();
    }
  });
});

$btnSignRaw.addEventListener("click", async () => {
  if (providerAccounts.length === 0) return;

  await withBusy($btnSignRaw, "Signing...", async () => {
    try {
      const result = await hostApi.signRaw({
        tag: "v1",
        value: {
          address: toHex(providerAccounts[0].publicKey),
          data: { tag: "Bytes", value: new TextEncoder().encode(getMessage()) },
        },
      });

      result.match(
        (value) =>
          log(
            `Signed with ${truncateAddress(value.value.signature)}`,
            "ok",
          ),
        (error) => log(`Sign failed: ${error.value.name}`, "err"),
      );
    } catch (error) {
      log(`Sign raw failed: ${error.message}`, "err");
    }
  });
});

$btnStorageSave.addEventListener("click", async () => {
  await withBusy($btnStorageSave, "Saving...", async () => {
    try {
      const payload = {
        message: getMessage(),
        updatedAt: new Date().toISOString(),
      };
      await hostLocalStorage.writeJSON(STORAGE_KEY, payload);
      log(`Saved draft to "${STORAGE_KEY}"`, "ok");
    } catch (error) {
      log(`Storage save failed: ${error.message}`, "err");
    }
  });
});

$btnStorageLoad.addEventListener("click", async () => {
  await withBusy($btnStorageLoad, "Loading...", async () => {
    try {
      const payload = await hostLocalStorage.readJSON(STORAGE_KEY);
      if (!payload || typeof payload.message !== "string") {
        log(`No saved draft under "${STORAGE_KEY}"`, "info");
        return;
      }

      $messageInput.value = payload.message;
      log(`Loaded draft from "${STORAGE_KEY}"`, "ok");
    } catch (error) {
      log(`Storage load failed: ${error.message}`, "err");
    }
  });
});

$btnStorageClear.addEventListener("click", async () => {
  await withBusy($btnStorageClear, "Clearing...", async () => {
    try {
      await hostLocalStorage.clear(STORAGE_KEY);
      log(`Cleared "${STORAGE_KEY}"`, "ok");
    } catch (error) {
      log(`Storage clear failed: ${error.message}`, "err");
    }
  });
});

$btnChainRead.addEventListener("click", async () => {
  await withBusy($btnChainRead, "Reading...", async () => {
    const client = createClient(createPapiProvider(CHAIN.genesis));

    try {
      log(`Reading finalized state from ${CHAIN.name}...`);

      const block = await client.getFinalizedBlock();
      log(`Finalized block #${block.number}`, "ok");

      const api = client.getUnsafeApi();
      try {
        const timestamp = await api.query.Timestamp.Now.getValue();
        log(`Chain time: ${new Date(Number(timestamp)).toISOString()}`, "ok");
      } catch {
        log("Timestamp.Now is unavailable on this chain", "info");
      }
    } catch (error) {
      log(`Chain read failed: ${error.message}`, "err");
    } finally {
      client.destroy();
    }
  });
});

async function init() {
  log("Initializing host bridge...");
  setActionsEnabled(false);
  setBadge("Initializing", "warn");

  metaProvider.subscribeConnectionStatus((status) => {
    if (status === "connected") {
      setBadge("Connected", "ok");
    } else if (status === "connecting") {
      setBadge("Connecting", "warn");
    } else {
      setBadge("Disconnected", "err");
    }
  });

  try {
    const ready = await injectSpektrExtension();
    if (!ready) {
      $identityName.textContent = "Not running in host";
      $identityAddress.textContent =
        "This starter needs the dotli host environment.";
      $statusText.textContent = "Host bridge unavailable";
      setBadge("Unavailable", "err");
      log("Host extension bridge unavailable", "err");
      return;
    }

    accountsProvider = createAccountsProvider();

    await refreshAccounts();

    accountsProvider.subscribeAccountConnectionStatus(async (status) => {
      log(`Account status: ${status}`, "info");

      if (status === "connected") {
        await refreshAccounts();
      } else {
        accounts = [];
        providerAccounts = [];
        renderAccountState();
      }
    });
  } catch (error) {
    $identityName.textContent = "Initialization failed";
    $identityAddress.textContent = error.message;
    $statusText.textContent = "Error";
    setBadge("Error", "err");
    log(`Init failed: ${error.message}`, "err");
  }
}

init();
