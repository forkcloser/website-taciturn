# taciturn — site copy

The text of https://taciturn.forkcloser.org/, one section per heading below, in the order
the page shows them. Every factual claim carries its source in a `(src: …)` parenthesis,
to strip when the text is set: a file in forkcloser/taciturn at v0.2.0, a `taciturn`
usage line, or a document outside the project with its URL. Every command is for the
pinned release, v0.2.0, and runs as pasted on a Mac that has the bundle on its `PATH`
(the Install section puts it there).

## Hero

**h1:** An ssh-agent for keys in the Mac's Secure Enclave.

**Lede (25 words):** For unattended work, a coding agent pushing and signing as a bot:
the key cannot leave the Mac, and a policy says what it signs.
(src: README.md, first paragraph; docs/design.md, "Goals" 1 and 2)

**Terminal block** (8 lines; the comment on each line is what the reader gets from it):

```bash
taciturn key create bot -use locked -peers path=/usr/bin/ssh,path=/usr/bin/ssh-keygen   # a key made inside the Enclave that signs with the screen locked; the line printed is what GitHub takes
ssh-keyscan github.com > github.keys 2>/dev/null                                        # GitHub's host keys, to pin; compare them with the fingerprints GitHub publishes
taciturn key allow bot -user git -host github.com -known-hosts github.keys              # bot may authenticate to github.com as git, and nowhere else
taciturn key sshsig bot -namespace git                                                  # and sign commits and tags
export SSH_AUTH_SOCK="$HOME/Library/Application Support/taciturn/agent.sock"            # ssh and ssh-keygen now ask taciturn
ssh -o IdentityFile=none -T git@github.com                                              # the connection is bound to GitHub's host key, and checked against the policy, before anything is signed
ssh -o IdentityFile=none -T git@gitlab.com                                              # refused: at a host the policy does not name, no key is even offered
taciturn log -key bot                                                                   # every request: which process, which key, which host, allowed or refused
```

Sources, line by line:

1. `key create NAME -use locked|unlocked -peers ENTRY[,ENTRY]` is the usage line
   (src: internal/cli/cli.go, `usage` on main); the line passes `-peers` explicitly, so
   it reads the same on v0.2.0, where the flag is optional and falls back to a built-in
   list (src: v0.2.0 `internal/cli/keys.go`, `defaultPeers`), and from v0.2.1, where it
   is required and no default exists (src: docs/design.md, decision 3); `path=` entries are absolute paths or globs as the
   peer's executable is reported (src: internal/cli/keys.go, `validPeer`;
   docs/design.md, "Policy", `peers`); Apple's `ssh` and `ssh-keygen` live at
   `/usr/bin` and sign as `com.apple.ssh` / `com.apple.ssh-keygen` (src:
   docs/design.md, F9 and appendix "Other checks"); `-use locked` is the class that
   signs while the screen is locked, until reboot (src: internal/cli/keys.go, the `-use`
   flag text; docs/design.md, F7, F18); `key create` prints the public key in
   authorized-keys form (src: internal/cli/keys.go, `keyCreate`, the `Fprintf`).
2. `ssh-keyscan` writes known_hosts lines, which is what `-known-hosts` reads (src:
   internal/cli/keys.go, `keyAllow`, `hostKeysFrom`). GitHub's fingerprints:
   https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
3. `key allow NAME -user USER -host HOST -known-hosts FILE` (src: usage); the host keys,
   not the name, are what the agent checks (src: docs/design.md, "Policy",
   `destinations`); the command prints `bot may authenticate to github.com as git (N host
   keys)` (src: internal/cli/keys.go, `keyAllow`).
4. `key sshsig NAME -namespace NS` (src: usage); `git` is the namespace of commits and
   tags (src: internal/cli/keys.go, the `-namespace` flag text).
5. The socket path (src: internal/cli/cli.go, `resolve`: `~/Library/Application
   Support/taciturn/agent.sock`; docs/design.md, decision 6).
6. `IdentityFile=none` loads no key files, so only the agent's keys are offered (src:
   ssh_config(5), IdentityFile: "an argument of none may be used to indicate no identity
   files should be loaded", https://man.openbsd.org/ssh_config.5). ssh 8.9 and later
   send the server's host key and its proof to the agent before listing identities, and
   the agent verifies the proof and checks the key against the policy before any
   signature (src: docs/design.md, F8 and "The agent's decision" rules 2 to 4). GitHub
   answers with its greeting once the key printed at line 1 is on the account; before
   that it refuses the key, and the binding, the listing and the refusal are in the log
   either way (src: docs/design.md, "Testing", the `ssh -T git@github.com` run).
7. At a bound host the policy does not name, the identities answer lists no key (src:
   docs/design.md, rule 3; internal/agent/connection.go, `identities`, the `hidden`
   count). GitLab is an example; any host not in the policy behaves the same.
8. `log [-follow] [-json] [-key NAME]` (src: usage); the record's fields (src:
   docs/design.md, "The audit log"; internal/agent/connection.go, `audit`).

## Why

### The key never leaves the Mac

The Secure Enclave makes the key and keeps it: ECDSA P-256, the one curve it implements,
with no export path at all (src: README.md, "Keys that never exist outside the enclave";
docs/design.md, F1, F3 "export not implemented"). The key is an item in the
data-protection keychain under taciturn's own access group, so a process that is not
signed with that group cannot even see it, and the agent's socket is the only road to it
(src: docs/design.md, v0.2 F13, F14, decision 12). A disk image, a backup or another Mac
gets nothing: the material is wrapped by this Enclave and unwraps nowhere else (src:
docs/design.md, F3, "Threat model" last row).

### A signature only for what the key may do

Each key carries its own policy: which hosts it may authenticate to, as which user, pinned
to the hosts' keys; which `ssh-keygen -Y sign` namespaces it may sign in; which programs
may ask (src: docs/design.md, "Policy, and the decision the agent makes"). The agent reads
the destination OpenSSH binds to the connection, the user in the authentication request
and the namespace in a signature request, and answers only inside the policy; at any other
host the key is not offered (src: README.md, "A signature only for what a key is allowed to
do"; docs/design.md, rules 3 to 5). A forwarded agent gets nothing, and a client cannot
add, remove or lock keys: to its clients the agent is read-only, and the policy is edited
from the shell (src: docs/design.md, rules 2 and 6).

### Every use recorded

One line per request, allowed or refused: the process that asked, by path and signing
identity, the key, the host and user or the namespace, and the rule that decided (src:
docs/design.md, "The audit log"; internal/agent/connection.go, `audit`). A refused client
is told nothing but failure; the reason is in the log (src: docs/design.md, "Policy", last
paragraph before "What this buys"). Nothing is asked of the Enclave for a request a rule
refused, so the log is also the record of what was not signed (src: docs/design.md, "The
audit log", last sentence). `taciturn log` prints it, `-follow` tails it, `-json` passes
it through (src: usage).

## How it works

**The agent.** One binary, `taciturn`, running as a user LaunchAgent,
`org.forkcloser.taciturn`, on a fixed socket, `~/Library/Application
Support/taciturn/agent.sock`; `taciturn install` writes the LaunchAgent and starts it,
`status` and `doctor` report on it (src: README.md, "One binary"; internal/launchd/
launchd.go, `Label`; internal/cli/cli.go, `resolve` and `usage`). It ships as
`Taciturn.app`, signed with a Developer ID, because the keychain access group needs a
signed bundle; it is a command-line tool that happens to live in one, run by path, never
through the Finder (src: docs/design.md, v0.2 "The bundle", F15).

**Keys.** Made in the Enclave by `taciturn key create`, each with a class chosen at
creation: `locked`, which signs while the screen is locked, until the next boot, or
`unlocked`, which signs only while the session is unlocked (src: internal/cli/keys.go,
the `-use` flag text; docs/design.md, F5, F7). The key lives in the keychain, labelled by
its fingerprint; what is on disk under `~/Library/Application Support/taciturn/keys` is a
record of name, class, public key and policy, with no key material (src: docs/design.md,
v0.2 "Keys"; internal/cli/cli.go, `resolve`).

**Policy.** Three lists per key. Destinations: a user, a host, and the host's keys copied
from a known_hosts file by `key allow`; the keys are the truth, since the protocol carries
the server's key and never its name. Namespaces: what `key sshsig` allowed. Peers: who may
ask, as `any`, a `path=` glob on the executable, or an Apple code-signing requirement,
stated at creation and edited by `key peers` (src: docs/design.md, "Policy"; usage;
v0.2.0 fills the list in when `-peers` is absent, v0.2.1 refuses without it: decision 3).
The
agent reads the store on every request, so an edit from the shell is live at the next
request, with no reload and no second copy of the state (src: docs/design.md, "Keys", "The
agent reads the directory on every request").

**The log.** JSON lines in `~/Library/Logs/org.forkcloser.taciturn/audit.log`, the agent's
only output: time, connection, peer process, request, key, binding, outcome and rule (src:
docs/design.md, "The audit log"; internal/cli/cli.go, `resolve`).

**Unattended sessions.** A sandboxed session reaches the socket and nothing else: the
Enclave is unreachable from inside the sandbox, so a session that could read the key
record still could not use it (src: docs/design.md, F6, F12). The session's `ssh` is
pointed at the socket with `IdentityAgent`, or `SSH_AUTH_SOCK`, and a `locked` key keeps
signing after the screen locks, which is when unattended work happens (src: docs/design.md,
"Why", second bullet; F7). The client must be OpenSSH 8.9 or later, Apple's included: a
client that does not bind the connection gets no authentication signature (src:
docs/design.md, F8, decision 4).

**Rotation.** `key rotate NAME` makes a successor in the Enclave with the same class and
policy and serves both; `key signers NAME -principal EMAIL` prints the allowed-signers line
with its validity window, so commits the old key signed keep verifying and commits it signs
after its retirement do not; `key retire` stops serving a key, `key delete` removes it and
reminds you to revoke it on GitHub (src: usage; docs/design.md, "Key rotation", "The
mechanism is the allowed-signers format"; internal/cli/keys.go, `keySigners`).

## Install

**Requirements, one line:** An Apple silicon Mac on macOS 15 or later (src: README.md,
"darwin/arm64 only"; the release is built on `macos-15`, .github/workflows/release.yaml,
`runs-on`; the fleet's platform floor is macOS 15, farcloser/limen book/github.md, the
runner matrix, and forkcloser/openssh build.sh, `MACOSX_DEPLOYMENT_TARGET=15.0`; developed
on macOS 26, docs/design.md header). The bundle's plist says `LSMinimumSystemVersion`
14.0 (hack/bundle.sh); nothing is built or tested on 14, and the Taciturn session has the
plist to align, so the page says 15.
Clients: OpenSSH 8.9 or later; the `ssh` and `ssh-keygen` macOS ships qualify (src:
docs/design.md, F2 "OpenSSH 10.3p1", F8 "8.9 and later").

```bash
curl -LO https://github.com/forkcloser/taciturn/releases/download/v0.2.0/taciturn_0.2.0_darwin_arm64.tar.gz
gh attestation verify taciturn_0.2.0_darwin_arm64.tar.gz --repo forkcloser/taciturn
mkdir -p ~/Applications && tar -xzf taciturn_0.2.0_darwin_arm64.tar.gz -C ~/Applications
export PATH="$HOME/Applications/Taciturn.app/Contents/MacOS:$PATH"
taciturn install
taciturn doctor
```

Comments for the block, one per line, in order: the one release asset, the bundle and
nothing else; the attestation GitHub recorded when the release workflow built it, checked
against this repository; the bundle, in a folder that stays put, since the LaunchAgent
runs it by its real path; the commands on this page assume the binary on your `PATH`; the
LaunchAgent, written and started; the Enclave, the keychain group, the store, the agent and
the socket, in one report.

Sources: the asset name and the two sidecars, `checksums.txt` and
`checksums.txt.sigstore.json` (src: https://github.com/forkcloser/taciturn/releases/tag/v0.2.0;
.release-go.yaml, `archives` and `checksum`); the archive carries `Taciturn.app/Contents/…`
at its top level and no bare binary (src: .release-go.yaml, `archives`, `files` and the
comment above them); the attestation covers every `.tar.gz` and `checksums.txt` (src:
.github/workflows/release.yaml, the `attest-build-provenance` step); `install` writes the
plist with the binary's real path and starts the agent (src: docs/design.md, "The socket
and the process"; internal/cli/service.go, `runInstall`); `doctor`'s checks (src:
internal/cli/service.go, `runDoctor`; usage).

**Without `gh`,** the checksums file is signed keyless by the release workflow and
verifies with cosign; then the archive verifies against the file:

```bash
curl -LO https://github.com/forkcloser/taciturn/releases/download/v0.2.0/checksums.txt
curl -LO https://github.com/forkcloser/taciturn/releases/download/v0.2.0/checksums.txt.sigstore.json
cosign verify-blob --bundle checksums.txt.sigstore.json --certificate-oidc-issuer https://token.actions.githubusercontent.com --certificate-identity https://github.com/forkcloser/taciturn/.github/workflows/release.yaml@refs/tags/v0.2.0 checksums.txt
shasum -a 256 --ignore-missing -c checksums.txt
```

(src: .release-go.yaml, `signs` and the comment above it, which gives the verify command
with a regexp identity; the exact identity is the workflow at the tag.)

**Two notes under the block.** Download with `curl`, as above, not a browser: the bundle
is signed but not notarized, and a browser download carries the quarantine flag that
Gatekeeper acts on (src: docs/design.md, v0.2 "Release lane", "No notarization in v0.2").
Upgrading is the same steps with the new version, then `taciturn install` again, since the
LaunchAgent names the binary's path (src: docs/design.md, "The socket and the process",
"After an upgrade … `taciturn install` again").

**For aqua users,** one sentence: taciturn is pinned as a `github_release` package with
GitHub artifact attestation; a registry entry is in farcloser/limen-install (src:
https://github.com/farcloser/limen-install, `limen-install`, the `forkcloser/taciturn`
registry entry with `github_artifact_attestations`).

## Compare

Three columns: OpenSSH's `ssh-agent`, Secretive, taciturn. 1Password's agent is left out:
its documentation does not state enough for every cell (no statement on destination
policy, audit log, or locked-screen behaviour at https://www.1password.dev/ssh/agent/).

| | `ssh-agent` (OpenSSH) | Secretive | taciturn |
|---|---|---|---|
| Where the key is | Loaded into the agent from a key file by `ssh-add`, or on a FIDO or PKCS#11 token (src: ssh-add(1), `-K`, `-s`, https://man.openbsd.org/ssh-add.1) | The Secure Enclave, or a smart card; "impossible to export them, by design" (src: https://github.com/maxgoedjen/secretive, README) | The Secure Enclave; the keychain item is visible only to code signed with taciturn's access group (src: docs/design.md, v0.2 F13, F14) |
| Where it may be used | Anywhere, unless the client added the key with `ssh-add -h` destination constraints; "By default, keys added by ssh-add are not destination constrained" (src: ssh-add(1), `-h`) | Anywhere the client offers it, optionally behind Touch ID or Apple Watch; the agent checks no destination: its session-bind handler is "disabled until forward enforcement is handled" (src: Secretive README; `Sources/Packages/Sources/SecretAgentKit/Agent.swift` on main) | The hosts, users and namespaces in the key's stored policy; at any other host the key is not offered (src: docs/design.md, rules 3 to 5) |
| Through a forwarded agent | Yes, unless constrained with `-h` (src: ssh-agent(1), "may be forwarded … using the -A option", https://man.openbsd.org/ssh-agent.1; ssh-add(1), `-h`) | Yes: the binding that would reveal forwarding is not processed (src: Agent.swift, same comment) | Never: on a forwarding binding every key is hidden and every signature refused (src: docs/design.md, rule 2) |
| With the screen locked | Not affected: the keys are in a process of yours, not behind the lock (no document to point at; drop the row if every cell must be tested) | No: "agent refused operation" once the screen locks, with keys set to no authentication (src: https://github.com/maxgoedjen/secretive/issues/462, open; docs/design.md, F7) | Yes, for a key created `-use locked`, until the next boot (src: docs/design.md, F7, F18) |
| Record of use | Debug output on stderr with `-d` (src: ssh-agent(1), `-d`) | A notification per use (src: Secretive README, "notifies you whenever your keys are accessed") | One audit line per request, allowed or refused, with the process, key, host and rule (src: docs/design.md, "The audit log") |

## Footer

MIT; https://github.com/forkcloser/taciturn. (The Designer's.)

## Metadata

- `<title>`: taciturn
- `<meta name="description">` and `og:description`: An ssh-agent for keys in the Mac's
  Secure Enclave, with a per-key policy and an audit log, for unattended sessions. (src:
  the repository description on GitHub; the placeholder page)
